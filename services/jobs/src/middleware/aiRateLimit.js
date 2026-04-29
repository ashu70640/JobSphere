import redis from "../utils/redis.js";
import AiUsage from "../models/AiUsage.js";

const DAILY_LIMIT = 20;

/**
 * AI rate limiting with Redis-first approach.
 * Falls back to MongoDB if Redis is unavailable.
 * Redis key: ai:usage:{userId}:{YYYY-MM-DD}  TTL: 25 hours (covers timezone drift)
 */
export const aiRateLimit = async (req, res, next) => {
  const userId = req.user.userId;
  const today  = new Date().toISOString().slice(0, 10); // "2025-04-11"
  const key    = `ai:usage:${userId}:${today}`;

  // ── Redis fast path ──────────────────────────────────────────────────────────
  try {
    const current = await redis.incr(key);

    if (current === 1) {
      // First request today — set TTL of 25 hours
      await redis.expire(key, 25 * 3600);
    }

    if (current > DAILY_LIMIT) {
      return res.status(429).json({ message: `Daily AI limit exceeded (${DAILY_LIMIT}/day)` });
    }

    return next();
  } catch (_redisErr) {
    // Redis unavailable — fall back to MongoDB
  }

  // ── MongoDB fallback ─────────────────────────────────────────────────────────
  try {
    let usage = await AiUsage.findOne({ userId });

    if (!usage) {
      usage = await AiUsage.create({ userId });
    }

    const isNewDay =
      new Date().toDateString() !== new Date(usage.lastReset).toDateString();

    if (isNewDay) {
      usage.count     = 0;
      usage.lastReset = new Date();
    }

    if (usage.count >= DAILY_LIMIT) {
      return res.status(429).json({ message: `Daily AI limit exceeded (${DAILY_LIMIT}/day)` });
    }

    usage.count += 1;
    await usage.save();

    next();
  } catch (err) {
    console.error("aiRateLimit fallback error:", err.message);
    next(); // fail open rather than blocking legitimate requests
  }
};
