import mongoose from "mongoose";

const aiUsageSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  count: {
    type: Number,
    default: 0,
  },
  lastReset: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("AIUsage", aiUsageSchema);
