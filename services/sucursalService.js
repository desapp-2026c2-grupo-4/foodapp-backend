const { Sucursal, Producto, ProductoSucursal } = require("../models");
const { distanciaKm } = require("../utils/distance");
const promocionService = require("./promocionService");

function errorConStatus(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// Agrega las cantidades requeridas por producto a partir de los items del pedido
// (productos sueltos y promociones expandidas). Reutiliza las validaciones existentes.
async function calcularNecesidades(detalles, transaction) {
  const necesidades = new Map();
  const sumar = (id_producto, cantidad) => {
    necesidades.set(id_producto, (necesidades.get(id_producto) || 0) + cantidad);
  };
  for (const item of detalles) {
    if (!item.cantidad || item.cantidad < 1) {
      throw errorConStatus(400, "Cada detalle requiere cantidad >=1");
    }
    if (item.id_promocion) {
      const lineas = await promocionService.expandirPromocion(item.id_promocion, item.cantidad, transaction);
      for (const l of lineas) sumar(l.id_producto, l.cantidad);
      continue;
    }
    if (!item.id_producto) {
      throw errorConStatus(400, "Cada detalle requiere id_producto o id_promocion");
    }
    const producto = await Producto.findByPk(item.id_producto, { transaction });
    if (!producto) throw errorConStatus(404, `Producto ${item.id_producto} no encontrado`);
    sumar(item.id_producto, item.cantidad);
  }
  return necesidades;
}

async function tieneStockSuficiente(id_sucursal, necesidades, transaction) {
  for (const [id_producto, cantidad] of necesidades) {
    const fila = await ProductoSucursal.findOne({
      where: { id_sucursal, id_producto },
      transaction,
    });
    if (!fila || fila.stock < cantidad) return false;
  }
  return true;
}

/**
 * Selecciona la sucursal para un pedido: la más cercana a la dirección de
 * entrega (Haversine) entre las activas que tengan stock suficiente para
 * todo el pedido. Devuelve el id_sucursal.
 */
async function seleccionarSucursal({ direccion, detalles }, transaction) {
  if (direccion.latitud == null || direccion.longitud == null) {
    throw errorConStatus(400, "La dirección no tiene coordenadas para asignar sucursal");
  }
  if (!Array.isArray(detalles) || detalles.length === 0) {
    throw errorConStatus(400, "El pedido no tiene detalles para asignar sucursal");
  }
  const necesidades = await calcularNecesidades(detalles, transaction);

  const sucursales = await Sucursal.findAll({ where: { estado: "activa" }, transaction });
  const candidatas = [];
  for (const suc of sucursales) {
    if (suc.latitud == null || suc.longitud == null) continue;
    if (!(await tieneStockSuficiente(suc.id_sucursal, necesidades, transaction))) continue;
    candidatas.push({
      id_sucursal: suc.id_sucursal,
      distanciaKm: distanciaKm(direccion.latitud, direccion.longitud, suc.latitud, suc.longitud),
    });
  }
  if (candidatas.length === 0) {
    throw errorConStatus(409, "Ninguna sucursal tiene stock suficiente para todo el pedido");
  }
  candidatas.sort((a, b) => a.distanciaKm - b.distanciaKm);
  return candidatas[0].id_sucursal;
}

module.exports = { seleccionarSucursal, calcularNecesidades, tieneStockSuficiente };
