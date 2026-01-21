const mongoose = require("mongoose");
const { DURATIONS } = require("../utils/constants");

const ResetTokenSchema = new mongoose.Schema({
  user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      default: () => Date.now() + DURATIONS.THIRTY_MINUTES
    },
    used: { type: Boolean, default: false },
});

ResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const ResetToken = mongoose.model("ResetToken", ResetTokenSchema);

module.exports = ResetToken;
