const express = require("express");
const patternRouter = express.Router();
const tokenChecker = require("../middleware/tokenChecker");
const { handleInvalidMethod } = require("../errorHandling/errorHandlers");
const { savePattern } = require("../controllers/patterns");


patternRouter.post("/", tokenChecker, savePattern);

patternRouter.use("/", handleInvalidMethod);

module.exports = patternRouter;