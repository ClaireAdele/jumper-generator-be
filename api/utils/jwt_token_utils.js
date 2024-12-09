const JWT = require("jsonwebtoken");
const secret = process.env.JWT_SECRET;

exports.generateToken = (user_id) => {
  try {
    return JWT.sign(
      {
        user_id: user_id,
        iat: Math.floor(Date.now() / 1000),

        exp: Math.floor(Date.now() / 1000) + 10 * 60, // 10 minutes expiry
      },
      secret,
      { algorithm: "HS256" } // Explicitly define a strong algorithm
    );
  } catch (error) {
    console.error("Error generating token:", error);
    throw new Error("Token generation failed");
  }
};

exports.decodeToken = (token) => {
  return JWT.decode(token, secret);
};



