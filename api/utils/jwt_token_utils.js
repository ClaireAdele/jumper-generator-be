const JWT = require("jsonwebtoken");
const secret = process.env.JWT_SECRET;
const mongoose = require("mongoose");
const { CustomError } = require("../errorHandling/customError");

exports.generateAccessToken = (userId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new CustomError("Invalid user ID format", 401);
    }

    return JWT.sign(
      {
        user_id: userId,
        iat: Math.floor(Date.now() / 1000),

        exp: Math.floor(Date.now() / 1000) + 10 * 60, 
      },
      secret,
      { algorithm: "HS256" } // Explicitly define a strong algorithm
    );
  } catch (error) {
    console.log("Error generating token:", error);
    throw new CustomError(error.message, error.status);
  }
};

exports.generateRefreshToken = (userId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new CustomError("Invalid user ID format", 401);
    }

    const nowInSeconds = Math.floor(Date.now() / 1000);
    const ONE_MONTH = 30 * 24 * 60 * 60; // 30 days in seconds

    return JWT.sign(
      {
        user_id: userId,
        iat: nowInSeconds,
        exp: nowInSeconds + ONE_MONTH, // expires in 30 days
      },
      secret,
      { algorithm: "HS256" }, // Explicitly define a strong algorithm
    );
  } catch (error) {
    console.log("Error generating token:", error);
    throw new CustomError(error.message, error.status);
  }
};

exports.decodeToken = (token) => {
  return JWT.decode(token, secret);
};



