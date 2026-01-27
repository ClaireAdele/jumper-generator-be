const express = require("express");
const authRouter = express.Router();
const {
  signInUser,
  signOutUser,
  resetLoggedInUserPassword,
  requestResetLoggedInUserEmail,
  activateNewEmail,
} = require("../controllers/authentication");
const tokenChecker = require("../middleware/tokenChecker");
const { handleInvalidMethod } = require("../errorHandling/errorHandlers");

authRouter.post("/", signInUser);
authRouter.post("/sign-out-user", tokenChecker, signOutUser);
authRouter.patch("/password-reset-authenticated-user", tokenChecker, resetLoggedInUserPassword);
// authRouter.post("/password-reset-forgotten-password-request", requestForgottenPaswordChange);
// authRouter.patch("/password-reset-forgotten-password-request", authResetChecker, resetForgottenPassword);
authRouter.post("/email-reset-request-authenticated-user", tokenChecker, requestResetLoggedInUserEmail);
authRouter.patch("/email-reset-activate-new-email/:userId", activateNewEmail);

authRouter.use("/", handleInvalidMethod);

module.exports = authRouter;