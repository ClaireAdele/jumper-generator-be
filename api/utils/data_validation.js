const User = require("../models/users");

exports.isUsernameAlreadyInUse = async (username) => {
    const user = await User.findOne({ username });
    
    return user;
};

exports.isEmailAlreadyInUse = async (email) => {
    const user = await User.findOne({ email });

    return user;
};

exports.formatUserData = (user) => {
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
    
    return signedInUser;
};
