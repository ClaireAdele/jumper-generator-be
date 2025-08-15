const express = require("express");
const patternRouter = express.Router();
const tokenChecker = require("../middleware/tokenChecker");
const { handleInvalidMethod } = require("../errorHandling/errorHandlers");
const { savePattern, getPattern } = require("../controllers/patterns");


patternRouter.post("/", tokenChecker, savePattern);
patternRouter.get("/:pattern_id", tokenChecker, getPattern);

patternRouter.use("/", handleInvalidMethod);

module.exports = patternRouter;