const express = require("express");
const userRouter = express.Router();
const tokenChecker = require("../middleware/tokenChecker");
const { createUser, updateUser, getSignedInUser } = require("../controllers/users"); 
const { handleInvalidMethod } = require("../errorHandling/errorHandlers");


userRouter.get("/me", tokenChecker, getSignedInUser);
userRouter.post("/", createUser);
userRouter.put("/me", tokenChecker, updateUser);

userRouter.use("/", handleInvalidMethod);

module.exports = userRouter;