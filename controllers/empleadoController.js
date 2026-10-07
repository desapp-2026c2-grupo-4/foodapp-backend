const { Empleado, Cliente, Sucursal } = require("../models");
const { hashPassword } = require("../utils/password");

const SIN_PASSWORD = ["id_empleado", "nombre", "apellido", "rol", "email", "id_sucursal"];

const emailEnUso = async (email, excluirId = null) => {
  if (!email) return false;
  const [enEmpleados, enClientes] = await Promise.all([
    Empleado.findOne({ where: { email } }),
    Cliente.findOne({ where: { email } }),
  ]);
  if (enEmpleados && enEmpleados.id_empleado !== excluirId) return true;
  return !!enClientes;
};

const getEmpleados = async (req, res, next) => {
  try {
    const empleados = await Empleado.findAll({
      attributes: SIN_PASSWORD,
      include: [{ model: Sucursal, as: "sucursal" }],
      order: [["id_empleado", "ASC"]],
    });
    res.json(empleados);
  } catch (err) { next(err); }
};

const getEmpleadoById = async (req, res, next) => {
  try {
    const empleado = await Empleado.findByPk(req.params.id, {
      attributes: SIN_PASSWORD,
      include: [{ model: Sucursal, as: "sucursal" }],
    });
    if (!empleado) return res.status(404).json({ error: "Empleado no encontrado" });
    res.json(empleado);
  } catch (err) { next(err); }
};

const createEmpleado = async (req, res, next) => {
  try {
    const { nombre, apellido, rol, email, password, id_sucursal } = req.body;
    if (await emailEnUso(email)) return res.status(409).json({ error: "El email ya está registrado" });
    if (id_sucursal) {
      const sucursal = await Sucursal.findByPk(id_sucursal);
      if (!sucursal) return res.status(404).json({ error: "Sucursal no encontrada" });
    }
    const empleado = await Empleado.create({
      nombre,
      apellido,
      rol,
      email: email || null,
      password: await hashPassword(password),
      id_sucursal: id_sucursal || null,
    });
    const creado = await Empleado.findByPk(empleado.id_empleado, {
      attributes: SIN_PASSWORD,
      include: [{ model: Sucursal, as: "sucursal" }],
    });
    res.status(201).json(creado);
  } catch (err) { next(err); }
};

const updateEmpleado = async (req, res, next) => {
  try {
    const empleado = await Empleado.findByPk(req.params.id);
    if (!empleado) return res.status(404).json({ error: "Empleado no encontrado" });
    const permitidos = ["nombre", "apellido", "rol", "email", "id_sucursal"];
    const datos = {};
    for (const k of permitidos) if (req.body[k] !== undefined) datos[k] = req.body[k];
    if (req.body.password) datos.password = await hashPassword(req.body.password);
    if (Object.keys(datos).length === 0) return res.status(400).json({ error: "No se enviaron campos para actualizar" });
    if (datos.email && (await emailEnUso(datos.email, empleado.id_empleado))) {
      return res.status(409).json({ error: "El email ya está registrado" });
    }
    if (datos.id_sucursal) {
      const sucursal = await Sucursal.findByPk(datos.id_sucursal);
      if (!sucursal) return res.status(404).json({ error: "Sucursal no encontrada" });
    }
    await empleado.update(datos);
    const actualizado = await Empleado.findByPk(empleado.id_empleado, {
      attributes: SIN_PASSWORD,
      include: [{ model: Sucursal, as: "sucursal" }],
    });
    res.json(actualizado);
  } catch (err) { next(err); }
};

const deleteEmpleado = async (req, res, next) => {
  try {
    const empleado = await Empleado.findByPk(req.params.id);
    if (!empleado) return res.status(404).json({ error: "Empleado no encontrado" });
    await empleado.destroy();
    res.json({ mensaje: "Empleado eliminado" });
  } catch (err) {
    if (err.name === "SequelizeForeignKeyConstraintError") {
      return res.status(409).json({ error: "No se puede eliminar el empleado" });
    }
    next(err);
  }
};

module.exports = { getEmpleados, getEmpleadoById, createEmpleado, updateEmpleado, deleteEmpleado };
