const express = require("express");
const router = express.Router();
const controller = require("../controllers/reporteController");
const { autenticar } = require("../middlewares/authMiddleware");
const { requireStaff, requireSucursal } = require("../middlewares/roleMiddleware");

router.use(autenticar, requireStaff, requireSucursal);
router.get("/productos", controller.getReporteProductos);
router.get("/promociones", controller.getReportePromociones);

module.exports = router;
