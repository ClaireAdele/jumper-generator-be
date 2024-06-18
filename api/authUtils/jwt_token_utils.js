const JWT = require("jsonwebtoken");
const secret = process.env.JWT_SECRET;

const generateToken = (user_id) => {
  return JWT.sign(
    {
      user_id: user_id,
      iat: Math.floor(Date.now() / 1000),

      exp: Math.floor(Date.now() / 1000) + 10 * 60,
    },
    secret
  );
};

const decodeToken = (token) => {
  return JWT.decode(token, secret);
};

module.exports = { generateToken, decodeToken };
