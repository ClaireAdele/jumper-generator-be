const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { handleInvalidPath, handleInvalidInput } = require("./errorHandling/errorHandlers.js")


const app = express();

const apiRouter = require("./routers/apiRouter.js")

app.use(cors());
app.use(bodyParser.json());
app.use(cookieParser());

app.use("/api", apiRouter);
app.all("/*", handleInvalidPath); //need to add error handling for wrong path

app.use(handleInvalidInput);

module.exports = app;