// JobSphere Admin — new file, safe to delete without affecting core app
import express from "express";
import { getDailyAiUsage, getAiAbusers } from "../controllers/aiController.js";
import { adminAuthMiddleware } from "../middleware/adminAuthMiddleware.js";

const router = express.Router();

router.use(adminAuthMiddleware);

router.get("/usage",   getDailyAiUsage);
router.get("/abusers", getAiAbusers);

export default router;
