const User = require("../models/users");
const { generateToken } = require("../utils/jwt_token_utils");
const { hashPassword } = require("../utils/encryption_utils");
const { isUsernameAlreadyInUse, isEmailAlreadyInUse } = require("../utils/data_validation");

exports.getSignedInUser = async (req, res, next) => {
    try {
        const userId = req.user_id;

        const user = await User.findOne({ _id: userId });

    

    } catch(error) { 
        next(error);
    }
   
}

exports.createUser = async (req, res, next) => {
    const { username, email, password } = req.body;

    try {
        if (await isUsernameAlreadyInUse(username)) { 
            throw({
                status: 400,
                message: "This username is already is use",
            });
        }

        if (await isEmailAlreadyInUse(email)) {
            throw({
              status: 400,
              message: "This e-mail address is already is use",
            });
        }

        if (!password) {
            throw({
              status: 400,
              message: "A password must be specified",
            });
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
    const _id = req.user_id;

    const {
        username,
        chestCircumference,
        armLength,
        armCircumference,
        bodyLength,
        necklineToChest,
        shoulderWidth,
        preferredUnit,
    } = req.body;

    try {
        if (await isUsernameAlreadyInUse(username)) {
          throw({
            status: 400,
            message: "This username is already is use",
          });
        }

        let userToUpdate = await User.findOneAndUpdate(
            { _id },
            {
                username,
                chestCircumference,
                armLength,
                armCircumference,
                bodyLength,
                necklineToChest,
                shoulderWidth,
                preferredUnit
            }
        );

        if (!userToUpdate) {
            throw({ status: 404, message: "The user you attempted to update doesn't exist" });
        }

        const token = generateToken(_id);
        res.status(201).send({ message: `User ${userToUpdate._id} has been updated`, token });

    } catch (error ){
        next(error);
    }
};

