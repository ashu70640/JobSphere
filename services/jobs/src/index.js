import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import jobRoutes from "./routes/jobRoutes.js";
import connectDB from "./config/db.js";

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
app.use(express.json({ limit: "256kb" })); // jobs have descriptions; allow slightly larger
app.use(express.urlencoded({ extended: false, limit: "256kb" }));

// ── Request timing ────────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  req._startTime = Date.now();
  next();
});

app.use((req, res, next) => {
  const original = res.json.bind(res);
  res.json = (body) => {
    const ms = Date.now() - (req._startTime || Date.now());
    if (ms > 800) {
      console.warn(`[SLOW] ${req.method} ${req.originalUrl} — ${ms}ms`);
    }
    return original(body);
  };
  next();
});

// ── Health endpoint ───────────────────────────────────────────────────────────
app.get("/health",    (_req, res) => res.json({ status: "ok",    service: "jobs" }));
app.get("/readiness", (_req, res) => res.json({ status: "ready", service: "jobs" }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/v1/jobs", jobRoutes);

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ message: "Internal server error" });
});

connectDB()
  .then(() => {
    const PORT = process.env.PORT || 5002;
    app.listen(PORT, () => console.log(`✅ Jobs service running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("Jobs DB connection error:", err.message);
    process.exit(1);
  });
