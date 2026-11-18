const Joi = require("joi");
const { esFechaISO } = require("../utils/dates");

const fechaISO = Joi.string().custom((value, helpers) => {
  if (!esFechaISO(value)) return helpers.error("date.format");
  return value;
}, "fecha ISO YYYY-MM-DD");

const reporteQuerySchema = Joi.object({
  id_sucursal: Joi.number().integer().positive(),
  desde: fechaISO,
  hasta: fechaISO,
  limite: Joi.number().integer().min(1).max(500),
  dias: Joi.number().integer().min(1).max(3650),
  agrupacion: Joi.string().valid("dia", "semana", "mes").default("dia"),
}).unknown(true);

module.exports = { reporteQuerySchema };
