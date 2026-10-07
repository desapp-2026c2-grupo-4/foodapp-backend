const Joi = require("joi");

const agregarStockSchema = Joi.object({
  id_sucursal: Joi.number().integer().positive().required(),
  id_producto: Joi.number().integer().positive().required(),
  cantidad: Joi.number().integer().min(1).required(),
});

module.exports = { agregarStockSchema };
