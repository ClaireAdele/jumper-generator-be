const express = require("express");
const apiRouter = express.Router();
const userRouter = require("./usersRouter");
const authRouter = require("./authRouter");


apiRouter.use("/users", userRouter);
apiRouter.use("/authentication", authRouter);

module.exports = apiRouter;
