const Joi = require("joi");

const registerSchema = Joi.object({
  nombre: Joi.string().trim().min(1).max(255).required(),
  apellido: Joi.string().trim().min(1).max(255).required(),
  tipo_doc: Joi.string().trim().allow("", null).max(20),
  dni: Joi.string().trim().min(1).max(20).required(),
  email: Joi.string().trim().email().max(255).required(),
  password: Joi.string().min(6).max(255).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().trim().email().max(255).required(),
  password: Joi.string().min(1).max(255).required(),
});

const recuperarPasswordSchema = Joi.object({
  email: Joi.string().trim().email().max(255).required(),
  dni: Joi.string().trim().min(1).max(20).required(),
});

const restablecerPasswordSchema = Joi.object({
  resetToken: Joi.string().trim().min(1).required(),
  passwordNueva: Joi.string().min(6).max(255).required(),
});

module.exports = {
  registerSchema,
  loginSchema,
  recuperarPasswordSchema,
  restablecerPasswordSchema,
};
