const express = require("express");
const authRouter = express.Router();
const { signInUser, signOutUser } = require("../controllers/authentication");
const tokenChecker = require("../middleware/tokenChecker");
const { handleInvalidMethod } = require("../errorHandling/errorHandlers");

authRouter.post("/", signInUser);
authRouter.post("/sign-out-user", signOutUser);

authRouter.use("/", handleInvalidMethod);

module.exports = authRouter;