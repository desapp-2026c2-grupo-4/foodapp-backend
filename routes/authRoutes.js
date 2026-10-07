const express = require("express");
const router = express.Router();
const controller = require("../controllers/authController");
const validate = require("../middlewares/validateMiddleware");
const { registerSchema, loginSchema } = require("../schemas/authSchema");

router.post("/register", validate(registerSchema), controller.register);
router.post("/login", validate(loginSchema), controller.login);

module.exports = router;
