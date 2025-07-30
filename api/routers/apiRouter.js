const express = require("express");
const apiRouter = express.Router();
const userRouter = require("./usersRouter");
const authRouter = require("./authRouter");
const patternsRouter = require("./patternsRouter");


apiRouter.use("/users", userRouter);
apiRouter.use("/authentication", authRouter);
apiRouter.use("/patterns", patternsRouter);


module.exports = apiRouter;
