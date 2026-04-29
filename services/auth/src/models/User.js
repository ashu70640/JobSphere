import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema(
  {
    token:     { type: String, required: true },
    createdAt: { type: Date,   default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    location: { type: String, trim: true, default: "my city" },

    refreshTokens: { type: [refreshTokenSchema], default: [] },

    // Google Calendar — tokens AES-256-GCM encrypted; select:false prevents accidental exposure
    googleCalendar: {
      accessToken:     { type: String,  default: null, select: false },
      refreshToken:    { type: String,  default: null, select: false },
      tokenExpiry:     { type: Date,    default: null },
      calendarEnabled: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────────────
// email is already unique:true — Mongoose creates a unique index automatically.
// Explicit sparse index on the refresh-token lookup field:
userSchema.index({ "refreshTokens.token": 1 }, { sparse: true });

const UserModel = mongoose.model("User", userSchema);
export default UserModel;
