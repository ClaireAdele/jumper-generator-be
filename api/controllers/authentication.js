const User = require("../models/users");
const RefreshToken = require("../models/refreshToken");

const { CustomError } = require("../errorHandling/customError");
const { comparePasswords, hashPassword, hashTokens } = require("../utils/hashing_utils");
const { generateAccessToken, generateRefreshToken } = require("../utils/jwt_token_utils");
const { DURATIONS } = require("../utils/constants");

const refreshSession = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.REFRESH_TOKEN;

    if (!refreshToken) {
      throw CustomError("No refresh token provided", 401);
    }

    let payload;
    
    try {
      payload = JWT.verify(refreshToken, process.env.JWT_SECRET);
    } catch (err) {
      /*Edge case - if for some reason the token is invalid/expired but hasn't been purged from my db,
        blacklist on the spot*/
      const hashedRefreshToken = hashTokens(refreshToken);
      const storedToken = await RefreshToken.findOne({
        tokenHash: hashedRefreshToken,
      });

      if (storedToken && !storedToken.blacklisted) {
        storedToken.blacklisted = true;
        await storedToken.save();
      }

      throw CustomError("Could not identify user", 401);
    }

    // Token is valid: check DB
    const hashedRefreshToken = hashTokens(refreshToken);
    const storedToken = await RefreshToken.findOne({
      tokenHash: hashedRefreshToken,
      user: payload.user_id,
    });

    //Case 1: A hacker might be using a refreshToken that has been deleted from my db mistakenly but is still technically valid
    //Case 2: If the refresh token is blacklisted, don't grant a new access token
    if (!storedToken || storedToken.blacklisted) {
      throw CustomError("Could not identify user", 401);
    }

    // Generate new access token
    const accessToken = generateAccessToken(payload.user_id);

    res.cookie("ACCESS_TOKEN", accessToken, {
      httpOnly: true,
      sameSite: "Lax",
      maxAge: DURATIONS.FIFTEEN_MINUTES,
    });

    res.status(200).json({ message: "Session renewed successfully" });
  } catch (error) {
    next(error);
  }
};

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

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    const hashedRefreshToken = hashTokens(refreshToken);

    //Save my refresh token for rotation and invalidating purposes
    await new RefreshToken({
      user: user._id,
      tokenHash: hashedRefreshToken,
    }).save();

    res.cookie("ACCESS_TOKEN", accessToken, {
      httpOnly: true,
      sameSite: "Lax",
      maxAge: DURATIONS.FIFTEEN_MINUTES,
    });
      
    res.cookie("REFRESH_TOKEN", refreshToken, {
      httpOnly: true,
      sameSite: "Lax",
      maxAge: DURATIONS.THIRTY_DAYS,
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
    res.clearCookie("ACCESS_TOKEN", {
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


const resetLoggedInUserEmail = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { oldPassword, newPassword, newEmail } = req.body;

    if (!oldPassword || !newPassword) {
      throw new CustomError("Password reset failed", 400);
    }

    const user = await User.findById(userId);

    //Check the user entered the correct password when attempting to save a new one
    if (!(await comparePasswords(oldPassword, user.password))) {
      throw new CustomError("Password reset failed", 400);
    }

    //Update the user with the new password
    const hashedPassword = await hashPassword(newPassword);
    user.password = hashedPassword;
    await user.save();

    //Send response with success message
    res.status(201).send({ message: "User password updated successfully" });
  } catch (error) {
    console.log("here");
    next(error);
  }
};

module.exports = { refreshSession, signInUser, signOutUser, resetLoggedInUserPassword };