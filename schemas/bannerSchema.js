const Joi = require("joi");

const createBannerSchema = Joi.object({
  titulo: Joi.string().trim().min(1).max(255).required(),
  descripcion: Joi.string().trim().allow("", null),
  imagen: Joi.string().trim().min(1).max(500).required(),
  activo: Joi.boolean(),
  orden: Joi.number().integer().min(0),
});

const updateBannerSchema = Joi.object({
  titulo: Joi.string().trim().min(1).max(255),
  descripcion: Joi.string().trim().allow("", null),
  imagen: Joi.string().trim().min(1).max(500),
  activo: Joi.boolean(),
  orden: Joi.number().integer().min(0),
}).min(1);

module.exports = { createBannerSchema, updateBannerSchema };
