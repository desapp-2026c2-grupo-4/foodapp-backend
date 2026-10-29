const Joi = require("joi");

const ESTADOS = ["activa", "inactiva", "cerrada"];
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

const horarioSchema = Joi.object({
  dia_semana: Joi.number().integer().min(1).max(7).required(),
  hora_apertura: Joi.string().pattern(HORA).required(),
  hora_cierre: Joi.string().pattern(HORA).required(),
}).custom((value, helpers) => {
  if (value.hora_apertura === value.hora_cierre) {
    return helpers.message("hora_apertura y hora_cierre no pueden ser iguales");
  }
  return value;
});

const horariosSchema = Joi.array().items(horarioSchema).unique("dia_semana").max(7);

const createSucursalSchema = Joi.object({
  nombre: Joi.string().trim().min(1).max(255).required(),
  estado: Joi.string().valid(...ESTADOS),
  telefono: Joi.string().trim().allow("", null).max(50),
  horarios: horariosSchema,
  calle: Joi.string().trim().min(1).max(255).required(),
  altura: Joi.string().trim().min(1).max(50).required(),
  ciudad: Joi.string().trim().min(1).max(255).required(),
  provincia: Joi.string().trim().min(1).max(255).required(),
  codigo_postal: Joi.string().trim().allow("", null).max(20),
  latitud: Joi.number().min(-90).max(90).allow(null),
  longitud: Joi.number().min(-180).max(180).allow(null),
  radio_km: Joi.number().min(0.1).max(100),
});

const updateSucursalSchema = Joi.object({
  nombre: Joi.string().trim().min(1).max(255),
  estado: Joi.string().valid(...ESTADOS),
  telefono: Joi.string().trim().allow("", null).max(50),
  horarios: horariosSchema,
  calle: Joi.string().trim().min(1).max(255),
  altura: Joi.string().trim().min(1).max(50),
  ciudad: Joi.string().trim().min(1).max(255),
  provincia: Joi.string().trim().min(1).max(255),
  codigo_postal: Joi.string().trim().allow("", null).max(20),
  latitud: Joi.number().min(-90).max(90).allow(null),
  longitud: Joi.number().min(-180).max(180).allow(null),
  radio_km: Joi.number().min(0.1).max(100),
}).min(1);

module.exports = { createSucursalSchema, updateSucursalSchema };
