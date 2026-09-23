const { Opcional, Producto } = require("../models");

const getOpcionalesByProducto = async (req, res, next) => {
  try {
    const producto = await Producto.findByPk(req.params.id);
    if (!producto) return res.status(404).json({ error: "Producto no encontrado" });
    const opcionales = await Opcional.findAll({
      where: { id_producto: req.params.id },
      order: [["id_opcional", "ASC"]],
    });
    res.json(opcionales);
  } catch (err) { next(err); }
};

const getAllOpcionales = async (req, res, next) => {
  try {
    const opcionales = await Opcional.findAll({ order: [["id_opcional", "ASC"]], include: [{ model: Producto, as: "producto", attributes: ["id_producto", "nombre"] }] });
    res.json(opcionales);
  } catch (err) { next(err); }
};

const createOpcional = async (req, res, next) => {
  try {
    const { nombre, descripcion, precio, estado } = req.body;
    const id_producto = req.params.id || req.body.id_producto;
    if (!nombre || !id_producto) return res.status(400).json({ error: "nombre e id_producto son obligatorios" });
    const producto = await Producto.findByPk(id_producto);
    if (!producto) return res.status(404).json({ error: "Producto no encontrado" });
    const opcional = await Opcional.create({ nombre, descripcion, precio: precio ?? 0, estado, id_producto });
    res.status(201).json(opcional);
  } catch (err) { next(err); }
};

const updateOpcional = async (req, res, next) => {
  try {
    const opcional = await Opcional.findByPk(req.params.opcionalId || req.params.id);
    if (!opcional) return res.status(404).json({ error: "Opcional no encontrado" });
    const permitidos = ["nombre", "descripcion", "precio", "estado"];
    const datos = {};
    for (const k of permitidos) if (req.body[k] !== undefined) datos[k] = req.body[k];
    if (Object.keys(datos).length === 0) return res.status(400).json({ error: "No se enviaron campos para actualizar" });
    await opcional.update(datos);
    res.json(opcional);
  } catch (err) { next(err); }
};

const deleteOpcional = async (req, res, next) => {
  try {
    const opcional = await Opcional.findByPk(req.params.opcionalId || req.params.id);
    if (!opcional) return res.status(404).json({ error: "Opcional no encontrado" });
    await opcional.destroy();
    res.json({ mensaje: "Opcional eliminado" });
  } catch (err) {
    if (err.name === "SequelizeForeignKeyConstraintError") {
      return res.status(409).json({ error: "No se puede eliminar opcional con pedidos asociados" });
    }
    next(err);
  }
};

module.exports = { getOpcionalesByProducto, getAllOpcionales, createOpcional, updateOpcional, deleteOpcional };
