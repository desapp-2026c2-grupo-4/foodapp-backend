const { Sucursal, Producto, MateriaPrimaSucursal, SucursalHorario } = require("../models");
const { distanciaKm } = require("../utils/distance");
const { estaAbierta } = require("../utils/schedule");
const promocionService = require("./promocionService");
const stockService = require("./stockService");

function errorConStatus(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// Calcula las materias primas necesarias para los items del pedido
// (productos sueltos y promociones expandidas) según la receta de cada producto.
async function calcularNecesidades(detalles, transaction) {
  const porProducto = new Map();
  const sumar = (id_producto, cantidad) => {
    porProducto.set(id_producto, (porProducto.get(id_producto) || 0) + cantidad);
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
  return stockService.necesidadesMateriasDesdeProductos(porProducto, transaction);
}

async function tieneStockSuficiente(id_sucursal, necesidades, transaction) {
  for (const [id_materia_prima, cantidad] of necesidades) {
    const fila = await MateriaPrimaSucursal.findOne({
      where: { id_sucursal, id_materia_prima },
      transaction,
    });
    if (!fila || fila.stock < cantidad) return false;
  }
  return true;
}

/**
 * Selecciona la sucursal para un pedido: la más cercana a la dirección de
 * entrega (Haversine) entre las activas que estén dentro de su radio de
 * cobertura y tengan stock suficiente de las materias primas para todo el
 * pedido. Devuelve el id_sucursal.
 */
async function seleccionarSucursal({ direccion, detalles }, transaction) {
  if (direccion.latitud == null || direccion.longitud == null) {
    throw errorConStatus(400, "La dirección no tiene coordenadas para asignar sucursal");
  }
  if (!Array.isArray(detalles) || detalles.length === 0) {
    throw errorConStatus(400, "El pedido no tiene detalles para asignar sucursal");
  }
  const necesidades = await calcularNecesidades(detalles, transaction);

  const ahora = new Date();
  const sucursales = await Sucursal.findAll({
    where: { estado: "activa" },
    include: [{ model: SucursalHorario, as: "horarios" }],
    transaction,
  });
  const candidatas = [];
  for (const suc of sucursales) {
    if (suc.latitud == null || suc.longitud == null) continue;
    if (!estaAbierta(suc.horarios, ahora)) continue;
    const distancia = distanciaKm(direccion.latitud, direccion.longitud, suc.latitud, suc.longitud);
    const radio = Number(suc.radio_km);
    if (!Number.isFinite(radio) || distancia > radio) continue;
    if (!(await tieneStockSuficiente(suc.id_sucursal, necesidades, transaction))) continue;
    candidatas.push({
      id_sucursal: suc.id_sucursal,
      distanciaKm: distancia,
    });
  }
  if (candidatas.length === 0) {
    throw errorConStatus(409, "No hay sucursal dentro del radio de cobertura con stock suficiente para todo el pedido");
  }
  candidatas.sort((a, b) => a.distanciaKm - b.distanciaKm);
  return candidatas[0].id_sucursal;
}

/**
 * Valida una sucursal explícita: debe existir, estar habilitada, abierta en el
 * horario actual y dentro de su radio de cobertura. Devuelve la sucursal para
 * reutilizarla en el pedido.
 */
async function validarSucursalOperativa({ id_sucursal, direccion }, transaction, ahora = new Date()) {
  const sucursal = await Sucursal.findByPk(id_sucursal, {
    include: [{ model: SucursalHorario, as: "horarios" }],
    transaction,
  });
  if (!sucursal) throw errorConStatus(404, "Sucursal no encontrada");
  if (sucursal.estado !== "activa") {
    throw errorConStatus(409, `La sucursal ${sucursal.nombre} no está habilitada`);
  }
  if (!estaAbierta(sucursal.horarios, ahora)) {
    throw errorConStatus(409, `La sucursal ${sucursal.nombre} está fuera de horario`);
  }
  if (direccion.latitud == null || direccion.longitud == null) {
    throw errorConStatus(400, "La dirección no tiene coordenadas para validar la cobertura de la sucursal");
  }
  if (sucursal.latitud == null || sucursal.longitud == null) {
    throw errorConStatus(409, `La sucursal ${sucursal.nombre} no tiene coordenadas para validar su cobertura`);
  }
  const radio = Number(sucursal.radio_km);
  if (!Number.isFinite(radio)) {
    throw errorConStatus(409, `La sucursal ${sucursal.nombre} no tiene radio de cobertura configurado`);
  }
  const distancia = distanciaKm(direccion.latitud, direccion.longitud, sucursal.latitud, sucursal.longitud);
  if (distancia > radio) {
    throw errorConStatus(
      409,
      `La sucursal ${sucursal.nombre} está fuera del radio de cobertura (${distancia.toFixed(2)} km > ${radio.toFixed(2)} km)`
    );
  }
  return sucursal;
}

/**
 * Resuelve la sucursal del pedido: valida la explícita si viene, o selecciona
 * automáticamente la más cercana dentro de su radio con stock suficiente.
 */
async function resolverSucursal({ id_sucursal, direccion, detalles }, transaction) {
  if (id_sucursal) {
    const sucursal = await validarSucursalOperativa({ id_sucursal, direccion }, transaction);
    return sucursal.id_sucursal;
  }
  return seleccionarSucursal({ direccion, detalles }, transaction);
}

module.exports = {
  seleccionarSucursal,
  validarSucursalOperativa,
  resolverSucursal,
  calcularNecesidades,
  tieneStockSuficiente,
};
