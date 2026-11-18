const { DetallePedido } = require("../models");
const { distanciaKm } = require("../utils/distance");
const stockService = require("./stockService");
const parametroService = require("./parametroService");

const TIEMPO_BASE_ENTREGA_MIN = parametroService.DEFAULTS.tiempo_base_entrega_min.valor;
const VELOCIDAD_URBANA_KMH = parametroService.DEFAULTS.velocidad_urbana_kmh.valor;
const ESTADOS_CON_REPOSICION = ["Pendiente", "Confirmado", "Preparando"];

/**
 * Calcula el importe de un pedido como SUM(cantidad * precio) de sus detalles.
 * @param {number} id_pedido
 * @param {object} [transaction] - transacción Sequelize opcional
 * @returns {Promise<number>} importe calculado
 */
async function calcularImporte(id_pedido, transaction) {
  const detalles = await DetallePedido.findAll({
    where: { id_pedido },
    transaction,
  });
  return detalles.reduce((sum, d) => sum + d.cantidad * parseFloat(d.precio), 0);
}

/**
 * Recalcula y persiste el importe en la tabla pedidos.
 * Usa transacción si se provee.
 */
async function recalcularYActualizarImporte(pedido, transaction) {
  const importe = await calcularImporte(pedido.id_pedido, transaction);
  await pedido.update({ importe }, { transaction });
  return importe;
}

/**
 * Repone el stock de materias primas al cancelar un pedido.
 * Pendiente/Confirmado reponen todas las líneas; Preparando repone solo las
 * líneas que todavía no fueron marcadas como preparadas. En camino o Listo no
 * reponen porque los insumos ya se consideran consumidos.
 */
async function reponerStockAlCancelar(pedido, estadoAnterior, transaction) {
  if (!pedido?.id_sucursal || !ESTADOS_CON_REPOSICION.includes(estadoAnterior)) return;

  const where = { id_pedido: pedido.id_pedido };
  if (estadoAnterior === "Preparando") where.preparado = false;

  const lineas = await DetallePedido.findAll({
    where,
    attributes: ["id_producto", "cantidad"],
    transaction,
  });
  if (lineas.length === 0) return;

  await stockService.reponerStock(lineas, pedido.id_sucursal, transaction);
}

/**
 * Estima el tiempo de entrega sumando la preparación base al viaje desde la
 * sucursal hasta la dirección, usando la distancia Haversine y una velocidad
 * urbana fija. Devuelve null si faltan coordenadas.
 */
function calcularTiempoEstimadoEntrega({
  direccion,
  sucursal,
  tiempoBaseMin = TIEMPO_BASE_ENTREGA_MIN,
  velocidadKmh = VELOCIDAD_URBANA_KMH,
} = {}) {
  const coordenadas = [
    direccion?.latitud,
    direccion?.longitud,
    sucursal?.latitud,
    sucursal?.longitud,
  ];
  if (coordenadas.some((valor) => valor == null)) {
    return { distancia_km: null, tiempo_estimado_min: null };
  }

  const distancia = distanciaKm(
    direccion.latitud,
    direccion.longitud,
    sucursal.latitud,
    sucursal.longitud
  );
  const minutosViaje = (distancia / velocidadKmh) * 60;

  return {
    distancia_km: Number(distancia.toFixed(2)),
    tiempo_estimado_min: Math.ceil(tiempoBaseMin + minutosViaje),
  };
}

/**
 * Convierte un pedido Sequelize en un objeto plano agregando el estimado de
 * entrega calculado a partir de la sucursal y la dirección incluidas.
 */
async function serializarPedido(pedido) {
  const data = pedido.toJSON();
  const [tiempoBaseMin, velocidadKmh] = await Promise.all([
    parametroService.obtenerNumero("tiempo_base_entrega_min", TIEMPO_BASE_ENTREGA_MIN),
    parametroService.obtenerNumero("velocidad_urbana_kmh", VELOCIDAD_URBANA_KMH),
  ]);
  return {
    ...data,
    ...calcularTiempoEstimadoEntrega({
      direccion: data.direccion,
      sucursal: data.sucursal,
      tiempoBaseMin,
      velocidadKmh,
    }),
  };
}

module.exports = {
  calcularImporte,
  recalcularYActualizarImporte,
  reponerStockAlCancelar,
  calcularTiempoEstimadoEntrega,
  serializarPedido,
  TIEMPO_BASE_ENTREGA_MIN,
  VELOCIDAD_URBANA_KMH,
};
