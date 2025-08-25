const express = require("express");
const patternRouter = express.Router();
const tokenChecker = require("../middleware/tokenChecker");
const { handleInvalidMethod } = require("../errorHandling/errorHandlers");
const {
  savePattern,
  getPatternById,
  getPatternsByUser,
  deletePatternById,
} = require("../controllers/patterns");


patternRouter.post("/", tokenChecker, savePattern);
patternRouter.get("/my-patterns", tokenChecker, getPatternsByUser);
patternRouter.get("/:patternId", tokenChecker, getPatternById);
patternRouter.delete("/:patternId", tokenChecker, deletePatternById);

patternRouter.use("/", handleInvalidMethod);

module.exports = patternRouter;