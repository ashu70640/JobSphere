// JobSphere Admin — new file, safe to delete without affecting core app
import mongoose from "mongoose";
import { getModels } from "../models/modelRegistry.js";

// GET /api/admin/users?page=1&limit=20&search=
export const getUsers = async (req, res) => {
  try {
    const { User, Job } = getModels();
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 20);
    const search = req.query.search?.trim() || "";
    const skip   = (page - 1) * limit;

    const filter = search
      ? {
          $or: [
            { name:  { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      User.find(filter, { name: 1, email: 1, createdAt: 1, bannedAt: 1, location: 1 })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    // Attach job count per user via a single aggregation
    const userIds = users.map((u) => u._id);
    const jobCounts = await Job.aggregate([
      { $match: { createdBy: { $in: userIds } } },
      { $group: { _id: "$createdBy", count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(
      jobCounts.map((j) => [j._id.toString(), j.count]),
    );

    const result = users.map((u) => ({
      ...u,
      jobCount: countMap[u._id.toString()] ?? 0,
    }));

    res.json({
      users: result,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[Users] getUsers error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/admin/users/:id  — soft-ban (sets bannedAt, never hard-deletes)
export const banUser = async (req, res) => {
  try {
    const { User, ModerationLog } = getModels();
    const userId = req.params.id;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.bannedAt) {
      return res.status(409).json({ message: "User is already banned" });
    }

    user.bannedAt = new Date();
    await user.save();

    // Audit trail
    await ModerationLog.create({
      action:     "ban_user",
      targetId:   userId,
      targetType: "user",
      adminEmail: req.admin.email,
      metadata:   { email: user.email },
    });

    res.json({ message: `User ${user.email} banned`, bannedAt: user.bannedAt });
  } catch (err) {
    console.error("[Users] banUser error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/admin/users/:id/jobs
export const getUserJobs = async (req, res) => {
  try {
    const { Job, User } = getModels();
    const userId = req.params.id;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findById(userId, { name: 1, email: 1 }).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    const jobs = await Job.find(
      { createdBy: new mongoose.Types.ObjectId(userId) },
      { company: 1, position: 1, status: 1, jobType: 1, createdAt: 1 },
    )
      .sort({ createdAt: -1 })
      .lean();

    res.json({ user, jobs });
  } catch (err) {
    console.error("[Users] getUserJobs error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};
