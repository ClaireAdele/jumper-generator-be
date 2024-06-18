const mongoose = require("mongoose");
const { connectToDatabase } = require("./db/db_connection");

beforeAll(async () => {
  await connectToDatabase();
});

afterAll(async () => {
  await mongoose.connection.close(true);
});
