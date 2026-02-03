const secret = process.env.JWT_SECRET;

const JWT = require("jsonwebtoken");
const crypto = require("crypto")
const mongoose = require("mongoose");

const { CustomError } = require("../errorHandling/customError");
const { DURATIONS } = require("./constants");

exports.generateAccessToken = (userId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new CustomError("Invalid user ID format", 401);
    }

    const nowInMs = Date.now();

    return JWT.sign(
      {
        user_id: userId,
        iat: nowInMs,
        exp: nowInMs + DURATIONS.FIFTEEN_MINUTES, 
        nonce: crypto.randomBytes(8).toString("hex"),
      },
      secret,
      { algorithm: "HS256" }, // Explicitly define a strong algorithm
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

    const nowInMs = Date.now();

    return JWT.sign(
      {
        user_id: userId,
        iat: nowInMs,
        exp: nowInMs + DURATIONS.ONE_MONTH, // expires in 30 days
        nonce: crypto.randomBytes(8).toString("hex"),
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



