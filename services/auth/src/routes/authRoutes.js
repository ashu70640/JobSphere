import express from "express";
import {
  register,
  login,
  getCurrentUser,
  updateUser,
  refreshAccessToken,
} from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authMiddleware, getCurrentUser);
router.patch("/updateUser", authMiddleware, updateUser);
router.post("/refresh", refreshAccessToken);
export default router;
