const JWT = require("jsonwebtoken");
const { CustomError } = require("../errorHandling/customError");

const tokenChecker = (req, res, next) => {
  try {
    const token = req.cookies?.ACCESS_TOKEN;

    const payload = JWT.verify(token, process.env.JWT_SECRET);
    req.userId = payload.user_id;
    next();
  
  } catch {
    const error = new CustomError("Could not identify user", 401);
    next(error);
  }
}

module.exports = tokenChecker;
