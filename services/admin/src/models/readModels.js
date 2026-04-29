// JobSphere Admin — new file, safe to delete without affecting core app
// Read-only mongoose models bound to authConn / jobsConn.
// These mirror the existing schemas without importing the original service files.
import mongoose from "mongoose";
import { authConn, jobsConn } from "../config/db.js";

// ── Mirror of services/auth/src/models/User.js ──────────────────────────────
const userSchema = new mongoose.Schema(
  {
    name:      { type: String },
    email:     { type: String },
    password:  { type: String, select: false },
    location:  { type: String },
    bannedAt:  { type: Date, default: null },     // admin soft-ban field
    refreshTokens: [{ token: String, createdAt: Date }],
    googleCalendar: {
      accessToken:     { type: String, select: false },
      refreshToken:    { type: String, select: false },
      tokenExpiry:     { type: Date },
      calendarEnabled: { type: Boolean },
    },
  },
  { timestamps: true },
);

// ── Mirror of services/jobs/src/models/Job.js ────────────────────────────────
const jobSchema = new mongoose.Schema(
  {
    company:        { type: String },
    position:       { type: String },
    status:         { type: String },
    jobType:        { type: String },
    workLocation:   { type: String },
    description:    { type: String },
    interviewDate:  { type: Date },
    interviewTime:  { type: String },
    interviewType:  { type: String },
    interviewRound: { type: Number },
    interviewStatus:{ type: String },
    interviewerName:{ type: String },
    calendarEventId:{ type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId },
    notes: [{ text: String, createdAt: Date }],
  },
  { timestamps: true },
);

// ── Mirror of services/jobs/src/models/AiUsage.js ───────────────────────────
const aiUsageSchema = new mongoose.Schema({
  userId:    { type: String, index: true },
  count:     { type: Number, default: 0 },
  lastReset: { type: Date, default: Date.now },
});

// Build models bound to their respective connections
export const buildUserModel      = () => authConn.model("User",    userSchema);
export const buildJobModel       = () => jobsConn.model("Job",     jobSchema);
export const buildAiUsageModel   = () => jobsConn.model("AIUsage", aiUsageSchema);
