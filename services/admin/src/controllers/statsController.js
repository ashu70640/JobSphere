// JobSphere Admin — new file, safe to delete without affecting core app
import mongoose from "mongoose";
import { getModels } from "../models/modelRegistry.js";

// GET /api/admin/stats/overview
export const getOverview = async (req, res) => {
  try {
    const { User, Job, AiUsage } = getModels();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalUsers,
      totalJobs,
      jobsToday,
      aiCallsToday,
      activeUsers30d,
    ] = await Promise.all([
      User.countDocuments(),
      Job.countDocuments(),
      Job.countDocuments({ createdAt: { $gte: todayStart } }),
      // Sum all AI calls recorded today (count on records reset today)
      AiUsage.aggregate([
        { $match: { lastReset: { $gte: todayStart } } },
        { $group: { _id: null, total: { $sum: "$count" } } },
      ]).then((r) => r[0]?.total ?? 0),
      // Users who created at least one job in the last 30 days
      Job.distinct("createdBy", { createdAt: { $gte: thirtyDaysAgo } }).then(
        (ids) => ids.length,
      ),
    ]);

    res.json({ totalUsers, totalJobs, jobsToday, aiCallsToday, activeUsers30d });
  } catch (err) {
    console.error("[Stats] overview error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/admin/stats/jobs-per-day?days=30
export const getJobsPerDay = async (req, res) => {
  try {
    const { Job } = getModels();
    const days = Math.min(parseInt(req.query.days) || 30, 90);

    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const data = await Job.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            year:  { $year:  "$createdAt" },
            month: { $month: "$createdAt" },
            day:   { $dayOfMonth: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    const result = data.map((d) => ({
      date: `${d._id.year}-${String(d._id.month).padStart(2, "0")}-${String(d._id.day).padStart(2, "0")}`,
      count: d.count,
    }));

    res.json(result);
  } catch (err) {
    console.error("[Stats] jobs-per-day error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/admin/stats/ai-usage
export const getAiUsageStats = async (req, res) => {
  try {
    const { AiUsage, User } = getModels();

    // Top 20 users by total AI calls
    const topUsage = await AiUsage.find()
      .sort({ count: -1 })
      .limit(20)
      .lean();

    // Resolve userIds → emails from authdb
    const userIds = topUsage.map((u) => u.userId);
    const users   = await User.find(
      { _id: { $in: userIds } },
      { email: 1 },
    ).lean();

    const emailMap = Object.fromEntries(users.map((u) => [u._id.toString(), u.email]));

    const result = topUsage.map((u) => ({
      userId:    u.userId,
      email:     emailMap[u.userId] ?? "unknown",
      callCount: u.count,
      lastReset: u.lastReset,
    }));

    res.json(result);
  } catch (err) {
    console.error("[Stats] ai-usage error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/admin/stats/status-breakdown
export const getStatusBreakdown = async (req, res) => {
  try {
    const { Job } = getModels();

    const data = await Job.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const result = data.map((d) => ({ status: d._id, count: d.count }));
    res.json(result);
  } catch (err) {
    console.error("[Stats] status-breakdown error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};
