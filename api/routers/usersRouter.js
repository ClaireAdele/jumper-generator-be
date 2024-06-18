const express = require("express");
const router = express.Router();
const tokenChecker = require("../middleware/tokenChecker");
const { createUser, updateUser } = require("../controllers/users"); 

router.post("/", createUser);
router.put("/", tokenChecker, updateUser);

module.exports = router;