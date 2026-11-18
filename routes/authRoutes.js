const express = require("express");
const router = express.Router();
const controller = require("../controllers/authController");
const validate = require("../middlewares/validateMiddleware");
const {
  registerSchema,
  loginSchema,
  recuperarPasswordSchema,
  restablecerPasswordSchema,
} = require("../schemas/authSchema");

router.post("/register", validate(registerSchema), controller.register);
router.post("/login", validate(loginSchema), controller.login);
router.post("/password/recuperar", validate(recuperarPasswordSchema), controller.recuperarPassword);
router.post("/password/restablecer", validate(restablecerPasswordSchema), controller.restablecerPassword);

module.exports = router;
