const mongoose = require("mongoose");

//TODO - add a field for what kind of jumpers it should be as well I think
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
    jumperStyle: String,
});

const Pattern = mongoose.model("Pattern", PatternSchema);

module.exports = Pattern;