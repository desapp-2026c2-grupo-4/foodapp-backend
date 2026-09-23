const { Promocion, Producto } = require("../models");
const promocionService = require("../services/promocionService");

const includeProductos = [{ model: Producto, as: "productos", through: { attributes: ["cantidad"] } }];

const getPromociones = async (req, res, next) => {
  try {
    const promociones = await Promocion.findAll({
      include: includeProductos,
      order: [["id_promocion", "ASC"]],
    });
    res.json(promociones.map((p) => ({ ...p.toJSON(), vigente: promocionService.estaVigente(p) })));
  } catch (err) { next(err); }
};

const getPromocionById = async (req, res, next) => {
  try {
    const promocion = await promocionService.fetchCompleta(req.params.id);
    if (!promocion) return res.status(404).json({ error: "Promoción no encontrada" });
    res.json({ ...promocion.toJSON(), vigente: promocionService.estaVigente(promocion) });
  } catch (err) { next(err); }
};

const createPromocion = async (req, res, next) => {
  try {
    const creada = await promocionService.crearPromocion(req.body);
    res.status(201).json(creada);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

const updatePromocion = async (req, res, next) => {
  try {
    const actualizada = await promocionService.modificarPromocion(req.params.id, req.body);
    res.json(actualizada);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

const deletePromocion = async (req, res, next) => {
  try {
    const promocion = await Promocion.findByPk(req.params.id);
    if (!promocion) return res.status(404).json({ error: "Promoción no encontrada" });
    await promocion.destroy();
    res.json({ mensaje: "Promoción eliminada" });
  } catch (err) { next(err); }
};

module.exports = { getPromociones, getPromocionById, createPromocion, updatePromocion, deletePromocion };
