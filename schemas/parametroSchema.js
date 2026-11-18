const Joi = require("joi");

const updateParametrosSchema = Joi.object({
  tiempo_base_entrega_min: Joi.number().integer().min(1).max(240),
  velocidad_urbana_kmh: Joi.number().integer().min(1).max(200),
  radio_cobertura_default_km: Joi.number().min(0.1).max(100),
  stock_minimo_default: Joi.number().integer().min(0).max(1000000),
  historial_reducciones_limit: Joi.number().integer().min(1).max(100),
  dias_cliente_inactivo: Joi.number().integer().min(1).max(365),
  pedidos_cliente_recurrente: Joi.number().integer().min(1).max(100),
  reporte_dias_default: Joi.number().integer().min(1).max(3650),
  reporte_dias_max: Joi.number().integer().min(1).max(3650),
  reporte_limite_default: Joi.number().integer().min(1).max(100),
  reporte_limite_max: Joi.number().integer().min(1).max(500),
  reporte_cancelados_limit: Joi.number().integer().min(1).max(500),
}).min(1);

module.exports = { updateParametrosSchema };
