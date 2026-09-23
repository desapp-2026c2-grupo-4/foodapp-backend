const Joi = require("joi");

const ESTADOS = ["Pendiente", "Confirmado", "Preparando", "Listo", "En camino", "Entregado", "Cancelado"];

const detalleSchema = Joi.object({
  id_producto: Joi.number().integer().positive(),
  id_promocion: Joi.number().integer().positive(),
  cantidad: Joi.number().integer().min(1).required(),
  observaciones: Joi.string().trim().allow("", null),
  opcionales: Joi.array().items(Joi.number().integer().positive()),
}).xor("id_producto", "id_promocion");

const createPedidoSchema = Joi.object({
  id_cliente: Joi.number().integer().positive().required(),
  id_direccion: Joi.number().integer().positive().required(),
  id_sucursal: Joi.number().integer().positive().allow(null),
  estado: Joi.string().valid(...ESTADOS),
  detalles: Joi.array().items(detalleSchema).min(1).required(),
});

const updatePedidoSchema = Joi.object({
  estado: Joi.string().valid(...ESTADOS),
  id_sucursal: Joi.number().integer().positive().allow(null),
  importe: Joi.number().min(0),
}).min(1);

module.exports = { createPedidoSchema, updatePedidoSchema };
