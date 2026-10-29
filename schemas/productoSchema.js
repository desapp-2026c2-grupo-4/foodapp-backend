const Joi = require("joi");

const ESTADOS = ["disponible", "no_disponible", "pausado"];

const materiaPrimaItem = Joi.object({
  id_materia_prima: Joi.number().integer().positive().required(),
  cantidad: Joi.number().integer().min(1).required(),
});

const createProductoSchema = Joi.object({
  nombre: Joi.string().trim().min(1).max(255).required(),
  descripcion: Joi.string().trim().allow("", null),
  precio: Joi.number().min(0).required(),
  imagen: Joi.string().trim().allow("", null).max(500),
  estado: Joi.string().valid(...ESTADOS),
  categorias: Joi.array().items(Joi.number().integer().positive()),
  materiasPrimas: Joi.array().items(materiaPrimaItem),
});

const updateProductoSchema = Joi.object({
  nombre: Joi.string().trim().min(1).max(255),
  descripcion: Joi.string().trim().allow("", null),
  precio: Joi.number().min(0),
  imagen: Joi.string().trim().allow("", null).max(500),
  estado: Joi.string().valid(...ESTADOS),
  categorias: Joi.array().items(Joi.number().integer().positive()),
  materiasPrimas: Joi.array().items(materiaPrimaItem),
}).min(1);

module.exports = { createProductoSchema, updateProductoSchema };
