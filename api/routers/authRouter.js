const express = require("express");
const authRouter = express.Router();
const { signInUser } = require("../controllers/authentication");
const { handleInvalidMethod } = require("../errorHandling/errorHandlers");

authRouter.post("/", signInUser);

authRouter.use("/", handleInvalidMethod);

module.exports = authRouter;