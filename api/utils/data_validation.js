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
    patterns: user.patterns ?? undefined,
  };
    
  return signedInUser;
};

exports.validatePatternData = (requestBody) => {
    const { jumperShape } = requestBody;

    const jumperShapes = {
      "top-down-raglan": [
        "chestCircumference",
        "armLength",
        "bodyLength",
        "easeAmount",
      ],
      "drop-shoulder": [
        "chestCircumference",
        "bodyLength",
        "necklineToChest",
        "shoulderWidth",
        "armLength",
        "easeAmount",
      ],
      "bottom-up": [
        "chestCircumference",
        "bodyLength",
        "necklineToChest",
        "shoulderWidth",
        "armLength",
        "easeAmount",
      ],
    };
    
    const requiredFields = jumperShapes[jumperShape];
    
    /*EDGE CASE: the jumper shape is not in the list*/
    if (!requiredFields) { 
        return false;
    }

    const missingOrIncorrectFields = requiredFields.filter((field) => {
        const requiredFieldValue = requestBody[field];
        
        return !requiredFieldValue || typeof (requiredFieldValue) != "number" || requiredFieldValue <= 0;
    });

    console.log(missingOrIncorrectFields)

    if (missingOrIncorrectFields.length > 0) {
      return false;
    }

    return true;
};