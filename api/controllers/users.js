const User = require("../models/users");
const { generateToken } = require("../utils/jwt_token_utils");
const { hashPassword } = require("../utils/encryption_utils");
const { isUsernameAlreadyInUse, isEmailAlreadyInUse } = require("../utils/data_validation");
const { CustomError } = require("../errorHandling/customError");

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

        const token = generateToken(userId);

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
          preferredUnit: user.preferredUnit ?? undefined,
        };
        //need to remove password from response here
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
            }
        );

        if (!userToUpdate) {
            throw new CustomError(
              "The user you attempted to update doesn't exist",
              404
            );
        }

        const token = generateToken(_id);

        res.cookie("token", token, {
          httpOnly: true,
          sameSite: "Lax",
          maxAge: Math.floor(Date.now() / 1000) + 10 * 60,
        });

        res.status(201).send({ message: `User ${userToUpdate._id} has been updated` });

    } catch (error) {
        next(error);
    }
};

