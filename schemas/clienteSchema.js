const Joi = require("joi");

const createClienteSchema = Joi.object({
  nombre: Joi.string().trim().min(1).max(255).required(),
  apellido: Joi.string().trim().min(1).max(255).required(),
  tipo_doc: Joi.string().trim().allow("", null).max(20),
  dni: Joi.string().trim().allow("", null).max(20),
  email: Joi.string().trim().email().max(255).required(),
  password: Joi.string().min(6).max(255).required(),
});

const updateClienteSchema = Joi.object({
  nombre: Joi.string().trim().min(1).max(255),
  apellido: Joi.string().trim().min(1).max(255),
  tipo_doc: Joi.string().trim().allow("", null).max(20),
  dni: Joi.string().trim().allow("", null).max(20),
}).min(1);

const cambiarPasswordSchema = Joi.object({
  passwordActual: Joi.string().min(1).max(255).required(),
  passwordNueva: Joi.string().min(6).max(255).required(),
});

module.exports = { createClienteSchema, updateClienteSchema, cambiarPasswordSchema };
