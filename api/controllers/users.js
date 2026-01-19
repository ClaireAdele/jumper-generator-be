const User = require("../models/users");
const Pattern = require("../models/patterns");

const { CustomError } = require("../errorHandling/customError");

const { generateAccessToken } = require("../utils/jwt_token_utils");
const { hashPassword } = require("../utils/hashing_utils");
const { isUsernameAlreadyInUse, isEmailAlreadyInUse, formatUserData } = require("../utils/data_validation");
const { DURATIONS } = require("../utils/constants");

exports.getSignedInUser = async (req, res, next) => {
    try {
        const userId = req.userId;

        if (!userId) { 
            throw new CustomError("Could not identify user", 401);
        }

        const user = await User.findOne({ _id: userId });

        if (!user) {
          throw new CustomError("User not found", 404);
        }

        const token = generateAccessToken(userId);

        res.cookie("ACCESS_TOKEN", token, {
          httpOnly: true,
          sameSite: "Lax",
          maxAge: DURATIONS.FIFTEEN_MINUTES,
        });

        const signedInUser = formatUserData(user);
        
        res
          .status(200)
          .send({ signedInUser });

    } catch(error) { 
        next(error);
    }
}

exports.createUser = async (req, res, next) => {
    const { username, email, password } = req.body;

    try {
        if (await isUsernameAlreadyInUse(username)) { 
            throw new CustomError( "This username is already is use", 400 );
        }

        if (await isEmailAlreadyInUse(email)) {
            throw new CustomError( "This e-mail address is already is use", 400 );
        }

        if (!password) {
             throw new CustomError("A password must be specified", 400);
        }

        const hashedPassword = await hashPassword(password);

        const user = new User({
            username,
            email,
            password: hashedPassword
        });

        await user.save();

        res.status(201).json({ message: `User ${user._id} has been created` });
    } catch (error) { 
        next(error)
    }
};

exports.updateUser = async (req, res, next) => {
    const _id = req.userId;

    //Potential exception here - what if the user doesn't set out of change all these things? 
    // I will need to make sure that from the back-end the data coming in is complete,
    // including a copy of unchanged data if I leave this function here as is.
    
    const {
        username,
        chestCircumference,
        armLength,
        armCircumference,
        bodyLength,
        shoulderWidth,
        preferredUnit,
    } = req.body;

    try {
        if (await isUsernameAlreadyInUse(username)) {
          throw new CustomError("This username is already is use", 400);
        }

        let userToUpdate = await User.findOneAndUpdate(
            { _id },
            {
                username,
                chestCircumference,
                armLength,
                armCircumference,
                bodyLength,
                shoulderWidth,
                preferredUnit
            },
            { new: true }
        );

        if (!userToUpdate) {
            throw new CustomError(
              "The user you attempted to update doesn't exist",
              404
            );
        }

        const token = generateAccessToken(_id);

        res.cookie("ACCESS_TOKEN", token, {
          httpOnly: true,
          sameSite: "Lax",
          maxAge: DURATIONS.FIFTEEN_MINUTES,
        });

        const updatedUser = formatUserData(userToUpdate);

        res.status(201).send({ message: `User ${userToUpdate._id} has been updated`, updatedUser });

    } catch (error) {
        next(error);
    }
};

exports.deleteUserAccount = async (req, res, next) => { 
    try { 
        const userId = req.userId;

        if (!userId) {
            throw new CustomError("Could not identify user", 401);
        }
 
        const isUserDeleted = await User.deleteOne({ _id: userId });
        const arePatternsDeleted = await Pattern.deleteMany({ user: userId });
        console.log("Is pattern deleted", arePatternsDeleted);

        if (isUserDeleted.deletedCount == 1) {
            res.status(201).send({ message: "User successfully deleted" });
        } else { 
            throw new CustomError ("Could not delete user, try again later", 500)
        }

        res.clearCookie("ACCESS_TOKEN", {
          httpOnly: true,
          sameSite: "Lax",
        });
    }
    catch (error) { 
        next(error);
    }
}

