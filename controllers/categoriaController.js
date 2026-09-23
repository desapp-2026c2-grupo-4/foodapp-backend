const { Categoria, Producto } = require("../models");

const getCategorias = async (req, res, next) => {
  try {
    const categorias = await Categoria.findAll({
      include: [{ model: Producto, as: "productos", attributes: ["id_producto", "nombre"], through: { attributes: [] } }],
      order: [["id_categoria", "ASC"]],
    });
    res.json(categorias);
  } catch (err) {
    next(err);
  }
};

const getCategoriaById = async (req, res, next) => {
  try {
    const categoria = await Categoria.findByPk(req.params.id, {
      include: [{ model: Producto, as: "productos", attributes: ["id_producto", "nombre"], through: { attributes: [] } }],
    });
    if (!categoria) return res.status(404).json({ error: "Categoría no encontrada" });
    res.json(categoria);
  } catch (err) {
    next(err);
  }
};

const createCategoria = async (req, res, next) => {
  try {
    const { nombre } = req.body;
    const categoria = await Categoria.create({ nombre });
    res.status(201).json(categoria);
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ error: "Ya existe una categoría con ese nombre" });
    }
    next(err);
  }
};

const updateCategoria = async (req, res, next) => {
  try {
    const categoria = await Categoria.findByPk(req.params.id);
    if (!categoria) return res.status(404).json({ error: "Categoría no encontrada" });
    await categoria.update({ nombre: req.body.nombre });
    res.json(categoria);
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ error: "Ya existe una categoría con ese nombre" });
    }
    next(err);
  }
};

const deleteCategoria = async (req, res, next) => {
  try {
    const categoria = await Categoria.findByPk(req.params.id);
    if (!categoria) return res.status(404).json({ error: "Categoría no encontrada" });
    await categoria.destroy();
    res.json({ mensaje: "Categoría eliminada" });
  } catch (err) {
    if (err.name === "SequelizeForeignKeyConstraintError") {
      return res.status(409).json({ error: "No se puede eliminar la categoría porque tiene productos asociados" });
    }
    next(err);
  }
};

module.exports = { getCategorias, getCategoriaById, createCategoria, updateCategoria, deleteCategoria };
