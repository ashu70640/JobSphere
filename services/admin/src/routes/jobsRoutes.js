// JobSphere Admin — new file, safe to delete without affecting core app
import express from "express";
import { getAllJobs, deleteJob } from "../controllers/jobsController.js";
import { adminAuthMiddleware } from "../middleware/adminAuthMiddleware.js";

const router = express.Router();

router.use(adminAuthMiddleware);

router.get("/",      getAllJobs);
router.delete("/:id", deleteJob);

export default router;
