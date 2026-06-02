import mongoose from "mongoose";
import Job from "../models/Job.js";
import redis from "../utils/redis.js";
import { createRequire } from "module";
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "../services/calendarService.js";
import { sendInterviewEmail, sendOfferEmail } from "../services/emailService.js";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

// ── Cache key helpers ──────────────────────────────────────────────────────────
const statsKey         = (uid) => `stats:${uid}`;
const upcomingKey      = (uid) => `upcoming:${uid}`;
const STATS_TTL        = 300;  // 5 minutes
const UPCOMING_TTL     = 120;  // 2 minutes

/** Invalidate per-user cache after any job write */
async function invalidateUserCache(userId) {
  try {
    await redis.del(statsKey(userId), upcomingKey(userId));
  } catch (_) { /* non-fatal */ }
}

// ── Allowed update fields (prevent mass assignment) ────────────────────────────
const JOB_UPDATABLE_FIELDS = [
  "company", "position", "status", "jobType", "workLocation", "description",
  "interviewDate", "interviewTime", "interviewType", "interviewRound",
  "interviewStatus", "interviewerName",
];

// ── POST /jobs ─────────────────────────────────────────────────────────────────

export const createJob = async (req, res) => {
  const {
    company, position, status, jobType, workLocation, description,
    interviewDate, interviewTime, interviewType, interviewRound,
    interviewStatus, interviewerName,
  } = req.body;

  if (!company || !position || !workLocation) {
    return res.status(400).json({ message: "company, position and workLocation are required" });
  }

  const job = await Job.create({
    company, position, status, jobType, workLocation, description,
    interviewDate, interviewTime, interviewType, interviewRound,
    interviewStatus, interviewerName,
    createdBy: req.user.userId,
  });

  // Invalidate cached stats/upcoming since a new job was added
  await invalidateUserCache(req.user.userId);

  // Google Calendar sync (best-effort)
  if (status === "interview" && interviewDate) {
    const eventId = await createCalendarEvent(req.user.userId, job);
    if (eventId) {
      job.calendarEventId = eventId;
      await job.save();
    }
  }

  // Email notification (best-effort, non-blocking)
  if (status === "interview") {
    sendInterviewEmail(req.user.userId, job).catch(() => {});
  } else if (status === "offer") {
    sendOfferEmail(req.user.userId, job).catch(() => {});
  }

  res.status(201).json({ job });
};

// ── GET /jobs ──────────────────────────────────────────────────────────────────

export const getAllJobs = async (req, res) => {
  try {
    const { status, jobType, sort, search, page = 1, limit = 10 } = req.query;

    const query = { createdBy: new mongoose.Types.ObjectId(req.user.userId) };

    if (status && status !== "all") query.status = status;
    if (jobType && jobType !== "all") query.jobType = jobType;

    if (search) {
      // Use MongoDB text index when possible; fall back to regex for partial match
      const trimmed = search.trim();
      query.$or = [
        { position: { $regex: trimmed, $options: "i" } },
        { company:  { $regex: trimmed, $options: "i" } },
      ];
    }

    const sortMap = {
      latest:  { createdAt: -1 },
      oldest:  { createdAt:  1 },
      "a-z":   { position:   1 },
      "z-a":   { position:  -1 },
    };
    const sortObj = sortMap[sort] || { createdAt: -1 };

    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip     = (pageNum - 1) * limitNum;

    // Run find + count in parallel — halves round-trip time
    const [jobs, totalJobs] = await Promise.all([
      Job.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .select("company position status jobType workLocation interviewDate interviewTime createdAt calendarEventId")
        .lean(),
      Job.countDocuments(query),
    ]);

    res.status(200).json({
      jobs,
      totalJobs,
      numOfPages: Math.ceil(totalJobs / limitNum),
      currentPage: pageNum,
    });
  } catch (err) {
    console.error("getAllJobs error:", err.message);
    res.status(500).json({ message: "Server error while fetching jobs" });
  }
};

// ── GET /jobs/:id ──────────────────────────────────────────────────────────────

export const getJob = async (req, res) => {
  const job = await Job.findOne({
    _id: req.params.id,
    createdBy: req.user.userId,
  }).lean();

  if (!job) return res.status(404).json({ message: "Job not found" });

  res.status(200).json({ job });
};

// ── PATCH /jobs/:id ────────────────────────────────────────────────────────────

export const updateJob = async (req, res) => {
  // Fetch minimal fields needed for calendar diff logic
  const job = await Job.findOne({
    _id: req.params.id,
    createdBy: req.user.userId,
  }).select("status interviewDate calendarEventId");

  if (!job) return res.status(404).json({ message: "Job not found" });

  const wasInterview = job.status === "interview";
  const wasOffer     = job.status === "offer";
  const hadEventId   = job.calendarEventId;

  // Whitelist update fields to prevent mass assignment attacks
  const updates = {};
  for (const field of JOB_UPDATABLE_FIELDS) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }
  Object.assign(job, updates);
  await job.save();

  await invalidateUserCache(req.user.userId);

  // Google Calendar sync
  const isNowInterview = job.status === "interview";
  if (isNowInterview && job.interviewDate) {
    if (hadEventId) {
      await updateCalendarEvent(req.user.userId, job);
    } else {
      const eventId = await createCalendarEvent(req.user.userId, job);
      if (eventId) { job.calendarEventId = eventId; await job.save(); }
    }
  } else if (wasInterview && !isNowInterview && hadEventId) {
    await deleteCalendarEvent(req.user.userId, hadEventId);
    job.calendarEventId = "";
    await job.save();
  }

  // Email notifications on status change (best-effort, non-blocking)
  const isNowOffer = job.status === "offer";
  if (!wasInterview && isNowInterview) {
    sendInterviewEmail(req.user.userId, job).catch(() => {});
  } else if (!wasOffer && isNowOffer) {
    sendOfferEmail(req.user.userId, job).catch(() => {});
  }

  res.status(200).json(job);
};

// ── DELETE /jobs/:id ───────────────────────────────────────────────────────────

export const deleteJob = async (req, res) => {
  try {
    const job = await Job.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user.userId,
    }).select("calendarEventId");

    if (!job) return res.status(404).json({ message: "Job not found" });

    await invalidateUserCache(req.user.userId);

    if (job.calendarEventId) {
      await deleteCalendarEvent(req.user.userId, job.calendarEventId);
    }

    return res.status(200).json({ message: "Job deleted successfully" });
  } catch (err) {
    console.error("deleteJob error:", err.message);
    return res.status(500).json({ message: "Server error while deleting job" });
  }
};

// ── GET /stats ─────────────────────────────────────────────────────────────────

export const showStats = async (req, res) => {
  const userId = req.user.userId;
  const cacheKey = statsKey(userId);

  // 1️⃣ Redis cache
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return res.status(200).json(JSON.parse(cached));
  } catch (_) {}

  // 2️⃣ Run both aggregations in parallel
  const uid = new mongoose.Types.ObjectId(userId);

  const [statusStats, monthlyRaw] = await Promise.all([
    Job.aggregate([
      { $match: { createdBy: uid } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Job.aggregate([
      { $match: { createdBy: uid } },
      {
        $group: {
          _id:   { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 6 },
    ]),
  ]);

  const statsMap = statusStats.reduce((acc, { _id, count }) => {
    acc[_id] = count;
    return acc;
  }, {});

  const defaultStats = {
    pending:   statsMap.pending   || 0,
    interview: statsMap.interview || 0,
    declined:  statsMap.declined  || 0,
    offer:     statsMap.offer     || 0,
  };

  const monthlyApplications = monthlyRaw
    .map(({ _id: { year, month }, count }) => ({
      date: new Date(year, month - 1).toLocaleString("default", {
        month: "short",
        year:  "numeric",
      }),
      count,
    }))
    .reverse();

  const result = { defaultStats, monthlyApplications };

  try {
    await redis.set(cacheKey, JSON.stringify(result), "EX", STATS_TTL);
  } catch (_) {}

  res.status(200).json(result);
};

// ── Notes ──────────────────────────────────────────────────────────────────────

export const addNote = async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ message: "Note text is required" });
  }

  const job = await Job.findOneAndUpdate(
    { _id: id, createdBy: req.user.userId },
    { $push: { notes: { text: text.trim() } } },
    { new: true }
  );

  if (!job) return res.status(404).json({ message: "Job not found" });

  res.status(200).json({ message: "Note added successfully", job });
};

export const deleteNote = async (req, res) => {
  const { jobId, noteId } = req.params;

  const job = await Job.findOneAndUpdate(
    { _id: jobId, createdBy: req.user.userId },
    { $pull: { notes: { _id: new mongoose.Types.ObjectId(noteId) } } },
    { new: true }
  );

  if (!job) return res.status(404).json({ message: "Job not found" });

  res.status(200).json({ message: "Note deleted", job });
};

export const updateNote = async (req, res) => {
  const { jobId, noteId } = req.params;
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ message: "Note text is required" });
  }

  const job = await Job.findOneAndUpdate(
    { _id: jobId, createdBy: req.user.userId, "notes._id": new mongoose.Types.ObjectId(noteId) },
    { $set: { "notes.$.text": text.trim() } },
    { new: true }
  );

  if (!job) return res.status(404).json({ message: "Job or note not found" });

  res.status(200).json({ message: "Note updated", job });
};

// ── AI helpers ─────────────────────────────────────────────────────────────────

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent`;

async function callGemini(prompt) {
  const response = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini HTTP ${response.status}: ${err}`);
  }

  const data    = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error("Empty Gemini response");

  const match = rawText.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON in Gemini response");

  return JSON.parse(match[0]);
}

// ── POST /jobs/:id/summarize ───────────────────────────────────────────────────

export const summarizeJob = async (req, res) => {
  const job = await Job.findOne({ _id: req.params.id, createdBy: req.user.userId })
    .select("description")
    .lean();

  if (!job) return res.status(404).json({ message: "Job not found" });
  if (!job.description) return res.status(400).json({ message: "No job description found" });

  try {
    const summary = await callGemini(`
You are an ATS AI system. Return ONLY valid JSON. No markdown. No backticks.

{
  "keySkills": [],
  "responsibilities": [],
  "experience": "",
  "techStack": []
}

Rules: max 6 items per array, experience under 25 words, empty techStack if not specified.

Job Description:
${job.description}
`);
    res.status(200).json({ summary });
  } catch (err) {
    console.error("summarizeJob error:", err.message);
    res.status(500).json({ message: "AI summarization failed" });
  }
};

// ── POST /jobs/:id/match-resume ────────────────────────────────────────────────

export const matchResume = async (req, res) => {
  const { resumeText } = req.body;
  if (!resumeText || !resumeText.trim()) {
    return res.status(400).json({ message: "Resume text is required" });
  }

  const job = await Job.findOne({ _id: req.params.id, createdBy: req.user.userId })
    .select("description")
    .lean();

  if (!job) return res.status(404).json({ message: "Job not found" });

  try {
    const result = await callGemini(`
You are an ATS evaluation system. Return STRICTLY valid JSON. No markdown. No explanations.

{
  "matchScore": 0,
  "missingSkills": [],
  "strengthAreas": [],
  "improvementSuggestions": []
}

Rules: max 5 items per array.

Job Description:
${job.description}

Resume:
${resumeText}
`);
    res.status(200).json({ result });
  } catch (err) {
    console.error("matchResume error:", err.message);
    res.status(500).json({ message: "Resume matching failed" });
  }
};

// ── POST /jobs/:id/match-resume-pdf ───────────────────────────────────────────

export const matchResumePDF = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "PDF file required" });

  const job = await Job.findOne({ _id: req.params.id, createdBy: req.user.userId })
    .select("description")
    .lean();

  if (!job) return res.status(404).json({ message: "Job not found" });

  try {
    const pdfData    = await pdfParse(req.file.buffer);
    const resumeText = pdfData.text;

    const result = await callGemini(`
You are an ATS evaluation system. Return STRICTLY valid JSON:

{
  "matchScore": 0,
  "missingSkills": [],
  "strengthAreas": [],
  "improvementSuggestions": []
}

Job Description:
${job.description}

Resume:
${resumeText}
`);
    res.status(200).json({ result });
  } catch (err) {
    console.error("matchResumePDF error:", err.message);
    res.status(500).json({ message: "PDF resume matching failed" });
  }
};
