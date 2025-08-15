const { CustomError } = require("../errorHandling/customError");
const User = require("../models/users");
const Pattern = require("../models/patterns");
const { validatePatternData } = require("../utils/data_validation");
const { generateToken } = require("../utils/jwt_token_utils");

const savePattern = async (req, res, next) => {
  const _id = req.userId;

  /*The preferred unit here can be different than the one specified in the profile, the user should 
  be allowed to create patterns with a different unit if they wish.*/
  const {
    chestCircumference,
    armLength,
    armCircumference,
    bodyLength,
    shoulderWidth,
    preferredUnit,
    necklineToChest,
    patternName,
    jumperShape,
    knittingGauge,
    easeAmount
  } = req.body;

  try {
    //TODO - EDGE CASE - patternName is an empty string or contains lots of empty characters
    if (!patternName) {
      throw new CustomError("Missing required field: patternName", 400);
    }

    if (!jumperShape) {
      throw new CustomError("Missing required field: jumperShape", 400);
    }

    if (!knittingGauge) {
      throw new CustomError("Missing required field: knittingGauge", 400);
    }

    if (!validatePatternData(req.body)) {
      throw new CustomError(
        "Incorrect jumper data - try again",
        400
      );
    }

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
      jumperShape,
      necklineToChest,
      knittingGauge,
      user: user._id,
      easeAmount
    });
    
    await pattern.save();

    const token = generateToken(_id);

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "Lax",
      maxAge: Math.floor(Date.now() / 1000) + 10 * 60,
    });

    res
      .status(201)
      .json({ message: `Pattern ${pattern._id} has been created`, pattern });
  } catch (error) {
    next(error);
  }
};

const getPattern = async (req, res, next) => {
  const _id = req.userId;
  const { pattern_id } = req.params;

  try {
    const pattern = await Pattern.findById({ _id: pattern_id });
    console.log(pattern)

    console.log(_id)
    
    const token = generateToken(_id);
    console.log(token)

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "Lax",
      maxAge: 1000 * 10 * 60,
    });

    res.status(200).json({ message: `Pattern ${pattern._id} found`, pattern });
  } catch(error) { 
    next(error);
  }
}

module.exports = { savePattern, getPattern };