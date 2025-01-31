const JWT = require("jsonwebtoken");

const tokenChecker = (req, res, next) => {
  const token = req.cookies?.token;

  JWT.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err) {
      console.log(err);
      res.status(401).json({ message: "Could not verify token" });
    } else {
      req.user_id = payload.user_id;
      next();
    }
  });
};

module.exports = tokenChecker;
