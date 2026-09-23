const { sequelize } = require("../models");

// Reporte de productos: unidades vendidas y facturación por producto
// (precio histórico de DetallePedido, incluye productos sin ventas con 0)
const getReporteProductos = async (req, res, next) => {
  try {
    const [rows] = await sequelize.query(`
      SELECT
        p.id_producto,
        p.nombre,
        p.precio AS precio_actual,
        p.estado,
        COALESCE(SUM(d.cantidad), 0)::int AS unidades_vendidas,
        COALESCE(SUM(d.cantidad * d.precio), 0)::numeric AS facturacion,
        COUNT(DISTINCT d.id_pedido)::int AS cantidad_pedidos
      FROM productos p
      LEFT JOIN detalle_pedidos d ON d.id_producto = p.id_producto
      GROUP BY p.id_producto, p.nombre, p.precio, p.estado
      ORDER BY p.id_producto ASC
    `);
    res.json(rows.map((r) => ({
      ...r,
      unidades_vendidas: parseInt(r.unidades_vendidas, 10),
      facturacion: parseFloat(r.facturacion),
      cantidad_pedidos: parseInt(r.cantidad_pedidos, 10),
    })));
  } catch (err) {
    next(err);
  }
};

module.exports = { getReporteProductos };
