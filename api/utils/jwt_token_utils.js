const JWT = require("jsonwebtoken");
const secret = process.env.JWT_SECRET;
const mongoose = require("mongoose");
const { CustomError } = require("../errorHandling/customError");

exports.generateToken = (userId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new CustomError("Invalid user ID format", 401);
    }

    //maybe check the userId exists in my database as well. 

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

exports.decodeToken = (token) => {
  return JWT.decode(token, secret);
};



