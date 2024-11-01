const express = require("express");
const userRouter = express.Router();
const tokenChecker = require("../middleware/tokenChecker");
const { createUser, updateUser } = require("../controllers/users"); 
const { handleInvalidMethod } = require("../errorHandling/errorHandlers");


userRouter.post("/", createUser);
userRouter.put("/", tokenChecker, updateUser);

userRouter.use("/", handleInvalidMethod);

module.exports = userRouter;