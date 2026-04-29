// JobSphere Admin — new file, safe to delete without affecting core app
import express from "express";
import { getUsers, banUser, getUserJobs } from "../controllers/usersController.js";
import { adminAuthMiddleware } from "../middleware/adminAuthMiddleware.js";

const router = express.Router();

router.use(adminAuthMiddleware);

router.get("/",          getUsers);
router.delete("/:id",    banUser);       // soft-ban
router.get("/:id/jobs",  getUserJobs);

export default router;
