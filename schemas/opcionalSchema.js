const Joi = require("joi");

const ESTADOS = ["disponible", "no_disponible"];

const createOpcionalSchema = Joi.object({
  nombre: Joi.string().trim().min(1).max(255).required(),
  descripcion: Joi.string().trim().allow("", null),
  precio: Joi.number().min(0),
  estado: Joi.string().valid(...ESTADOS),
  id_producto: Joi.number().integer().positive(),
});

const updateOpcionalSchema = Joi.object({
  nombre: Joi.string().trim().min(1).max(255),
  descripcion: Joi.string().trim().allow("", null),
  precio: Joi.number().min(0),
  estado: Joi.string().valid(...ESTADOS),
}).min(1);

module.exports = { createOpcionalSchema, updateOpcionalSchema };
