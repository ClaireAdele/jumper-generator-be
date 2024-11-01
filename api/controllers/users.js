const User = require("../models/users");
const { generateToken } = require("../authUtils/jwt_token_utils");

exports.createUser = async (req, res, next) => {
    const { username, chestCircumference, armLength, armCircumference, bodyLength, necklineToChest, shoulderWidth, preferredUnit } = req.body;

    try {
        const user = new User({
            username,
            chestCircumference,
            armLength,
            armCircumference,
            bodyLength,
            necklineToChest,
            shoulderWidth,
            preferredUnit,
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
        console.log(_id)
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
            return await Promise.reject({ status: 404, message: "The user you attempted to update doesn't exist" });
        }

        const token = generateToken(_id);

        res.status(201).send({ message: `User ${userToUpdate._id} has been updated`, token });
  } catch (error ){
        if (error.status) {
            res.status(error.status).json({ message: error.message });
        } else {
            res.status(500).json({ message: "Internal server error"});
        }
  }
};

