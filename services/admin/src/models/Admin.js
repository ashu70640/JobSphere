// JobSphere Admin — new file, safe to delete without affecting core app
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { adminConn } from "../config/db.js";

const adminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["superadmin", "moderator"],
      default: "moderator",
    },
  },
  { timestamps: true },
);

// Seed one superadmin on startup if the collection is empty
export const seedSuperAdmin = async (AdminModel) => {
  const count = await AdminModel.countDocuments();
  if (count > 0) return;

  const email    = process.env.ADMIN_EMAIL    || "admin@jobsphere.com";
  const password = process.env.ADMIN_PASSWORD || "changeme123";

  const hashed = await bcrypt.hash(password, 10);
  await AdminModel.create({ email, password: hashed, role: "superadmin" });
  console.log(`[Admin] Superadmin seeded: ${email}`);
};

// Build the model bound to the admin connection
export const buildAdminModel = () => adminConn.model("Admin", adminSchema);
