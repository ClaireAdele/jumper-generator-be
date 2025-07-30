const { CustomError } = require("../errorHandling/customError");

const savePattern = (req, res, next) => { 
    const _id = req.userId;

    const {
        chestCircumference,
        armLength,
        armCircumference,
        bodyLength,
        shoulderWidth,
        preferredUnit,
    } = req.body;

    
}

module.exports = { savePattern };