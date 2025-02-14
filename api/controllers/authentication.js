const User = require("../models/users");
const { comparePasswords } = require("../utils/encryption_utils");
const { generateToken } = require("../utils/jwt_token_utils");

const signInUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            throw ({ status: 400, message: "Invalid e-mail or password" });
        }
       
        if (!await comparePasswords(password, user.password)) { 
            throw { status: 400, message: "Invalid e-mail or password" };
        }

        const token = generateToken(user._id);

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
          preferredUnit: user.preferredUnit ?? undefined
        };

        res.status(201).json({ message: "User signed-in successfully", signedInUser });
    } catch (error) {
        next(error);
    }
}

module.exports = { signInUser };