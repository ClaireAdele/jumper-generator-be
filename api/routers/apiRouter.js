const express = require("express");
const apiRouter = express.Router();
const userRouter = require("./usersRouter");


apiRouter.use("/users", userRouter);

module.exports = apiRouter;
