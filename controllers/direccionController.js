const { Cliente, Direccion } = require("../models");

const getDireccionesByCliente = async (req, res, next) => {
  try {
    const cliente = await Cliente.findByPk(req.params.id);
    if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });
    const direcciones = await Direccion.findAll({
      where: { id_cliente: req.params.id },
      order: [["id_direccion", "ASC"]],
    });
    res.json(direcciones);
  } catch (err) { next(err); }
};

const createDireccion = async (req, res, next) => {
  try {
    const cliente = await Cliente.findByPk(req.params.id);
    if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });
    const { calle, altura, piso, departamento, ciudad, provincia, codigo_postal, latitud, longitud } = req.body;
    const direccion = await Direccion.create({
      calle,
      altura,
      piso: piso || null,
      departamento: departamento || null,
      ciudad,
      provincia,
      codigo_postal: codigo_postal || null,
      latitud,
      longitud,
      id_cliente: req.params.id,
    });
    res.status(201).json(direccion);
  } catch (err) { next(err); }
};

const deleteDireccion = async (req, res, next) => {
  try {
    const direccion = await Direccion.findOne({
      where: { id_direccion: req.params.idDireccion, id_cliente: req.params.id },
    });
    if (!direccion) return res.status(404).json({ error: "Dirección no encontrada" });
    await direccion.destroy();
    res.json({ mensaje: "Dirección dada de baja" });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDireccionesByCliente, createDireccion, deleteDireccion };
