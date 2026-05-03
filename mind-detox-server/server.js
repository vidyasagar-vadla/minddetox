// server.js
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import { pool } from "./db.js";
import registerRoutes from "./routes.js";
import { authMiddleware } from "./helpers.js";

dotenv.config();

const app = express();

// ---------- Config ----------
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || "change_me";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

// ---------- Middleware ----------
app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));

// ---------- Paths ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- Routes ----------
registerRoutes(app, { pool, __dirname, JWT_SECRET });

// ✅ Apply auth only to protected endpoints (same ones you had)
const requireAuth = authMiddleware(JWT_SECRET);
app.use("/api/submit-assessment", requireAuth);
app.use("/api/user/health-stats", requireAuth);
app.use("/api/user/predictions", requireAuth);
app.use("/api/user/weekly-progress", requireAuth);
app.use("/api/user/habit-control", requireAuth);
app.use("/api/user/preferences", requireAuth);

// ---------- Start ----------
app.listen(PORT, () => console.log(`✅ Server running on ${PORT}`));
