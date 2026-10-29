const { Cliente, Empleado } = require("../../models");
const { hashPassword } = require("../../utils/password");
const { firmarToken } = require("../../utils/jwt");

let secuencia = 0;

const emailUnico = (prefijo) => {
  secuencia += 1;
  return `${prefijo}.${Date.now()}.${secuencia}@example.com`;
};

const crearCliente = async ({ email, password = "secreto123", ...datos } = {}) => {
  const cliente = await Cliente.create({
    nombre: "Cliente",
    apellido: "Test",
    email: email || emailUnico("cliente"),
    password: await hashPassword(password),
    ...datos,
  });
  const token = firmarToken({ id_cliente: cliente.id_cliente, rol: "CLIENTE" });
  return { cliente, token };
};

const crearEmpleado = async ({
  email,
  password = "secreto123",
  rol = "EMPLEADO",
  id_sucursal = null,
  ...datos
} = {}) => {
  const empleado = await Empleado.create({
    nombre: "Empleado",
    apellido: "Test",
    rol,
    email: email || emailUnico("empleado"),
    password: await hashPassword(password),
    id_sucursal,
    ...datos,
  });
  const token = firmarToken({ id_empleado: empleado.id_empleado, rol });
  return { empleado, token };
};

module.exports = { crearCliente, crearEmpleado, emailUnico };
