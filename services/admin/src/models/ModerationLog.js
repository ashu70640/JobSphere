// JobSphere Admin — new file, safe to delete without affecting core app
import mongoose from "mongoose";
import { adminConn } from "../config/db.js";

const moderationLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ["delete_job", "ban_user", "unban_user"],
      required: true,
    },
    targetId:   { type: String, required: true },  // jobId or userId
    targetType: { type: String, enum: ["job", "user"], required: true },
    adminEmail: { type: String, required: true },
    reason:     { type: String, default: "" },
    metadata:   { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export const buildModerationLogModel = () =>
  adminConn.model("ModerationLog", moderationLogSchema);
