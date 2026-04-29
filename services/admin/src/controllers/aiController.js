// JobSphere Admin — new file, safe to delete without affecting core app
import { getModels } from "../models/modelRegistry.js";

// GET /api/admin/ai/usage?days=7
// Returns daily AI call counts for the last N days
export const getDailyAiUsage = async (req, res) => {
  try {
    const { AiUsage } = getModels();
    const days = Math.min(parseInt(req.query.days) || 7, 30);

    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    // Records that were reset (used) today or within window
    const data = await AiUsage.aggregate([
      { $match: { lastReset: { $gte: since } } },
      {
        $group: {
          _id: {
            year:  { $year:  "$lastReset" },
            month: { $month: "$lastReset" },
            day:   { $dayOfMonth: "$lastReset" },
          },
          totalCalls: { $sum: "$count" },
          uniqueUsers: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    const result = data.map((d) => ({
      date: `${d._id.year}-${String(d._id.month).padStart(2, "0")}-${String(d._id.day).padStart(2, "0")}`,
      totalCalls:  d.totalCalls,
      uniqueUsers: d.uniqueUsers,
    }));

    res.json(result);
  } catch (err) {
    console.error("[AI] getDailyAiUsage error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/admin/ai/abusers
// Users who had count >= 20 (hit the daily limit) more than 3 times in last 7 days.
// Since AiUsage only stores the current-day count + lastReset, we detect abusers
// as users whose count is currently at the cap (>= 20) as a proxy signal.
export const getAiAbusers = async (req, res) => {
  try {
    const { AiUsage, User } = getModels();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Users who are currently at or over the 20-call limit and were active this week
    const abusers = await AiUsage.find({
      count: { $gte: 20 },
      lastReset: { $gte: sevenDaysAgo },
    })
      .sort({ count: -1 })
      .lean();

    // Enrich with email
    const userIds = abusers.map((a) => a.userId);
    const users   = await User.find({ _id: { $in: userIds } }, { email: 1 }).lean();
    const emailMap = Object.fromEntries(users.map((u) => [u._id.toString(), u.email]));

    const result = abusers.map((a) => ({
      userId:    a.userId,
      email:     emailMap[a.userId] ?? "unknown",
      callCount: a.count,
      lastReset: a.lastReset,
    }));

    res.json(result);
  } catch (err) {
    console.error("[AI] getAiAbusers error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};
