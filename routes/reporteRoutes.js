const express = require("express");
const router = express.Router();
const controller = require("../controllers/reporteController");

router.get("/productos", controller.getReporteProductos);

module.exports = router;
