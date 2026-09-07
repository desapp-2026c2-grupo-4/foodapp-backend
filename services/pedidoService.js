const { DetallePedido } = require("../models");

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

module.exports = { calcularImporte, recalcularYActualizarImporte };
