const { sequelize, Sucursal } = require("../models");
const { esAdmin, esEmpleado } = require("../utils/authz");

// Reporte de productos: unidades vendidas y facturación por producto
// (precio histórico de DetallePedido, incluye productos sin ventas con 0)
// Filtro opcional ?id_sucursal= para acotar a los pedidos de una sucursal
const resolverSucursalReporte = (req, res) => {
  if (esEmpleado(req.user)) {
    if (!req.user.id_sucursal) {
      res.status(403).json({ error: "El usuario no tiene una sucursal asignada" });
      return { error: true };
    }
    if (req.query.id_sucursal && Number(req.query.id_sucursal) !== Number(req.user.id_sucursal)) {
      res.status(403).json({ error: "No podés consultar reportes de otra sucursal" });
      return { error: true };
    }
    return { id_sucursal: req.user.id_sucursal };
  }
  if (!esAdmin(req.user)) {
    res.status(403).json({ error: "No tenés permisos para consultar reportes" });
    return { error: true };
  }
  return { id_sucursal: req.query.id_sucursal };
};

const getReporteProductos = async (req, res, next) => {
  try {
    const resuelto = resolverSucursalReporte(req, res);
    if (resuelto.error) return;
    const { id_sucursal } = resuelto;
    const replacements = {};
    let joinDetalles = `LEFT JOIN detalle_pedidos d ON d.id_producto = p.id_producto`;
    if (id_sucursal) {
      const sucursal = await Sucursal.findByPk(id_sucursal);
      if (!sucursal) return res.status(404).json({ error: "Sucursal no encontrada" });
      joinDetalles = `LEFT JOIN detalle_pedidos d ON d.id_producto = p.id_producto
        AND d.id_pedido IN (SELECT id_pedido FROM pedidos WHERE id_sucursal = :id_sucursal)`;
      replacements.id_sucursal = id_sucursal;
    }
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
      ${joinDetalles}
      WHERE p.deleted_at IS NULL
      GROUP BY p.id_producto, p.nombre, p.precio, p.estado
      ORDER BY p.id_producto ASC
    `, { replacements });
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

// Reporte de promociones: combos vendidos y facturación por promoción
// (precio histórico de DetallePedido, incluye promociones sin ventas con 0).
// Cada compra de una promo se expande en varias líneas de detalle, por eso las
// unidades se calculan como SUM(cantidad líneas) / SUM(cantidad por combo).
// Filtro opcional ?id_sucursal= para acotar a los pedidos de una sucursal
const getReportePromociones = async (req, res, next) => {
  try {
    const resuelto = resolverSucursalReporte(req, res);
    if (resuelto.error) return;
    const { id_sucursal } = resuelto;
    const replacements = {};
    let joinDetalles = `LEFT JOIN detalle_pedidos d ON d.id_promocion = pr.id_promocion`;
    if (id_sucursal) {
      const sucursal = await Sucursal.findByPk(id_sucursal);
      if (!sucursal) return res.status(404).json({ error: "Sucursal no encontrada" });
      joinDetalles = `LEFT JOIN detalle_pedidos d ON d.id_promocion = pr.id_promocion
        AND d.id_pedido IN (SELECT id_pedido FROM pedidos WHERE id_sucursal = :id_sucursal)`;
      replacements.id_sucursal = id_sucursal;
    }
    const [rows] = await sequelize.query(`
      SELECT
        pr.id_promocion,
        pr.nombre,
        pr.tipo,
        pr.valor,
        pr.activa,
        COALESCE(SUM(d.cantidad * d.precio), 0)::numeric AS facturacion,
        COUNT(DISTINCT d.id_pedido)::int AS cantidad_pedidos,
        CASE WHEN COALESCE(b.bundle_qty, 0) = 0 THEN 0
          ELSE ROUND(COALESCE(SUM(d.cantidad), 0)::numeric / b.bundle_qty)::int
        END AS unidades_vendidas
      FROM promociones pr
      LEFT JOIN (
        SELECT id_promocion, SUM(cantidad) AS bundle_qty
        FROM promocion_producto
        GROUP BY id_promocion
      ) b ON b.id_promocion = pr.id_promocion
      ${joinDetalles}
      WHERE pr.deleted_at IS NULL
      GROUP BY pr.id_promocion, pr.nombre, pr.tipo, pr.valor, pr.activa, b.bundle_qty
      ORDER BY pr.id_promocion ASC
    `, { replacements });
    res.json(rows.map((r) => ({
      ...r,
      valor: parseFloat(r.valor),
      unidades_vendidas: parseInt(r.unidades_vendidas, 10),
      facturacion: parseFloat(r.facturacion),
      cantidad_pedidos: parseInt(r.cantidad_pedidos, 10),
    })));
  } catch (err) {
    next(err);
  }
};

module.exports = { getReporteProductos, getReportePromociones };
