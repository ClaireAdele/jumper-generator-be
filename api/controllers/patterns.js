const { CustomError } = require("../errorHandling/customError");
const User = require("../models/users");
const Pattern = require("../models/patterns");
const { validatePatternData } = require("../utils/data_validation");
const { generateAccessToken } = require("../utils/jwt_token_utils");
const { DURATIONS } = require("../utils/constants");

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

    const user = await User.findById(_id);

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

    const token = generateAccessToken(_id);

    res.cookie("ACCESS_TOKEN", token, {
      httpOnly: true,
      sameSite: "Lax",
      maxAge: DURATIONS.FIFTEEN_MINUTES,
    });

    res
      .status(201)
      .json({ message: `Pattern ${pattern._id} has been created`, pattern });
  } catch (error) {
    next(error);
  }
};

const getPatternById = async (req, res, next) => {
  const userId = req.userId;
  const { patternId } = req.params;

  try {
    const pattern = await Pattern.findById(patternId);

    if (!pattern) {
      throw new CustomError("Pattern does not exist", 404);
    }
    
    const token = generateAccessToken(userId);

    res.cookie("ACCESS_TOKEN", token, {
      httpOnly: true,
      sameSite: "Lax",
      maxAge: DURATIONS.FIFTEEN_MINUTES,
    });

    res.status(200).json({ message: `Pattern ${pattern._id} found`, pattern });
  } catch (error) { 
    next(error);
  }
}

const getPatternsByUser = async (req, res, next) => {
  const userId = req.userId;

  try {
    const patterns = await Pattern.find({ user: userId });

    const token = generateAccessToken(userId);

    res.cookie("ACCESS_TOKEN", token, {
      httpOnly: true,
      sameSite: "Lax",
      maxAge: DURATIONS.FIFTEEN_MINUTES,
    });

    res.status(200).json({ message: `Patterns for user ${userId} found`, patterns });
  } catch (error) {
    next(error);
  }
};

const deletePatternById = async (req, res, next) => {
  const { patternId } = req.params;
  const userId = req.userId;
  
  try {
    const isPatternDeleted = await Pattern.deleteOne({ _id: patternId });

    const token = generateAccessToken(userId);

    res.cookie("ACCESS_TOKEN", token, {
      httpOnly: true,
      sameSite: "Lax",
      maxAge: DURATIONS.FIFTEEN_MINUTES,
    });

    if (isPatternDeleted.deletedCount == 1) {
      res.status(201).send({ message: `Pattern ${patternId} successfully deleted` });
    } else {
      throw new CustomError("Pattern not found", 404);
    }
  } catch (error) {
    next(error)
  }
};

module.exports = {
  savePattern,
  getPatternById,
  getPatternsByUser,
  deletePatternById,
};