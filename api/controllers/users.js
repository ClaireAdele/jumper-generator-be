const User = require("../models/users");

const createUser = async (req, res) => {
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

        res.status(201).send({ message: `User ${user._id} has been created` });
    } catch { 
        console.error();
        res.status(500).send();
    }
};

const updateUser = async (req, res) => {
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

        res.status(201).send({ message: `User ${userToUpdate._id} has been updated` });
  } catch {
        console.error();
        res.status(500).send();
  }
};

module.exports = {
  createUser,
  updateUser,
};
