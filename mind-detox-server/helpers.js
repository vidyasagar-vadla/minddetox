// helpers.js
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

export function signToken(user, JWT_SECRET) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

export function authMiddleware(JWT_SECRET) {
  return function (req, res, next) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    
    console.log("Auth Debug - Header:", header);
    console.log("Auth Debug - Token:", token ? token.substring(0, 20) + "..." : "null");
    console.log("Auth Debug - JWT_SECRET:", JWT_SECRET ? "exists" : "missing");
    
    if (!token) return res.status(401).json({ ok: false, error: "Missing token" });

    try {
      const payload = jwt.verify(token, JWT_SECRET);
      console.log("Auth Debug - Payload:", payload);
      req.user = payload;
      next();
    } catch (e) {
      console.log("Auth Debug - JWT Error:", e.message);
      return res.status(401).json({ ok: false, error: "Invalid/expired token" });
    }
  };
}

export function readJsonFileSmart(__dirname, nameWithoutExt) {
  const p1 = path.join(__dirname, `${nameWithoutExt}.json`);
  const p2 = path.join(__dirname, "data", `${nameWithoutExt}.json`);
  const chosen = fs.existsSync(p1) ? p1 : p2;

  if (!fs.existsSync(chosen)) {
    throw new Error(
      `Missing JSON file: ${nameWithoutExt}.json (checked root and /data)`
    );
  }
  return JSON.parse(fs.readFileSync(chosen, "utf-8"));
}

export function runPredictAllPy(__dirname, answersJsonObj) {
  return new Promise((resolve, reject) => {
    const pyCmd = process.platform === "win32" ? "python" : "python3";
    const modelsCwd = path.join(__dirname, "models");

    const proc = spawn(pyCmd, ["predict_all.py"], {
      cwd: modelsCwd,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let out = "";
    let err = "";

    proc.stdout.on("data", (d) => (out += d.toString()));
    proc.stderr.on("data", (d) => (err += d.toString()));

    proc.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`predict_all.py failed (${code}): ${err || out}`));
      }
      try {
        resolve(JSON.parse(out.trim()));
      } catch (e) {
        reject(new Error(`Prediction output not JSON.\nOUT:\n${out}\nERR:\n${err}`));
      }
    });

    proc.stdin.write(JSON.stringify(answersJsonObj || {}));
    proc.stdin.end();
  });
}

// --- Mapping model labels -> dashboard % ---
export function riskLabelToPercent(label) {
  const s = String(label || "").toLowerCase();
  if (s.includes("normal")) return 85;
  if (s.includes("low")) return 85;
  if (s.includes("moderate") || s.includes("medium")) return 55;
  if (s.includes("high")) return 25;
  return 50;
}

export function stomachClassToPercent(predClass, probs) {
  const s = String(predClass || "").toLowerCase();

  if (probs && typeof probs === "object") {
    for (const k of Object.keys(probs)) {
      if (String(k).toLowerCase().includes("healthy")) {
        const v = Number(probs[k]);
        if (!Number.isNaN(v)) return Math.round(v * 100);
      }
    }
  }

  if (s.includes("good")) return 85;
  if (s.includes("at risk")) return 55;
  if (s.includes("poor")) return 25;

  if (probs && typeof probs === "object") {
    let best = 0;
    for (const k of Object.keys(probs)) {
      const v = Number(probs[k]);
      if (!Number.isNaN(v)) best = Math.max(best, v);
    }
    if (best > 0) return Math.round(best * 100);
  }

  return 50;
}

export function runWeeklyProgressAI(__dirname, answersJsonObj, historicalData = [], healthScores = {}) {
  return new Promise((resolve, reject) => {
    const pyCmd = process.platform === "win32" ? "python" : "python3";
    const modelsCwd = path.join(__dirname, "models");

    const proc = spawn(pyCmd, ["weekly_progress_ai.py"], {
      cwd: modelsCwd,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let out = "";
    let err = "";

    proc.stdout.on("data", (d) => (out += d.toString()));
    proc.stderr.on("data", (d) => (err += d.toString()));

    proc.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`weekly_progress_ai.py failed (${code}): ${err || out}`));
      }
      try {
        resolve(JSON.parse(out.trim()));
      } catch (e) {
        reject(new Error(`Weekly progress output not JSON.\nOUT:\n${out}\nERR:\n${err}`));
      }
    });

    const inputData = {
      answers: answersJsonObj || {},
      historical_data: historicalData || [],
      health_scores: healthScores || {}
    };
    
    proc.stdin.write(JSON.stringify(inputData));
    proc.stdin.end();
  });
}

export function runHabitControlAI(__dirname, answersJsonObj, healthScores = {}, userPreferences = {}) {
  return new Promise((resolve, reject) => {
    const pyCmd = process.platform === "win32" ? "python" : "python3";
    const modelsCwd = path.join(__dirname, "models");

    const proc = spawn(pyCmd, ["habit_ai.py"], {
      cwd: modelsCwd,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let out = "";
    let err = "";

    proc.stdout.on("data", (d) => (out += d.toString()));
    proc.stderr.on("data", (d) => (err += d.toString()));

    proc.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`habit_ai.py failed (${code}): ${err || out}`));
      }
      try {
        resolve(JSON.parse(out.trim()));
      } catch (e) {
        reject(new Error(`Habit control output not JSON.\nOUT:\n${out}\nERR:\n${err}`));
      }
    });

    const inputData = {
      health_scores: healthScores || {}
    };
    
    proc.stdin.write(JSON.stringify(inputData));
    proc.stdin.end();
  });
}

export function predictionsToHealthStats(pred) {
  let brainScore = Number(
    pred?.predictions?.brain?.predicted_brain_health_score_0_100 ?? 0
  );
  const brainClass = String(
    pred?.predictions?.brain?.predicted_brain_health_class || ""
  );

  if (brainScore === 0 && brainClass.toLowerCase() === "poor") brainScore = 15;

  const Brain = Math.round(Math.max(0, Math.min(100, brainScore || 0)));

  const lungRisk = pred?.predictions?.lung?.lung_health_risk;
  const liverLabel = pred?.predictions?.liver?.predicted_label;

  const stomachClass = pred?.predictions?.stomach?.predicted_class;
  const stomachProbs = pred?.predictions?.stomach?.probabilities;

  const Lungs = riskLabelToPercent(lungRisk);
  const Liver = riskLabelToPercent(liverLabel);
  const Stomach = stomachClassToPercent(stomachClass, stomachProbs);

  const Heart = Math.round((Brain + Lungs + Liver + Stomach) / 4);

  return { Brain, Heart, Lungs, Stomach, Liver };
}

