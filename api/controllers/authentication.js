const User = require("../models/users");
const { CustomError } = require("../errorHandling/customError");
const { comparePasswords } = require("../utils/encryption_utils");
const { generateToken } = require("../utils/jwt_token_utils");

const signInUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
          throw new CustomError("Invalid e-mail or password", 400);
        }

        const user = await User.findOne({ email });

        if (!user) {
            throw new CustomError("Invalid e-mail or password", 400);
        }
       
        if (!await comparePasswords(password, user.password)) {
              throw new CustomError("Invalid e-mail or password", 400);
        }

        const token = generateToken(user._id);

        res.cookie("token", token, {
          httpOnly: true,
          sameSite: "Lax",
          maxAge: Math.floor(Date.now() / 1000) + 10 * 60,
        });

        const signedInUser = {
          email: user.email,
          username: user.username,
          chestCircumference: user.chestCircumference ?? undefined,
          armLength: user.armLength ?? undefined,
          armCircumference: user.armCircumference ?? undefined,
          bodyLength: user.bodyLength ?? undefined,
          shoulderWidth: user.shoulderWidth ?? undefined,
          preferredUnit: user.preferredUnit ?? undefined
        };

        res.status(201).json({ message: "User signed-in successfully", signedInUser });
    } catch (error) {
        next(error);
    }
}

const signOutUser = (req, res, next) => {
  try { 
    res.clearCookie("token", {
    httpOnly: true,
    sameSite: "Lax",
  });

  res.status(200).json({ message: "Signed out successfully" });

  } catch (error) {
    console.log(error)
  }
  
}

module.exports = { signInUser, signOutUser };