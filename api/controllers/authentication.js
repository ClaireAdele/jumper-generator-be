const User = require("../models/users");
const { comparePasswords } = require("../utils/encryption_utils");
const { generateToken } = require("../utils/jwt_token_utils");

const signInUser = async (req, res, next) => { 
    try { 
        const { email, password } = req.body;

        const user = await User.findOne({ email: email });

        if (!user) { 
            throw ({ status: 400, message: "Invalid e-mail or password" });
        }
       
        if (!await comparePasswords(password, user.password)) { 
            throw { status: 400, message: "Invalid e-mail or password" };
        }

        const token = generateToken(user._id);
        res.status(201).json({ token: token, message: "User signed-in successfully" });
    } catch (error) {
        next(error);
    }   
}

module.exports = { signInUser };