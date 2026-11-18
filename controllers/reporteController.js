const reporteService = require("../services/reporteService");
const { esAdmin, esEmpleado } = require("../utils/authz");

// Resuelve la sucursal efectiva del reporte:
// - EMPLEADO: siempre su sucursal asignada.
// - ADMIN: la query opcional ?id_sucursal= o global.
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

const ejecutarReporte = (fn) => async (req, res, next) => {
  try {
    const resuelto = resolverSucursalReporte(req, res);
    if (resuelto.error) return;
    await reporteService.validarSucursal(resuelto.id_sucursal);
    const resultado = await fn({ ...req.query, id_sucursal: resuelto.id_sucursal });
    res.json(resultado);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

module.exports = {
  getPedidosPorDia: ejecutarReporte(reporteService.pedidosPorDia),
  getPedidosPorEstado: ejecutarReporte(reporteService.pedidosPorEstado),
  getTiempoPromedioEntrega: ejecutarReporte(reporteService.tiempoPromedioEntrega),
  getPedidosCancelados: ejecutarReporte(reporteService.pedidosCancelados),
  getSucursalesResumen: ejecutarReporte(reporteService.sucursalesResumen),
  getProductosPorSucursal: ejecutarReporte(reporteService.productosPorSucursal),
  getClientesTop: ejecutarReporte(reporteService.clientesTop),
  getClientesNuevos: ejecutarReporte(reporteService.clientesNuevos),
  getClientesInactivos: ejecutarReporte(reporteService.clientesInactivos),
  getReporteProductos: ejecutarReporte(reporteService.reporteProductos),
  getReportePromociones: ejecutarReporte(reporteService.reportePromociones),
  getImpactoPromociones: ejecutarReporte(reporteService.impactoPromociones),
};
