// JobSphere Admin — new file, safe to delete without affecting core app
import mongoose from "mongoose";
import { getModels } from "../models/modelRegistry.js";

// GET /api/admin/jobs?page=1&limit=20&search=
export const getAllJobs = async (req, res) => {
  try {
    const { Job, User } = getModels();
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 20);
    const search = req.query.search?.trim() || "";
    const skip   = (page - 1) * limit;

    const filter = search
      ? {
          $or: [
            { company:  { $regex: search, $options: "i" } },
            { position: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const [jobs, total] = await Promise.all([
      Job.find(filter, {
        company: 1, position: 1, status: 1, jobType: 1, createdBy: 1, createdAt: 1,
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Job.countDocuments(filter),
    ]);

    // Resolve owner emails from authdb
    const ownerIds = [...new Set(jobs.map((j) => j.createdBy?.toString()))];
    const owners   = await User.find(
      { _id: { $in: ownerIds } },
      { email: 1 },
    ).lean();
    const emailMap = Object.fromEntries(owners.map((u) => [u._id.toString(), u.email]));

    const result = jobs.map((j) => ({
      ...j,
      ownerEmail: emailMap[j.createdBy?.toString()] ?? "unknown",
    }));

    res.json({
      jobs: result,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[Jobs] getAllJobs error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/admin/jobs/:id  — hard-delete (admin moderation), logs first
export const deleteJob = async (req, res) => {
  try {
    const { Job, ModerationLog } = getModels();
    const jobId = req.params.id;

    if (!mongoose.isValidObjectId(jobId)) {
      return res.status(400).json({ message: "Invalid job ID" });
    }

    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: "Job not found" });

    // Audit trail BEFORE deletion
    await ModerationLog.create({
      action:     "delete_job",
      targetId:   jobId,
      targetType: "job",
      adminEmail: req.admin.email,
      metadata: {
        company:   job.company,
        position:  job.position,
        status:    job.status,
        createdBy: job.createdBy?.toString(),
      },
    });

    await job.deleteOne();

    res.json({ message: "Job deleted and logged" });
  } catch (err) {
    console.error("[Jobs] deleteJob error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};
