const Joi = require("joi");

const createCategoriaSchema = Joi.object({
  nombre: Joi.string().trim().min(1).max(255).required(),
});

const updateCategoriaSchema = Joi.object({
  nombre: Joi.string().trim().min(1).max(255),
}).min(1);

module.exports = { createCategoriaSchema, updateCategoriaSchema };
