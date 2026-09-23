const Joi = require("joi");

const ESTADOS = ["activa", "inactiva", "cerrada"];

const createSucursalSchema = Joi.object({
  nombre: Joi.string().trim().min(1).max(255).required(),
  estado: Joi.string().valid(...ESTADOS),
  telefono: Joi.string().trim().allow("", null).max(50),
  horario: Joi.string().trim().allow("", null).max(100),
  calle: Joi.string().trim().min(1).max(255).required(),
  altura: Joi.string().trim().min(1).max(50).required(),
  ciudad: Joi.string().trim().min(1).max(255).required(),
  provincia: Joi.string().trim().min(1).max(255).required(),
  latitud: Joi.number().min(-90).max(90).allow(null),
  longitud: Joi.number().min(-180).max(180).allow(null),
});

const updateSucursalSchema = Joi.object({
  nombre: Joi.string().trim().min(1).max(255),
  estado: Joi.string().valid(...ESTADOS),
  telefono: Joi.string().trim().allow("", null).max(50),
  horario: Joi.string().trim().allow("", null).max(100),
  calle: Joi.string().trim().min(1).max(255),
  altura: Joi.string().trim().min(1).max(50),
  ciudad: Joi.string().trim().min(1).max(255),
  provincia: Joi.string().trim().min(1).max(255),
  latitud: Joi.number().min(-90).max(90).allow(null),
  longitud: Joi.number().min(-180).max(180).allow(null),
}).min(1);

module.exports = { createSucursalSchema, updateSucursalSchema };
