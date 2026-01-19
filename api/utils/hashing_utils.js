const bcrypt = require("bcrypt");
const crypto = require("crypto");

exports.hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword;
}

exports.comparePasswords = async (inputPassword, userPassword) => {
  const passwordsMatch = await bcrypt.compare(inputPassword, userPassword);

  return passwordsMatch;
}

exports.createPasswordResetRawToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");

  return rawToken;
}

exports.hashTokens = (rawToken) => {
  const tokenHash = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");
  
  return tokenHash;
}