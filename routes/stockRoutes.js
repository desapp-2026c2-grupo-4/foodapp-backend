const express = require("express");
const router = express.Router();
const controller = require("../controllers/stockController");
const validate = require("../middlewares/validateMiddleware");
const { autenticar } = require("../middlewares/authMiddleware");
const { requireStaff, requireSucursal } = require("../middlewares/roleMiddleware");
const { agregarStockSchema } = require("../schemas/stockSchema");

router.use(autenticar, requireStaff, requireSucursal);
router.get("/", controller.getStock);
router.post("/", validate(agregarStockSchema), controller.agregarStock);

module.exports = router;
