const express = require("express");
const authRouter = express.Router();
const {
  signInUser,
  signOutUser,
  resetUserPassword,
  requestResetLoggedInUserEmail,
  activateNewEmail,
  requestForgottenPasswordReset,
} = require("../controllers/authentication");
const tokenChecker = require("../middleware/tokenChecker");
const { handleInvalidMethod } = require("../errorHandling/errorHandlers");

authRouter.post("/", signInUser);
authRouter.post("/sign-out-user", tokenChecker, signOutUser);
authRouter.patch(
  "/password-reset-authenticated-user",
  tokenChecker,
  resetUserPassword,
);
authRouter.post("/email-reset-request-authenticated-user", tokenChecker, requestResetLoggedInUserEmail);
authRouter.patch("/email-reset-activate-new-email/:userId", activateNewEmail);
authRouter.post("/password-reset-forgotten-password-request", requestForgottenPasswordReset);
authRouter.patch("/password-reset-forgotten-password", resetUserPassword);


authRouter.use("/", handleInvalidMethod);

module.exports = authRouter;