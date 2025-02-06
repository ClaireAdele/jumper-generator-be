const JWT = require("jsonwebtoken");

const tokenChecker = (req, res, next) => {
  const token = req.cookies?.token;

  JWT.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err) {
      res.status(401).json({ message: "Could not verify token" });
    } else {
      req.userId = payload.user_id;
      console.log(req.userId)
      next();
    }
  });
};

module.exports = tokenChecker;
