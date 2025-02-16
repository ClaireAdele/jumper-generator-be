const express = require("express");
const userRouter = express.Router();
const tokenChecker = require("../middleware/tokenChecker");
const { createUser, updateUser, getSignedInUser, deleteUserAccount } = require("../controllers/users"); 
const { handleInvalidMethod } = require("../errorHandling/errorHandlers");


userRouter.post("/", createUser);
userRouter.get("/me", tokenChecker, getSignedInUser);
userRouter.put("/me", tokenChecker, updateUser);
userRouter.delete("/me", tokenChecker, deleteUserAccount);

userRouter.use("/", handleInvalidMethod);

module.exports = userRouter;