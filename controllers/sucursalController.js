const { Sucursal, Producto } = require("../models");

const getSucursales = async (req, res, next) => {
  try {
    const sucursales = await Sucursal.findAll({
      include: [{ model: Producto, as: "productos", through: { attributes: ["stock"] } }],
      order: [["id_sucursal", "ASC"]],
    });
    res.json(sucursales);
  } catch (err) {
    next(err);
  }
};

const getSucursalById = async (req, res, next) => {
  try {
    const sucursal = await Sucursal.findByPk(req.params.id, {
      include: [{ model: Producto, as: "productos", through: { attributes: ["stock"] } }],
    });
    if (!sucursal) return res.status(404).json({ error: "Sucursal no encontrada" });
    res.json(sucursal);
  } catch (err) {
    next(err);
  }
};

const updateSucursal = async (req, res, next) => {
  try {
    const sucursal = await Sucursal.findByPk(req.params.id);
    if (!sucursal) return res.status(404).json({ error: "Sucursal no encontrada" });

    const permitidos = ["nombre", "estado", "telefono", "horario", "calle", "altura", "ciudad", "provincia", "latitud", "longitud"];
    const datos = {};
    for (const key of permitidos) {
      if (req.body[key] !== undefined) datos[key] = req.body[key];
    }
    if (Object.keys(datos).length === 0) {
      return res.status(400).json({ error: "No se enviaron campos para actualizar" });
    }

    await sucursal.update(datos);
    const actualizado = await Sucursal.findByPk(sucursal.id_sucursal, {
      include: [{ model: Producto, as: "productos", through: { attributes: ["stock"] } }],
    });
    res.json(actualizado);
  } catch (err) {
    next(err);
  }
};

const createSucursal = async (req, res, next) => {
  try {
    const { nombre, estado, telefono, horario, calle, altura, ciudad, provincia, latitud, longitud } = req.body;
    if (!nombre || !calle || !altura || !ciudad || !provincia) {
      return res.status(400).json({ error: "nombre, calle, altura, ciudad y provincia son obligatorios" });
    }
    const sucursal = await Sucursal.create({ nombre, estado, telefono, horario, calle, altura, ciudad, provincia, latitud, longitud });
    const creada = await Sucursal.findByPk(sucursal.id_sucursal, {
      include: [{ model: Producto, as: "productos", through: { attributes: ["stock"] } }],
    });
    res.status(201).json(creada);
  } catch (err) {
    next(err);
  }
};

const deleteSucursal = async (req, res, next) => {
  try {
    const sucursal = await Sucursal.findByPk(req.params.id);
    if (!sucursal) return res.status(404).json({ error: "Sucursal no encontrada" });
    await sucursal.destroy();
    res.json({ mensaje: "Sucursal eliminada" });
  } catch (err) {
    if (err.name === "SequelizeForeignKeyConstraintError") {
      return res.status(409).json({ error: "No se puede eliminar sucursal con pedidos/productos asociados" });
    }
    next(err);
  }
};

module.exports = { getSucursales, getSucursalById, updateSucursal, createSucursal, deleteSucursal };
