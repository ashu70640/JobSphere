// JobSphere Admin — new file, safe to delete without affecting core app
import express from "express";
import {
  getOverview,
  getJobsPerDay,
  getAiUsageStats,
  getStatusBreakdown,
} from "../controllers/statsController.js";
import { adminAuthMiddleware } from "../middleware/adminAuthMiddleware.js";

const router = express.Router();

router.use(adminAuthMiddleware);

router.get("/overview",          getOverview);
router.get("/jobs-per-day",      getJobsPerDay);
router.get("/ai-usage",          getAiUsageStats);
router.get("/status-breakdown",  getStatusBreakdown);

export default router;
