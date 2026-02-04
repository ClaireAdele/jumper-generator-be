const express = require("express");

const bodyParser = require("body-parser");
const mongoSanitize = require("express-mongo-sanitize");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");

const cors = require("cors");
const {
  handleInvalidPath,
  globalErrorHandler,
} = require("./errorHandling/errorHandlers.js");

const app = express();

const apiRouter = require("./routers/apiRouter.js")

app.use(cors());
app.use(bodyParser.json());
app.use(cookieParser());
app.use(helmet());

app.use(mongoSanitize());

app.use("/api", apiRouter);
app.all("/*", handleInvalidPath);

app.use(globalErrorHandler);

module.exports = app;