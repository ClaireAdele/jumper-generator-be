const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  chestCircumference: Number,
  armLength: Number,
  armCircumference: Number,
  bodyLength: Number,
  necklineToChest: Number,
  shoulderWidth: Number,
  preferredUnit: String,
});

const User = mongoose.model("User", UserSchema);

module.exports = User;