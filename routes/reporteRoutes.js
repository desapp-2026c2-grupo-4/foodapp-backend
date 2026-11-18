const express = require("express");
const router = express.Router();
const controller = require("../controllers/reporteController");
const validate = require("../middlewares/validateMiddleware");
const { autenticar } = require("../middlewares/authMiddleware");
const { requireStaff, requireSucursal } = require("../middlewares/roleMiddleware");
const { reporteQuerySchema } = require("../schemas/reporteSchema");

router.use(autenticar, requireStaff, requireSucursal);

const validarQuery = validate(reporteQuerySchema, "query");

router.get("/pedidos/dia", validarQuery, controller.getPedidosPorDia);
router.get("/pedidos/estado", validarQuery, controller.getPedidosPorEstado);
router.get("/pedidos/tiempo-entrega", validarQuery, controller.getTiempoPromedioEntrega);
router.get("/pedidos/cancelados", validarQuery, controller.getPedidosCancelados);

router.get("/sucursales", validarQuery, controller.getSucursalesResumen);
router.get("/sucursales/productos", validarQuery, controller.getProductosPorSucursal);

router.get("/clientes/top", validarQuery, controller.getClientesTop);
router.get("/clientes/nuevos", validarQuery, controller.getClientesNuevos);
router.get("/clientes/inactivos", validarQuery, controller.getClientesInactivos);

router.get("/productos", validarQuery, controller.getReporteProductos);
router.get("/promociones/impacto", validarQuery, controller.getImpactoPromociones);
router.get("/promociones", validarQuery, controller.getReportePromociones);

module.exports = router;
