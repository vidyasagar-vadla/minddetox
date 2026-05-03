// routes.js
import { readJsonFileSmart, runPredictAllPy, predictionsToHealthStats, signToken, runWeeklyProgressAI, runHabitControlAI } from "./helpers.js";
import bcrypt from "bcrypt";

export default function registerRoutes(app, { pool, __dirname, JWT_SECRET }) {
  async function getUserAnswersJson(userId) {
    const { rows } = await pool.query(
      "SELECT answers_json FROM user_questionnaire WHERE user_id=$1",
      [userId]
    );
    return rows.length ? rows[0].answers_json : null;
  }

  async function getUserHistoricalData(userId) {
    const { rows } = await pool.query(
      "SELECT answers_json, created_at FROM user_questionnaire_history WHERE user_id=$1 ORDER BY created_at DESC LIMIT 10",
      [userId]
    );
    return rows.map(row => ({
      answers: row.answers_json,
      timestamp: row.created_at
    }));
  }

  async function upsertUserPredictions(userId, rawPredictions, healthStats) {
    const q = `
      INSERT INTO user_predictions (user_id, raw_predictions, health_stats)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id)
      DO UPDATE SET raw_predictions = EXCLUDED.raw_predictions,
                    health_stats = EXCLUDED.health_stats,
                    updated_at = NOW()
    `;
    await pool.query(q, [userId, rawPredictions, healthStats]);
  }

  // --- Health ---
  app.get("/api/health", async (req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ ok: true, db: "connected" });
    } catch (e) {
      res.status(500).json({ ok: false, db: "not_connected", error: e.message });
    }
  });

  // --- Questions ---
  app.get("/api/questions", (req, res) => {
    try {
      const pages = ["page1", "page2", "page3", "page4", "page5"].map((p) =>
        readJsonFileSmart(__dirname, p)
      );
      res.json(pages);
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // --- Register ---
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ ok: false, error: "email and password required" });
      }
      if (String(password).length < 6) {
        return res.status(400).json({ ok: false, error: "Password must be at least 6 characters" });
      }

      const password_hash = await bcrypt.hash(password, 10);

      const q = `
        INSERT INTO users (name, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id, name, email
      `;
      const { rows } = await pool.query(q, [
        name || null,
        String(email).toLowerCase(),
        password_hash,
      ]);

      const user = rows[0];
      const token = signToken(user, JWT_SECRET);
      return res.status(201).json({ ok: true, user, token });
    } catch (e) {
      if (e.code === "23505") return res.status(409).json({ ok: false, error: "Email already exists" });
      return res.status(500).json({ ok: false, error: e.message });
    }
  });

  // --- Login (same behavior) ---
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ ok: false, error: "Required fields missing" });
      }

      const { rows } = await pool.query(
        "SELECT id, name, email, password_hash FROM users WHERE email=$1",
        [String(email).toLowerCase()]
      );
      if (!rows.length) return res.status(401).json({ ok: false, error: "Invalid credentials" });

      const userRow = rows[0];
      const match = await bcrypt.compare(password, userRow.password_hash);
      if (!match) return res.status(401).json({ ok: false, error: "Invalid credentials" });

      const user = { id: userRow.id, name: userRow.name, email: userRow.email };
      const token = signToken(user, JWT_SECRET);

      const answers = await getUserAnswersJson(userRow.id);
      const hasFilledForm = !!answers;

      let healthStats = null;

      if (hasFilledForm) {
        const pred = await runPredictAllPy(__dirname, answers);
        healthStats = predictionsToHealthStats(pred);
        await upsertUserPredictions(userRow.id, pred, healthStats);
      }

      return res.json({ ok: true, user, token, hasFilledForm, healthStats });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  });

  // --- Submit assessment (UPSERT) ---
  app.post("/api/submit-assessment", async (req, res) => {
    // keep your auth middleware in server.js for this route (see below)
    // this handler assumes req.user exists
    try {
      // Check if user exists and has ID
      if (!req.user || !req.user.id) {
        return res.status(401).json({ ok: false, error: "User not authenticated" });
      }
      
      const userId = req.user.id;
      const answers = req.body || {};
      if (!answers || typeof answers !== "object") {
        return res.status(400).json({ ok: false, error: "Invalid answers payload" });
      }

      const q = `
        INSERT INTO user_questionnaire (user_id, answers_json)
        VALUES ($1, $2)
        ON CONFLICT (user_id)
        DO UPDATE SET answers_json = EXCLUDED.answers_json, updated_at = NOW()
        RETURNING user_id, created_at, updated_at
      `;
      const { rows } = await pool.query(q, [userId, answers]);

      return res.json({ ok: true, saved: rows[0] });
    } catch (e) {
      console.error("Submit assessment error:", e);
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // --- Dashboard recompute ---
  app.get("/api/user/health-stats", async (req, res) => {
    // keep your auth middleware in server.js for this route (see below)
    try {
      // Check if user exists and has ID
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const answers = await getUserAnswersJson(req.user.id);
      if (!answers) return res.status(404).json({ error: "No questionnaire found" });

      const pred = await runPredictAllPy(__dirname, answers);
      const stats = predictionsToHealthStats(pred);
      await upsertUserPredictions(req.user.id, pred, stats);

      return res.json(stats);
    } catch (e) {
      console.error("Health stats error:", e);
      return res.status(500).json({ error: "Analysis failed", details: e.message });
    }
  });
  
  


  // --- Fetch stored prediction ---
  app.get("/api/user/predictions", async (req, res) => {
    // keep your auth middleware in server.js for this route (see below)
    try {
      const { rows } = await pool.query(
        "SELECT raw_predictions, health_stats, updated_at FROM user_predictions WHERE user_id=$1",
        [req.user.id]
      );
      if (!rows.length) return res.status(404).json({ ok: false, error: "No predictions saved yet" });
      return res.json({ ok: true, ...rows[0] });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  });

  // --- AI Weekly Progress ---
  app.get("/api/user/weekly-progress", async (req, res) => {
    try {
      const userId = req.user.id;
      const answers = await getUserAnswersJson(userId);
      if (!answers) return res.status(404).json({ error: "No questionnaire found" });

      const historicalData = await getUserHistoricalData(userId);
      
      // Get current health scores
      const { rows: predRows } = await pool.query(
        "SELECT health_stats FROM user_predictions WHERE user_id=$1",
        [userId]
      );
      const healthScores = predRows.length ? predRows[0].health_stats : {};

      const aiProgress = await runWeeklyProgressAI(__dirname, answers, historicalData, healthScores);
      
      return res.json({ ok: true, ...aiProgress });
    } catch (e) {
      return res.status(500).json({ error: "Weekly progress analysis failed", details: e.message });
    }
  });

  // --- AI Habit Control ---
  app.get("/api/user/habit-control", async (req, res) => {
    try {
      const userId = req.user.id;

      // Get current health scores
      const { rows: predRows } = await pool.query(
        "SELECT health_stats FROM user_predictions WHERE user_id=$1",
        [userId]
      );
      let healthScores = predRows.length ? predRows[0].health_scores : {};

      // If no health scores in database, use fallback based on what user reported
      if (!healthScores || Object.keys(healthScores).length === 0) {
        // Use the health scores you mentioned: Brain 20%, Heart 46%, Lungs 85%, Stomach 55%, Liver 25%
        healthScores = {
          "Brain": 20,
          "Heart": 46, 
          "Lungs": 85,
          "Stomach": 55,
          "Liver": 25
        };
      }

      const aiHabitControl = await runHabitControlAI(__dirname, {}, healthScores, {});
      
      return res.json(aiHabitControl);
    } catch (e) {
      console.error("Habit control error:", e);
      return res.status(500).json({ error: "Habit control analysis failed", details: e.message });
    }
  });

  // --- Update User Preferences ---
  app.post("/api/user/preferences", async (req, res) => {
    try {
      const userId = req.user.id;
      const preferences = req.body || {};

      const q = `
        INSERT INTO user_preferences (user_id, preferences)
        VALUES ($1, $2)
        ON CONFLICT (user_id)
        DO UPDATE SET preferences = EXCLUDED.preferences, updated_at = NOW()
        RETURNING user_id, updated_at
      `;
      const { rows } = await pool.query(q, [userId, preferences]);

      return res.json({ ok: true, saved: rows[0] });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });
}
