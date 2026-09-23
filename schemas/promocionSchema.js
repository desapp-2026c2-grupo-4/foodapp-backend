const Joi = require("joi");

const productoItem = Joi.object({
  id_producto: Joi.number().integer().positive().required(),
  cantidad: Joi.number().integer().min(1).required(),
});

const createPromocionSchema = Joi.object({
  nombre: Joi.string().trim().min(1).max(255).required(),
  descripcion: Joi.string().trim().allow("", null),
  imagen: Joi.string().trim().allow("", null).max(500),
  tipo: Joi.string().valid("PRECIO_FIJO", "PORCENTAJE", "DOS_POR_UNO").required(),
  valor: Joi.number().min(0).required(),
  fecha_inicio: Joi.date().iso().required(),
  fecha_fin: Joi.date().iso().required(),
  activa: Joi.boolean(),
  productos: Joi.array().items(productoItem).min(1).required(),
});

const updatePromocionSchema = Joi.object({
  nombre: Joi.string().trim().min(1).max(255),
  descripcion: Joi.string().trim().allow("", null),
  imagen: Joi.string().trim().allow("", null).max(500),
  tipo: Joi.string().valid("PRECIO_FIJO", "PORCENTAJE", "DOS_POR_UNO"),
  valor: Joi.number().min(0),
  fecha_inicio: Joi.date().iso(),
  fecha_fin: Joi.date().iso(),
  activa: Joi.boolean(),
  productos: Joi.array().items(productoItem).min(1),
}).min(1);

module.exports = { createPromocionSchema, updatePromocionSchema };
