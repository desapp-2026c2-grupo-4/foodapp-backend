const { Cliente, Empleado, Direccion, Sucursal } = require("../models");
const { hashPassword, verificarPassword, esHashBcrypt } = require("../utils/password");
const { firmarToken } = require("../utils/jwt");

const error = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const clientePublico = (c) => ({
  id_cliente: c.id_cliente,
  nombre: c.nombre,
  apellido: c.apellido,
  tipo_doc: c.tipo_doc,
  dni: c.dni,
  email: c.email,
  direcciones: c.direcciones || [],
  rol: "CLIENTE",
  tipo: "cliente",
});

const empleadoPublico = (e) => ({
  id_empleado: e.id_empleado,
  nombre: e.nombre,
  apellido: e.apellido,
  email: e.email,
  id_sucursal: e.id_sucursal,
  sucursal: e.sucursal || null,
  rol: e.rol,
  tipo: "empleado",
});

// Migra contraseñas en texto plano (datos previos al hashing) al primer login exitoso
const migrarHashSiHaceFalta = async (registro, passwordPlana) => {
  if (!esHashBcrypt(registro.password)) {
    await registro.update({ password: await hashPassword(passwordPlana) });
  }
};

// El registro público siempre crea CLIENTES (tabla clientes, sin campo rol)
const register = async ({ nombre, apellido, tipo_doc, dni, email, password }) => {
  const [clienteExistente, empleadoExistente] = await Promise.all([
    Cliente.findOne({ where: { email } }),
    Empleado.findOne({ where: { email } }),
  ]);
  if (clienteExistente || empleadoExistente) throw error(409, "El email ya está registrado");
  const cliente = await Cliente.create({
    nombre,
    apellido,
    tipo_doc: tipo_doc || null,
    dni: dni || null,
    email,
    password: await hashPassword(password),
  });
  const creado = await Cliente.findByPk(cliente.id_cliente, {
    include: [{ model: Direccion, as: "direcciones" }],
  });
  const user = clientePublico(creado);
  const token = firmarToken({ id_cliente: user.id_cliente, rol: "CLIENTE" });
  return { token, user };
};

const login = async ({ email, password }) => {
  const cliente = await Cliente.findOne({
    where: { email },
    include: [{ model: Direccion, as: "direcciones" }],
  });
  if (cliente) {
    if (!(await verificarPassword(password, cliente.password))) throw error(401, "Credenciales inválidas");
    await migrarHashSiHaceFalta(cliente, password);
    const user = clientePublico(cliente);
    const token = firmarToken({ id_cliente: user.id_cliente, rol: "CLIENTE" });
    return { token, user };
  }
  const empleado = await Empleado.findOne({
    where: { email },
    include: [{ model: Sucursal, as: "sucursal" }],
  });
  if (empleado) {
    if (!(await verificarPassword(password, empleado.password))) throw error(401, "Credenciales inválidas");
    await migrarHashSiHaceFalta(empleado, password);
    const user = empleadoPublico(empleado);
    const token = firmarToken({ id_empleado: user.id_empleado, rol: user.rol });
    return { token, user };
  }
  throw error(401, "Credenciales inválidas");
};

module.exports = { register, login };
