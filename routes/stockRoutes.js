const express = require("express");
const router = express.Router();
const controller = require("../controllers/stockController");
const validate = require("../middlewares/validateMiddleware");
const { autenticar } = require("../middlewares/authMiddleware");
const { requireStaff, requireSucursal } = require("../middlewares/roleMiddleware");
const { agregarStockSchema, reducirStockSchema } = require("../schemas/stockSchema");

router.use(autenticar, requireStaff, requireSucursal);
router.get("/reducciones", controller.getReduccionesStock);
router.post("/reducciones", validate(reducirStockSchema), controller.reducirStock);
router.get("/", controller.getStock);
router.post("/", validate(agregarStockSchema), controller.agregarStock);

module.exports = router;
