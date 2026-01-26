const User = require("../models/users");
const RefreshToken = require("../models/RefreshToken");
const ResetToken = require("../models/ResetToken")

const { CustomError } = require("../errorHandling/customError");
const { Resend } = require("resend");
const JWT = require("jsonwebtoken");

const { comparePasswords, hashPassword, hashToken, createSecureRawToken } = require("../utils/hashing_utils");
const { generateAccessToken, generateRefreshToken } = require("../utils/jwt_token_utils");
const { DURATIONS } = require("../utils/constants");


const refreshSession = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.REFRESH_TOKEN;
    const deviceId = req.cookies?.DEVICE_ID;

    if (!refreshToken || !deviceId) {
      throw new CustomError("Could not identify user", 401);
    }

    let payload;

    try {
      payload = JWT.verify(refreshToken, process.env.JWT_SECRET);
    } catch (err) {
      /*EDGE CASE - if for some reason the token is invalid/expired but hasn't been purged from my db,
        blacklist on the spot*/
      const hashedRefreshToken = hashToken(refreshToken);
      await RefreshToken.findOneAndUpdate(
        {
          tokenHash: hashedRefreshToken,
        },
        { blacklisted: true },
      );

      throw new CustomError("Could not identify user", 401);
    }

    // Token is valid: check DB
    const hashedRefreshToken = hashToken(refreshToken);
    const hashedDeviceId = hashToken(deviceId);

    //Atomic operation to avoid competing requests - storedToken will evaluate to the document before it's blacklisted
    const storedToken = await RefreshToken.findOneAndUpdate({
      tokenHash: hashedRefreshToken,
      user: payload.user_id,
      deviceIdHash: hashedDeviceId
    }, { blacklisted: true });
    
    //Case 1: A hacker might be using a refreshToken that has been deleted from my db mistakenly but is still technically valid
    //Case 2: If the refresh token is blacklisted, don't grant a new access token
    if (!storedToken || storedToken.blacklisted) {
      throw new CustomError("Could not identify user", 401);
    }

    // Generate new access token
    const accessToken = generateAccessToken(payload.user_id);

    //Generate new refresh token
    const newRefreshToken = generateRefreshToken(payload.user_id);
    const newHashedRefreshToken = hashToken(newRefreshToken);

    await new RefreshToken({
      user: payload.user_id,
      tokenHash: newHashedRefreshToken,
      deviceIdHash: hashedDeviceId,
    }).save();

    res.cookie("ACCESS_TOKEN", accessToken, {
      httpOnly: true,
      sameSite: "Lax",
      maxAge: DURATIONS.FIFTEEN_MINUTES,
    });

    res.cookie("REFRESH_TOKEN", newRefreshToken, {
      httpOnly: true,
      sameSite: "Lax",
      maxAge: DURATIONS.THIRTY_DAYS,
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

    /*Check if device is known to my system, and if not, generate a device id to pair up with the refresh token in db.
     * If known, pair up with new refresh cookie that I am issuing. 
     */
    let deviceId = req.cookies?.DEVICE_ID;

    if (!deviceId) {
      deviceId = createSecureRawToken();

      res.cookie("DEVICE_ID", deviceId, {
        httpOnly: true,
        sameSite: "Lax",
        maxAge: DURATIONS.ONE_YEAR,
      });
    }

    const hashedDeviceId = hashToken(deviceId);

    //EDGE CASE - if this device already have a refresh token for this user that's not expired/blacklisted for whatever reason, blacklist it.
    const unexpectedValidRefreshToken = await RefreshToken.findOneAndUpdate(
      { deviceIdHash: hashedDeviceId, user: user._id, blacklisted: false },
      { blacklisted: true },
    );

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    const hashedRefreshToken = hashToken(refreshToken);

    await new RefreshToken({
      user: user._id,
      tokenHash: hashedRefreshToken,
      deviceIdHash: hashedDeviceId,
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

const signOutUser = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.REFRESH_TOKEN;
    const deviceId = req.cookies?.DEVICE_ID;

    if (!refreshToken || !deviceId) {
      throw new CustomError("No active session found", 400);
    }

    /*Clear refresh tokens for associated device - there should only be the one, 
    but better blacklist any extra if they happen to be there*/
    const hashedDeviceId = hashToken(deviceId);
  
    const blacklistedToken = await RefreshToken.updateMany({
      user: req.userId,
      deviceIdHash: hashedDeviceId,
    }, { blacklisted: true });

    //Clear access token
    res.clearCookie("ACCESS_TOKEN", {
      httpOnly: true,
      sameSite: "Lax",
    });

    //Clear the refresh token
    res.clearCookie("REFRESH_TOKEN", {
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
    const deviceId = req.cookies?.DEVICE_ID;

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

    const hashedDeviceId = hashToken(deviceId);

    //Log-out the user from all other sessions on other devices
    await RefreshToken.updateMany(
      { user: userId, deviceIdHash: { $ne: hashedDeviceId } },
      { blacklisted: true },
    );

    //Send response with success message
    res.status(201).json({message: "User password updated successfully"});
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

    //Generate one time reset token, hash and store it for later verification
    const rawResetToken = createSecureRawToken();
    const hashedResetToken = hashToken(rawResetToken);

    const resetToken = new ResetToken({
      user: userId,
      tokenHash: hashedResetToken,
      pendingEmail: newEmail
    });

    await resetToken.save();

    const resend = new Resend(process.env.RESEND_API_KEY);

    //Send an email to the new user email, and generate a reset token for now.
    //Log-out the user on all devices (i.e delete any associated user refresh tokens)
    //TODO - could also potentially send another e-mail to old address to notify of change
    //TODO - add link to the button to make this fully functional
    const { data, error } = await resend.emails.send({
      from: "Acme <onboarding@resend.dev>",
      to: ["claire.castanet@outlook.com"],
      subject: "hello world",
      html: "<body style='background-color:#e3d9cf;color:rgb(73,67,62)'><div style='display:flex;flex-direction:column;'><div style='background-color:#42582f;color:white;border-radius:0px 0px 10px 10px;padding:1.5em 1.5em 1.5em 1.5em;display:flex;'><img src='placeholder' alt='Logo' width='1.5em' height='1.5em'/><h3 style='margin-left:0.5em'>Raglan Generator</h3></div><div style='border-radius:10px;box-shadow:0px 0px 5px 1px #d6d1d1;background-color:white;align-self:center;margin-top:1em;padding-right:1em;padding-left:1em;display:flex;flex-direction:column;'><h2 style='text-align:center;'>We received an e-mail change request.</h2><p>To confirm the change and set 'EMAIL' as your new Raglan Generator account e-mail, please click the button below:</p><button style='padding:0.55em 0.55em 0.55em 0.55em;text-decoration:none;font-size:medium;border-radius:12px;border:0px;background-color:rgb(126,70,136);color:white;align-self:center;'>Confirm new e-mail</button><p>If you did not make this request, you can reach out to support <a>here.</a></p></div></div></body>",
    });

    if (error) {
      throw new CustomError(error.message, error.statusCode)
    }

    //Here I will blacklist all associated users refresh token
    const refreshTokensToBlacklist = await RefreshToken.find({ user: user._id });

    await RefreshToken.updateMany({ user: user._id }, { blacklisted: true });

    //Send response with success message
    res.status(201).json({ message: "User e-mail reset requested" });
  } catch (error) {
    next(error);
  }
};

const activateNewEmail = async () => {
  try {
    const { resetToken } = req.body;
    //I will send my userid as part of my url in the email to I have both token and uid.
    const userId = req.params;

    if (!resetToken) {
      throw new CustomError("Could not activate new e-mail", 401);
      //Need to figure out flow here, probably will need to send a fresh e-mail and token if this is failing.
      //Might even need to limit attempts amount?
    }

    const hashedResetToken = hashToken(resetToken);

    /*Immediately invalidate the used token in the database*/
    const storedResetToken = ResetToken.findOneAndUpdate(
      {
        tokenHash: hashedResetToken,
        user: userId,
      },
      { used: true },
    );

    /*If the token I just attempted to invalidate was either non-existent in the be or already used, prevent operation*/
    if (!storedResetToken || storedToken.used) {
      throw new CustomError("Could not activate new e-mail", 401);
    }

    /*Set the value of the email field in the user to the pending e-mail requested.*/
    const loggedInUser = await User.findOneAndUpdate({ _id: userId }, { email: storedResetToken.pendingEmail });

    /*Issue user new access and refresh tokens.
    * EDGE CASE: Invalidate any leftover refresh tokens if they exist on the system 
    * (they shouldn't be, but worth making sure they are all 100% invalidated)*/
    await RefreshToken.updateMany({ user: userId }, { blacklisted: true });

    const refreshToken = generateRefreshToken(userId);
    const hashedRefreshToken = hashToken(refreshToken);

    /* Check if device is known to my system, and if not, generate a device id to pair up with the refresh token in db.
     * If known, pair up with new refresh cookie that I am issuing. If device is not known, create new tracking*/
    let deviceId = req.cookies?.DEVICE_ID;

    if (!deviceId) {
      deviceId = createSecureRawToken();

      res.cookie("DEVICE_ID", deviceId, {
        httpOnly: true,
        sameSite: "Lax",
        maxAge: DURATIONS.ONE_YEAR,
      });
    }

    const hashedDeviceId = hashToken(deviceId);

    await new RefreshToken({
      user: userId,
      tokenHash: hashedRefreshToken,
      deviceIdHash: hashedDeviceId,
    }).save();

     res.cookie("ACCESS_TOKEN", accessToken, {
       httpOnly: true,
       sameSite: "Lax",
       maxAge: DURATIONS.FIFTEEN_MINUTES,
     });

     res.cookie("REFRESH_TOKEN", newRefreshToken, {
       httpOnly: true,
       sameSite: "Lax",
       maxAge: DURATIONS.THIRTY_DAYS,
     });
  } catch (error) {
    next(error);
  }
};

//will need a flow that involves email here
const requestForgottenPasswordReset = () => { 

}

const resetForgottenPassword = () => {
  
}

module.exports = {
  refreshSession,
  signInUser,
  signOutUser,
  resetLoggedInUserPassword,
  requestResetLoggedInUserEmail,
};