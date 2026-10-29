const { MateriaPrima } = require("../models");

const getMateriasPrimas = async (req, res, next) => {
  try {
    const materias = await MateriaPrima.findAll({ order: [["id_materia_prima", "ASC"]] });
    res.json(materias);
  } catch (err) {
    next(err);
  }
};

const getMateriaPrimaById = async (req, res, next) => {
  try {
    const materia = await MateriaPrima.findByPk(req.params.id);
    if (!materia) return res.status(404).json({ error: "Materia prima no encontrada" });
    res.json(materia);
  } catch (err) {
    next(err);
  }
};

const createMateriaPrima = async (req, res, next) => {
  try {
    const { nombre, estado, stock_minimo } = req.body;
    // Si existe una materia prima dada de baja con el mismo nombre, se reutiliza (reactiva)
    const existente = await MateriaPrima.findOne({ where: { nombre }, paranoid: false });
    if (existente) {
      if (existente.deletedAt) {
        await existente.restore();
        await existente.update({
          estado: estado || existente.estado,
          stock_minimo: stock_minimo !== undefined ? stock_minimo : existente.stock_minimo,
        });
        return res.status(201).json(existente);
      }
      return res.status(409).json({ error: "Ya existe una materia prima con ese nombre" });
    }
    const materia = await MateriaPrima.create({ nombre, estado, stock_minimo });
    res.status(201).json(materia);
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ error: "Ya existe una materia prima con ese nombre" });
    }
    next(err);
  }
};

const updateMateriaPrima = async (req, res, next) => {
  try {
    const materia = await MateriaPrima.findByPk(req.params.id);
    if (!materia) return res.status(404).json({ error: "Materia prima no encontrada" });
    const permitidos = ["nombre", "estado", "stock_minimo"];
    const datos = {};
    for (const key of permitidos) {
      if (req.body[key] !== undefined) datos[key] = req.body[key];
    }
    await materia.update(datos);
    res.json(materia);
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ error: "Ya existe una materia prima con ese nombre" });
    }
    next(err);
  }
};

const deleteMateriaPrima = async (req, res, next) => {
  try {
    const materia = await MateriaPrima.findByPk(req.params.id);
    if (!materia) return res.status(404).json({ error: "Materia prima no encontrada" });
    await materia.destroy();
    res.json({ mensaje: "Materia prima dada de baja" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMateriasPrimas,
  getMateriaPrimaById,
  createMateriaPrima,
  updateMateriaPrima,
  deleteMateriaPrima,
};
