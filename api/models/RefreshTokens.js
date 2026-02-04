const mongoose = require("mongoose");
const { DURATIONS } = require("../utils/constants");

const RefreshTokenSchema = new mongoose.Schema({
  //User is useful for tracking multiple sessions across devices so I can kill all of them in the case of a password or email reset.
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  tokenHash: {
    type: String,
    required: true,
  },
  deviceIdHash: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    default: () => Date.now() + DURATIONS.THIRTY_DAYS,
  },
  blacklisted: { type: Boolean, default: false },
});

RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshToken = mongoose.model("refreshToken", RefreshTokenSchema);

module.exports = RefreshToken;
