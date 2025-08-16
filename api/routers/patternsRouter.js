const express = require("express");
const patternRouter = express.Router();
const tokenChecker = require("../middleware/tokenChecker");
const { handleInvalidMethod } = require("../errorHandling/errorHandlers");
const { savePattern, getPatternById } = require("../controllers/patterns");


patternRouter.post("/", tokenChecker, savePattern);
patternRouter.get("/:pattern_id", tokenChecker, getPatternById);

patternRouter.use("/", handleInvalidMethod);

module.exports = patternRouter;