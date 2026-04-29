// JobSphere Admin — new file, safe to delete without affecting core app
import express from "express";
import { adminLogin, adminMe } from "../controllers/adminAuthController.js";
import { adminAuthMiddleware } from "../middleware/adminAuthMiddleware.js";

const router = express.Router();

router.post("/login", adminLogin);
router.get("/me",    adminAuthMiddleware, adminMe);

export default router;
