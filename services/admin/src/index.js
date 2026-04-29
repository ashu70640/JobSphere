// JobSphere Admin — new file, safe to delete without affecting core app
import express from "express";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

import { connectDatabases, adminConn } from "./config/db.js";
import { buildAdminModel, seedSuperAdmin } from "./models/Admin.js";
import { buildModerationLogModel }         from "./models/ModerationLog.js";
import { buildUserModel, buildJobModel, buildAiUsageModel } from "./models/readModels.js";
import { initModels } from "./models/modelRegistry.js";

import adminAuthRoutes from "./routes/adminAuthRoutes.js";
import statsRoutes     from "./routes/statsRoutes.js";
import usersRoutes     from "./routes/usersRoutes.js";
import jobsRoutes      from "./routes/jobsRoutes.js";
import aiRoutes        from "./routes/aiRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/admin",         adminAuthRoutes);
app.use("/api/admin/stats",   statsRoutes);
app.use("/api/admin/users",   usersRoutes);
app.use("/api/admin/jobs",    jobsRoutes);
app.use("/api/admin/ai",      aiRoutes);

// ── Health checks ─────────────────────────────────────────────────────────────
app.get("/health",           (_, res) => res.json({ status: "ok", service: "admin" }));
app.get("/api/admin/health", (_, res) => res.json({ status: "ok", service: "admin" }));

// ── Boot ──────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5003;

connectDatabases()
  .then(async () => {
    // Build all models AFTER connections are established
    const Admin          = buildAdminModel();
    const ModerationLog  = buildModerationLogModel();
    const User           = buildUserModel();
    const Job            = buildJobModel();
    const AiUsage        = buildAiUsageModel();

    // Register in the shared registry so controllers can access them
    initModels({ Admin, ModerationLog, User, Job, AiUsage });

    // Seed superadmin if the Admin collection is empty
    await seedSuperAdmin(Admin);

    app.listen(PORT, "0.0.0.0", () =>
      console.log(`Admin service running on port ${PORT}`),
    );
  })
  .catch((err) => {
    console.error("Admin service DB connection failed:", err.message);
    process.exit(1);
  });
