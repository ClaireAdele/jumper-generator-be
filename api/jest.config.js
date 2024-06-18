const dotenv = require("dotenv");
dotenv.config({ path: "./.env.test" });

/** @type {import('jest').Config} */
const config = {
  verbose: true,
  maxWorkers: 1,
};

module.exports = config;
