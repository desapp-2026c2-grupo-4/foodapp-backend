const express = require("express");
const router = express.Router();
const controller = require("../controllers/stockController");
const validate = require("../middlewares/validateMiddleware");
const { agregarStockSchema } = require("../schemas/stockSchema");

router.get("/", controller.getStock);
router.post("/", validate(agregarStockSchema), controller.agregarStock);

module.exports = router;
