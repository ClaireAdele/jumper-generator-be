const mongoose = require("mongoose");

const PatternSchema = new mongoose.Schema({
    patternName: {
        type: String,
        required: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
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

const Pattern = mongoose.model("Pattern", PatternSchema);

module.exports = Pattern;