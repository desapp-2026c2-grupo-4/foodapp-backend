const express = require("express");
const router = express.Router();
const controller = require("../controllers/reporteController");

router.get("/productos", controller.getReporteProductos);
router.get("/promociones", controller.getReportePromociones);

module.exports = router;
