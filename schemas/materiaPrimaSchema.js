const Joi = require("joi");

const ESTADOS = ["disponible", "no_disponible"];

const createMateriaPrimaSchema = Joi.object({
  nombre: Joi.string().trim().min(1).max(255).required(),
  estado: Joi.string().valid(...ESTADOS),
  stock_minimo: Joi.number().integer().min(0),
});

const updateMateriaPrimaSchema = Joi.object({
  nombre: Joi.string().trim().min(1).max(255),
  estado: Joi.string().valid(...ESTADOS),
  stock_minimo: Joi.number().integer().min(0),
}).min(1);

module.exports = { createMateriaPrimaSchema, updateMateriaPrimaSchema };
