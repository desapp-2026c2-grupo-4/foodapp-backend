const express = require("express");
const router = express.Router();
const controller = require("../controllers/productoController");
const stockController = require("../controllers/stockController");
const validate = require("../middlewares/validateMiddleware");
const { autenticar, autenticarOpcional } = require("../middlewares/authMiddleware");
const { requireAdmin, requireStaff, requireSucursal } = require("../middlewares/roleMiddleware");
const { createProductoSchema, updateProductoSchema } = require("../schemas/productoSchema");
const { productoOpcionalRouter } = require("./opcionalRoutes");

router.use("/:id/opcionales", productoOpcionalRouter);

router.get("/", autenticarOpcional, controller.getProductos);
router.get("/:id/stock", autenticar, requireStaff, requireSucursal, stockController.getStockProducto);
router.get("/:id", controller.getProductoById);
router.post("/", autenticar, requireAdmin, validate(createProductoSchema), controller.createProducto);
router.put("/:id", autenticar, requireAdmin, validate(updateProductoSchema), controller.updateProducto);
router.delete("/:id", autenticar, requireAdmin, controller.deleteProducto);

module.exports = router;
