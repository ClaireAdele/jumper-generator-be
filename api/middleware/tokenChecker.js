const JWT = require("jsonwebtoken");

// TODO: refactor with Try/Catch to improve this here
const tokenChecker = (req, res, next) => {
  const token = req.cookies?.token;

  console.log(req.cookies.token);

  JWT.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err) {
      console.log(err)
      res.status(401).json({ message: "Could not verify token" });
    } else {
      req.userId = payload.user_id;
      next();
    }
  });
};

module.exports = tokenChecker;
