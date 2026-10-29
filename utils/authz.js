const esAdmin = (user) => user?.rol === "ADMIN";
const esEmpleado = (user) => user?.rol === "EMPLEADO";
const esStaff = (user) => esAdmin(user) || esEmpleado(user);
const esCliente = (user) => user?.rol === "CLIENTE";

const sucursalPermitida = (user, idSucursal) => {
  if (esAdmin(user)) return true;
  if (!esEmpleado(user) || !user.id_sucursal) return false;
  if (idSucursal === undefined || idSucursal === null || idSucursal === "") return true;
  return Number(user.id_sucursal) === Number(idSucursal);
};

const clientePermitido = (user, idCliente) =>
  esAdmin(user) || (esCliente(user) && Number(user.id_cliente) === Number(idCliente));

const pedidoPermitido = (user, pedido) => {
  if (!user || !pedido) return false;
  if (esAdmin(user)) return true;
  if (esCliente(user)) return Number(pedido.id_cliente) === Number(user.id_cliente);
  if (esEmpleado(user)) {
    return !!user.id_sucursal && Number(pedido.id_sucursal) === Number(user.id_sucursal);
  }
  return false;
};

module.exports = { esAdmin, esEmpleado, esStaff, esCliente, sucursalPermitida, clientePermitido, pedidoPermitido };
