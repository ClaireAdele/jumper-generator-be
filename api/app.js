const express = require("express");
const bodyParser = require("body-parser");
const tokenChecker = require("./middleware/tokenChecker.js");
const cors = require("cors");


const app = express();

const usersRouter = require("./routers/usersRouter.js")

app.use(cors());
app.use(bodyParser.json());

app.use("/users", usersRouter);

module.exports = app;