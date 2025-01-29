require("dotenv").config();

const app = require("./app.js");
const { connectToDatabase } = require("./db/db_connection.js");

const listenForRequests = () => {
  const port = process.env.PORT || 8080;
  app.listen(port, () => {
    console.log("Now listening on port", port);
  });
};

connectToDatabase().then(() => {
  listenForRequests();
});
