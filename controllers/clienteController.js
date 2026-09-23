const { Cliente, Direccion } = require("../models");

const getClientes = async (req, res, next) => {
  try {
    const clientes = await Cliente.findAll({
      attributes: ["id_cliente", "nombre", "apellido", "tipo_doc", "dni", "email"],
      include: [{ model: Direccion, as: "direcciones" }],
      order: [["id_cliente", "ASC"]],
    });
    res.json(clientes);
  } catch (err) { next(err); }
};

const getClienteById = async (req, res, next) => {
  try {
    const cliente = await Cliente.findByPk(req.params.id, {
      attributes: ["id_cliente", "nombre", "apellido", "tipo_doc", "dni", "email"],
      include: [{ model: Direccion, as: "direcciones" }],
    });
    if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });
    res.json(cliente);
  } catch (err) { next(err); }
};

const createCliente = async (req, res, next) => {
  try {
    const { nombre, apellido, tipo_doc, dni, email, password } = req.body;
    const existente = await Cliente.findOne({ where: { email } });
    if (existente) return res.status(409).json({ error: "El email ya está registrado" });
    const cliente = await Cliente.create({ nombre, apellido, tipo_doc, dni, email, password });
    const creado = await Cliente.findByPk(cliente.id_cliente, {
      attributes: ["id_cliente", "nombre", "apellido", "tipo_doc", "dni", "email"],
      include: [{ model: Direccion, as: "direcciones" }],
    });
    res.status(201).json(creado);
  } catch (err) { next(err); }
};

const updateCliente = async (req, res, next) => {
  try {
    const cliente = await Cliente.findByPk(req.params.id);
    if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });
    const permitidos = ["nombre", "apellido", "tipo_doc", "dni", "email"];
    const datos = {};
    for (const k of permitidos) if (req.body[k] !== undefined) datos[k] = req.body[k];
    if (Object.keys(datos).length === 0) return res.status(400).json({ error: "No se enviaron campos para actualizar" });
    await cliente.update(datos);
    const actualizado = await Cliente.findByPk(cliente.id_cliente, {
      attributes: ["id_cliente", "nombre", "apellido", "tipo_doc", "dni", "email"],
      include: [{ model: Direccion, as: "direcciones" }],
    });
    res.json(actualizado);
  } catch (err) { next(err); }
};

module.exports = { getClientes, getClienteById, createCliente, updateCliente };
