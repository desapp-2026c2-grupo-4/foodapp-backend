const Joi = require("joi");

const createDireccionSchema = Joi.object({
  calle: Joi.string().trim().min(1).max(255).required(),
  altura: Joi.string().trim().min(1).max(50).required(),
  piso: Joi.string().trim().allow("", null).max(20),
  departamento: Joi.string().trim().allow("", null).max(20),
  ciudad: Joi.string().trim().min(1).max(255).required(),
  provincia: Joi.string().trim().min(1).max(255).required(),
  codigo_postal: Joi.string().trim().allow("", null).max(20),
  latitud: Joi.number().min(-90).max(90).required(),
  longitud: Joi.number().min(-180).max(180).required(),
});

module.exports = { createDireccionSchema };
