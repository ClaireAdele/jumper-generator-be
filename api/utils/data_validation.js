const User = require("../models/users");

exports.isUsernameAlreadyInUse = async (username) => {
    const [user] = await User.find({ username: username });
    
    return user;
};

exports.isEmailAlreadyInUse = async (email) => {
    const [user] = await User.find({ email: email });

    return user;
};
