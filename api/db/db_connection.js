const mongoose = require("mongoose");

const connectToDatabase = async () => {
  const mongoDbUrl = process.env.MONGODB_URL;

  if (!mongoDbUrl) {
    console.error(
      "No MongoDB url provided."
    );
    throw new Error("No connection string provided");
  }
  
  await mongoose.connect(mongoDbUrl);

  if (process.env.NODE_ENV !== "test") {
    console.log("Successfully connected to MongoDB");
  }
};

module.exports = { connectToDatabase };
