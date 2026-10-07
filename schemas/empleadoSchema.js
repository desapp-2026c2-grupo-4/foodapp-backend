const Joi = require("joi");

const ROLES = ["ADMIN", "REPARTIDOR", "EMPLEADO"];

// El administrador elige el rol al crear (incluye otros administradores)
const createEmpleadoSchema = Joi.object({
  nombre: Joi.string().trim().min(1).max(255).required(),
  apellido: Joi.string().trim().min(1).max(255).required(),
  rol: Joi.string().valid(...ROLES).required(),
  email: Joi.string().trim().email().max(255).allow(null),
  password: Joi.string().min(6).max(255).required(),
  id_sucursal: Joi.number().integer().positive().allow(null),
});

const updateEmpleadoSchema = Joi.object({
  nombre: Joi.string().trim().min(1).max(255),
  apellido: Joi.string().trim().min(1).max(255),
  rol: Joi.string().valid(...ROLES),
  email: Joi.string().trim().email().max(255).allow(null),
  password: Joi.string().min(6).max(255),
  id_sucursal: Joi.number().integer().positive().allow(null),
}).min(1);

module.exports = { createEmpleadoSchema, updateEmpleadoSchema };
