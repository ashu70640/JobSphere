// JobSphere Admin — new file, safe to delete without affecting core app
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getModels } from "../models/modelRegistry.js";

// POST /api/admin/login
export const adminLogin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const { Admin } = getModels();
    const admin = await Admin.findOne({ email: email.toLowerCase() });

    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { adminId: admin._id, email: admin.email, role: admin.role },
      process.env.ADMIN_JWT_SECRET,
      { expiresIn: "8h" },
    );

    res.status(200).json({
      token,
      admin: { email: admin.email, role: admin.role },
    });
  } catch (err) {
    console.error("[AdminAuth] login error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/admin/me
export const adminMe = (req, res) => {
  res.json({ admin: req.admin });
};
