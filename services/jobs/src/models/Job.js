import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    text:      { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const jobSchema = new mongoose.Schema(
  {
    company:      { type: String, required: [true, "Please provide company"], maxlength: 50, trim: true },
    position:     { type: String, required: [true, "Please provide position"], maxlength: 100, trim: true },
    status:       { type: String, enum: ["pending", "interview", "declined", "offer"], default: "pending" },
    jobType:      { type: String, enum: ["full-time", "part-time", "remote", "internship"], default: "full-time" },
    workLocation: { type: String, default: "my city", trim: true },
    description:  { type: String, required: true },

    // Interview fields
    interviewDate:   { type: Date },
    interviewTime:   { type: String, default: "" },
    interviewType:   { type: String, enum: ["phone", "video", "on-site", "technical", "panel", "final", ""], default: "" },
    interviewRound:  { type: Number, default: 1 },
    interviewStatus: { type: String, enum: ["scheduled", "completed", "cancelled", "rescheduled"], default: "scheduled" },
    interviewerName: { type: String, default: "" },

    notes: { type: [noteSchema], default: [] },

    // Google Calendar event ID
    calendarEventId: { type: String, default: "" },

    createdBy: { type: mongoose.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// ── Performance Indexes ────────────────────────────────────────────────────────
//
// 1. Primary list query: user's jobs sorted by date (most common query in getAllJobs)
jobSchema.index({ createdBy: 1, createdAt: -1 });

// 2. Filtered list: user + status filter (dashboard filter dropdown)
jobSchema.index({ createdBy: 1, status: 1 });

// 3. Filtered list: user + jobType filter
jobSchema.index({ createdBy: 1, jobType: 1 });

// 4. Upcoming interviews widget and /upcoming-interviews endpoint
jobSchema.index({ createdBy: 1, interviewDate: 1, status: 1 });

// 5. Full-text search on position + company (replaces slow $regex scans)
jobSchema.index({ position: "text", company: "text" }, { weights: { position: 2, company: 1 } });

// 6. Stats aggregation — match stage on createdBy
jobSchema.index({ createdBy: 1, status: 1, createdAt: -1 });

export default mongoose.model("Job", jobSchema);
