const User = require("../models/users");
const { CustomError } = require("../errorHandling/customError");
const { comparePasswords, hashPassword } = require("../utils/encryption_utils");
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
    next(error)
  }
}

const resetLoggedInUserPassword = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      throw new CustomError("Password reset failed", 400);
    }

    const user = await User.findById(userId);

    //Check the user entered the correct password when attempting to save a new one
    if (!await comparePasswords(oldPassword, user.password)) {
      throw new CustomError("Password reset failed", 400);
    }
    
    //Update the user with the new password
    const hashedPassword = await hashPassword(newPassword);
    user.password = hashedPassword; 
    await user.save(); 

    //Send response with success message
    res.status(201).send({message: "User password updated successfully"});
  } catch(error) {
    console.log("here")
    next(error);
  }
};

module.exports = { signInUser, signOutUser, resetLoggedInUserPassword };