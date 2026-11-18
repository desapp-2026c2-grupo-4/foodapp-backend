const Joi = require("joi");

const agregarStockSchema = Joi.object({
  id_sucursal: Joi.number().integer().positive().required(),
  id_materia_prima: Joi.number().integer().positive().required(),
  cantidad: Joi.number().integer().min(1).required(),
});

const reducirStockSchema = Joi.object({
  id_sucursal: Joi.number().integer().positive().required(),
  id_materia_prima: Joi.number().integer().positive().required(),
  cantidad: Joi.number().integer().min(1).required(),
  motivo: Joi.string().trim().min(3).max(255).required(),
});

module.exports = { agregarStockSchema, reducirStockSchema };
