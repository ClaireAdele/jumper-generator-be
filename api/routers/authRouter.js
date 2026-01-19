const express = require("express");
const authRouter = express.Router();
const {
  signInUser,
  signOutUser,
  resetLoggedInUserPassword,
  resetLoggedInUserEmail,
} = require("../controllers/authentication");
const tokenChecker = require("../middleware/tokenChecker");
const authResetChecker = require("../middleware/authResetChecker");
const { handleInvalidMethod } = require("../errorHandling/errorHandlers");

authRouter.post("/", signInUser);
authRouter.post("/sign-out-user", signOutUser);
authRouter.patch("/password-reset-authenticated-user", tokenChecker, resetLoggedInUserPassword);
// authRouter.post("/password-reset-forgotten-password-request", requestForgottenPaswordChange);
// authRouter.patch("/password-reset-forgotten-password-request", authResetChecker, resetForgottenPassword);
// authRouter.patch("/email-reset-authenticated-user", tokenChecker, resetLoggedInUserEmail );

authRouter.use("/", handleInvalidMethod);

module.exports = authRouter;