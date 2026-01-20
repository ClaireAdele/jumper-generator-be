const User = require("../models/users");
const RefreshToken = require("../models/refreshToken");

const { CustomError } = require("../errorHandling/customError");
const { Resend } = require("resend");

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
    //Need to make sure I don't create a fresh one if the user already has one? But then how to manage multiple devices
    //sign-ins?
    //Technically this should like, never occur because the session will either persist while the cookie is up,
    //Or the user will have logged out and deleted the cookie. 
    //hhm.
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
    next(error);
  }
};

const requestResetLoggedInUserEmail = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { password, newEmail } = req.body;
 
    const user = await User.findById(userId);

    //Check the user entered the correct password when attempting to save a new one
    if (!(await comparePasswords(password, user.password))) {
      throw new CustomError("Email reset failed", 400);
    }

    
    const resend = new Resend(process.env.RESEND_API_KEY);

    //Send an email to the new user email, and generate a reset token for now.
    //Log-out the user on all devices (i.e delete any associated user refresh tokens)
    const { data, error } = await resend.emails.send({
      from: "Acme <onboarding@resend.dev>",
      to: ["claire.castanet@outlook.com"],
      subject: "hello world",
      html: "<body style='background-color:#e3d9cf;color:rgb(73,67,62)'><div style='display:flex;flex-direction:column;'><div style='background-color:#42582f;color:white;border-radius:0px 0px 10px 10px;padding:1.5em 1.5em 1.5em 1.5em;display:flex;'><img src='data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjZmZmZmZmIiB2aWV3Qm94PSIwIDAgMTAyNC4wMDUgMTA1Mi45MiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMzM0LjQ5NCAxOTEuMzYyaDM1MC4zNDJjMS4zODQtLjAyMyAzLjAxNi0uMDM3IDQuNjUyLS4wMzcgMTA1LjU4NCAwIDE5OC4xNDIgNTUuNzcyIDI0OS44MiAxMzkuNDYzbC43MjcgMS4yNjMuNTM0LjkzNmM1Mi40NTYgODkuNDMzIDgzLjQzNSAxOTYuOTYgODMuNDM1IDMxMS43MiAwIC42NSAwIDEuMy0uMDAzIDEuOTQ3di0uMSAzMTMuNzQ0SDg0NS45MTVjLTE4LjQ1NCA0OS45OTYtNjUuNjg0IDg1LjAwNS0xMjEuMDk1IDg1LjAzN0gyOTkuMTg4Yy01NS40MTUtLjAzLTEwMi42NDUtMzUuMDQtMTIwLjgxLTg0LjE0NGwtLjI5LS44OTJILjAwM1Y2NDYuNDJDMCA2NDUuOSAwIDY0NS4yODYgMCA2NDQuNjcyIDAgNTI5LjkyMiAzMC45OCA0MjIuNDEgODUuMDMgMzMwLjA0bC0xLjU5MyAyLjk0OC41MzQtLjkzNWM1Mi40MS04NC45MzMgMTQ0Ljk1Ni0xNDAuNjkgMjUwLjUyNS0xNDAuNjl6bTM1MS4wOTggODkuMDQzSDMzOC4wNTVjLS44NDUtLjAxMy0xLjg0My0uMDItMi44NDMtLjAyLTczLjU2OCAwLTEzOC4xMSAzOC42NDctMTc0LjQzIDk2Ljc0N2wtLjUwMy44NjRDMTE1LjQ5IDQ1NC41MzQgODkuMDQgNTQ2LjUyNCA4OS4wNCA2NDQuNjljMCAuNTYgMCAxLjEyLjAwMyAxLjY4di0uMDg2IDIyNC45NjhIMjU5LjM0bC0uMjIyIDQ0Ljk2N3YuMDc2YzAgMTEuMTEgNC40OSAyMS4xNjggMTEuNzU1IDI4LjQ2M3YtLjAwMmM3LjIxIDcuMjYgMTcuMiAxMS43NTQgMjguMjQgMTEuNzU0SDcyNC41OTJjMjIuMTMgMCA0MC4wNy0xNy45NCA0MC4wNy00MC4wN2wtLjIyMy00NC43NDRoMTcwLjUxOHYtMjI1LjI4Yy4wMDItLjQ5OC4wMDMtMS4wODguMDAzLTEuNjggMC05OC4xODItMjYuNDQ2LTE5MC4xODgtNzIuNjA2LTI2OS4yODJsMS4zNyAyLjU0Yy0zNi44My01OC45NC0xMDEuMzU2LTk3LjU2Ny0xNzQuOTA2LTk3LjU2Ny0xLjAxIDAtMi4wMTcuMDA2LTMuMDIyLjAyaC4xNTJ6TTI5Ny40MDcgMjEuMzMzaDQyOS4xOVYyODAuNDVoLTQyOS4xOXptMzQwLjE0NiA4OS4wNDNIMzg2LjQ1djgxLjAzaDI1MS4xMDN6bS0zNzguNDM0IDgwNS40aC04OS4wNDR2LTQ2Ny40OGg4OS4wNDN6bTU5NC44MSAwaC04OS4wNDR2LTQ2Ny40OGg4OS4wNDN6TTUxMS41MSA2MzQuODg1bC05OC44MzgtODUuNDgtOTkuMjgzIDg1LjQ4TDE4NS40OCA1MjQuNDNsNTguMjM0LTY3LjM2MiA2OS43NjYgNjAuMzcgOTkuMjgzLTg1LjQ4IDk4LjgzOCA4NS40OCA5OS4yNC04NS42MTQgOTkuMjgzIDg1LjQ4MiA3MC4yNTUtNjAuNDYgNTcuODc4IDY3LjQ5NC0xMjguMTM0IDExMC41MDMtOTkuMjgzLTg1LjQ4MnptMCAyMTIuMjM2bC05OC44MzgtODUuMDM3LTk5LjI4MyA4NS4wMzctMTI3LjgyLTEwOS45NyA1Ny44NzctNjcuNDk0IDY5Ljg1NSA2MC4xMDQgOTkuMjgzLTg1LjAzNyA5OC44MzggODUuMDM3IDk5LjQxNy04NS4xMjYgOTkuMjgzIDg1LjAzNyA3MC4zLTYwLjIzOCA1Ny44NzggNjcuNjMtMTI4LjE3NyAxMTAuMDEyLTk5LjI4My04NS4wMzd6Ii8+PC9zdmc+' alt='Logo' width='1.5em' height='1.5em'/><h3 style='margin-left:0.5em'>Raglan Generator</h3></div><div style='border-radius:10px;box-shadow:0px 0px 5px 1px #d6d1d1;background-color:white;align-self:center;margin-top:1em;padding-right:1em;padding-left:1em;display:flex;flex-direction:column;'><h2 style='text-align:center;'>We received an e-mail change request.</h2><p>To confirm the change and set 'EMAIL' as your new Raglan Generator account e-mail, please click the button below:</p><button style='padding:0.55em 0.55em 0.55em 0.55em;text-decoration:none;font-size:medium;border-radius:12px;border:0px;background-color:rgb(126,70,136);color:white;align-self:center;'>Confirm new e-mail</button><p>If you did not make this request, you can reach out to support <a>here.</a></p></div></div></body>",
    });

    if (error) {
      console.log(error)
      throw new CustomError(error.message, error.statusCode)
    }

    //Here I will blacklist all associated users refresh token
    const refreshTokensToBlacklist = await RefreshToken.find({ user: user._id });
    console.log(refreshTokensToBlacklist)
    refreshTokensToBlacklist.map((refreshToken) => {
      refreshToken.blacklisted = true 
      refreshToken.save();
    });
    console.log(refreshTokensToBlacklist)
   
    //Send response with success message
    res.status(201).send({ message: "User e-mail reset requested" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  refreshSession,
  signInUser,
  signOutUser,
  resetLoggedInUserPassword,
  requestResetLoggedInUserEmail,
};