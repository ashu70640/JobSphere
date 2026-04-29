import express from "express";
import {
  createJob,
  getAllJobs,
  updateJob,
  deleteJob,
  showStats,
  getJob,
  addNote,
  deleteNote,
  updateNote,
  summarizeJob,
  matchResume,
  matchResumePDF,
} from "../controllers/jobController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";
import { aiRateLimit } from "../middleware/aiRateLimit.js";
import { getUpcomingInterviews } from "../controllers/getUpcomingInterviews.js";
const router = express.Router();

router
  .route("/")
  .post(authMiddleware, createJob)
  .get(authMiddleware, getAllJobs);

router.get("/stats", authMiddleware, showStats);
router.get("/upcoming-interviews", authMiddleware, getUpcomingInterviews);

router
  .route("/:id")
  .get(authMiddleware, getJob)
  .patch(authMiddleware, updateJob)
  .delete(authMiddleware, deleteJob);
router.patch("/:id/notes", authMiddleware, addNote);

router
  .route("/:jobId/notes/:noteId")
  .delete(authMiddleware, deleteNote)
  .patch(authMiddleware, updateNote);
router.post("/:id/summarize", authMiddleware, aiRateLimit, summarizeJob);
router.post("/:id/match-resume", authMiddleware, aiRateLimit, matchResume);
router.post(
  "/:id/match-resume-pdf",
  authMiddleware,
  aiRateLimit,
  upload.single("resume"),
  matchResumePDF,
);
export default router;
