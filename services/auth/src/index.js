import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import calendarRoutes from "./routes/calendarRoutes.js";

dotenv.config();

const app = express();

// ── Security headers ───────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ───────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.CLIENT_URL
  ? [process.env.CLIENT_URL]
  : ["http://localhost:5173", "http://localhost:3000"];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

// ── Body parsing (with size guard) ────────────────────────────────────────────
app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: false, limit: "64kb" }));

// ── Request timing ────────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  req._startTime = Date.now();
  next();
});

app.use((req, res, next) => {
  const original = res.json.bind(res);
  res.json = (body) => {
    const ms = Date.now() - (req._startTime || Date.now());
    if (ms > 500) {
      console.warn(`[SLOW] ${req.method} ${req.originalUrl} — ${ms}ms`);
    }
    return original(body);
  };
  next();
});

// ── Health / readiness endpoints ──────────────────────────────────────────────
app.get("/health",   (_req, res) => res.json({ status: "ok", service: "auth" }));
app.get("/readiness",(_req, res) => res.json({ status: "ready" }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/v1/auth",          authRoutes);
app.use("/api/v1/auth/calendar", calendarRoutes);
app.use("/api/v1/auth/internal", calendarRoutes);

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ message: "Internal server error" });
});

connectDB()
  .then(() => {
    const PORT = process.env.PORT || 5001;
    app.listen(PORT, "0.0.0.0", () => console.log(`✅ Auth service running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("Auth DB connection error:", err.message);
    process.exit(1);
  });
