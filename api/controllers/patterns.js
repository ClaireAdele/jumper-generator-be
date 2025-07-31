const { CustomError } = require("../errorHandling/customError");
const User = require("../models/users");
const Pattern = require("../models/pattern");

const savePattern = async (req, res, next) => {
    const _id = req.userId;

    /*The preferred unit here can be different than the one specified in the profile, the user should 
    be allowed to create patterns with a different unit if they wish. */
    const {
        chestCircumference,
        armLength,
        armCircumference,
        bodyLength,
        shoulderWidth,
        preferredUnit,
        patternName
    } = req.body;

    try {
        const user = await User.findById({ _id });

        if (!user) { 
             throw new CustomError("User not found", 404);
        }

        const pattern = new Pattern({
            chestCircumference,
            armLength,
            armCircumference,
            bodyLength,
            shoulderWidth,
            preferredUnit,
            patternName,
            user: user._id
        });
        
        await pattern.save();

        res.status(201).json({ message: `Pattern ${pattern._id} has been created`, pattern });

    } catch(error) {
        next(error);
    }

};

module.exports = { savePattern };