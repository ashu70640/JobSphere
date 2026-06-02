import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import redis from "../redis.js";
import { sendWelcomeEmail } from "../services/emailService.js";

// ── Helpers ────────────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 10; // NIST-recommended; ~100ms on modern hardware
const ACCESS_TOKEN_TTL  = "15m";
const REFRESH_TOKEN_BYTES = 40;
const USER_CACHE_TTL = 3600;           // 1 hour in seconds
const MAX_REFRESH_TOKENS = 5;          // cap per-user refresh token array

function signAccess(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

function makeRefreshToken() {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
}

function userCacheKey(userId) {
  return `user:${userId}`;
}

function safeUserPayload(user) {
  return {
    userId:   user._id,
    name:     user.name,
    email:    user.email,
    location: user.location,
  };
}

// ── POST /register ─────────────────────────────────────────────────────────────

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email and password are required" });
    }

    // lean check — only fetch _id to confirm existence
    const exists = await User.findOne({ email }).select("_id").lean();
    if (exists) {
      return res.status(400).json({ message: "User Already Exist" });
    }

    // Hash password and create user in parallel-friendly way
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({ name, email, password: hashedPassword });

    // Issue a short-lived access token (same as login for consistency)
    const accessToken = signAccess(user._id);

    // Send welcome email — best-effort, never blocks the response
    sendWelcomeEmail({ name: user.name, email: user.email }).catch(() => {});

    return res.status(201).json({
      message: "User registered successfully",
      user: safeUserPayload(user),
      accessToken,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "User Already Exist" });
    }
    console.error("register error:", error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// ── POST /login ────────────────────────────────────────────────────────────────

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    // Fetch password hash + minimal fields; lean() skips Mongoose hydration overhead
    const user = await User.findOne({ email })
      .select("name email location password refreshTokens")
      .lean(false); // need save() so cannot fully lean here — but select limits data transfer

    if (!user) {
      // Run bcrypt on a dummy hash to prevent timing-based user enumeration
      await bcrypt.compare(password, "$2b$10$invalidhashfortimingnormalization");
      return res.status(400).json({ message: "Invalid Credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }

    // Generate tokens
    const accessToken  = signAccess(user._id);
    const refreshToken = makeRefreshToken();

    // Append refresh token; prune oldest if over cap to prevent unbounded growth
    user.refreshTokens.push({ token: refreshToken });
    if (user.refreshTokens.length > MAX_REFRESH_TOKENS) {
      user.refreshTokens = user.refreshTokens.slice(-MAX_REFRESH_TOKENS);
    }
    await user.save();

    const payload = safeUserPayload(user);

    // Cache user profile in Redis for /me fast path
    try {
      await redis.set(userCacheKey(user._id), JSON.stringify(payload), "EX", USER_CACHE_TTL);
    } catch (_) { /* Redis failure is non-fatal */ }

    return res.status(200).json({ accessToken, refreshToken, user: payload });
  } catch (error) {
    console.error("login error:", error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// ── POST /logout ───────────────────────────────────────────────────────────────

export const logout = async (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    try {
      // Use $pull for atomic array element removal — no load-full-doc-then-save
      await User.updateOne(
        { "refreshTokens.token": refreshToken },
        { $pull: { refreshTokens: { token: refreshToken } } }
      );
    } catch (_) { /* best-effort */ }
  }

  res.json({ message: "Logged out successfully" });
};

// ── GET /me ────────────────────────────────────────────────────────────────────

export const getCurrentUser = async (req, res) => {
  try {
    const cacheKey = userCacheKey(req.user.userId);

    // 1️⃣ Redis fast path
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return res.status(200).json({ user: JSON.parse(cached), source: "cache" });
      }
    } catch (_) { /* Redis unavailable — fall through to DB */ }

    // 2️⃣ MongoDB fallback — lean + select minimal fields
    const user = await User.findById(req.user.userId)
      .select("name email location createdAt")
      .lean();

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Back-fill cache
    try {
      await redis.set(cacheKey, JSON.stringify(user), "EX", USER_CACHE_TTL);
    } catch (_) { /* non-fatal */ }

    res.status(200).json({ user, source: "db" });
  } catch (error) {
    console.error("getCurrentUser error:", error.message);
    res.status(500).json({ msg: "Server error" });
  }
};

// ── PATCH /updateUser ──────────────────────────────────────────────────────────

export const updateUser = async (req, res) => {
  try {
    const { name, email, location } = req.body;

    if (!name || !email) {
      return res.status(400).json({ msg: "name and email are required" });
    }

    // findByIdAndUpdate is a single round-trip vs find + mutate + save
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { name, email, location: location || undefined },
      { new: true, runValidators: true, select: "name email location" }
    ).lean();

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Invalidate cache so next /me gets fresh data
    try {
      await redis.del(userCacheKey(req.user.userId));
    } catch (_) { /* non-fatal */ }

    res.status(200).json({ user, msg: "Profile updated successfully" });
  } catch (err) {
    console.error("updateUser error:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
};

// ── GET /internal/user/:userId (inter-service) ─────────────────────────────────

export const getUserInternal = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select("name email")
      .lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (err) {
    console.error("getUserInternal error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// ── POST /refresh ──────────────────────────────────────────────────────────────

export const refreshAccessToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token required" });
  }

  try {
    // Lean: only fetch _id — we just need to verify the token exists
    const user = await User.findOne({ "refreshTokens.token": refreshToken })
      .select("_id")
      .lean();

    if (!user) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    const newAccessToken = signAccess(user._id);
    res.json({ accessToken: newAccessToken });
  } catch (err) {
    console.error("refreshAccessToken error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};
