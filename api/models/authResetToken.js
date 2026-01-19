const mongoose = require("mongoose");
const { DURATIONS } = require("../utils/constants");

const authResetTokenSchema = new mongoose.Schema({
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
      required: true,
      default: () => Date.now() + DURATIONS.THIRTY_MINUTES
    },
    used: { type: Boolean, default: false },
});

authResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const authResetToken = mongoose.model("AuthResetToken", authResetTokenSchema);

module.exports = authResetToken;
