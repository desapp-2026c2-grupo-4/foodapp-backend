const express = require("express");
const router = express.Router();
const controller = require("../controllers/productoController");
const validate = require("../middlewares/validateMiddleware");
const { createProductoSchema, updateProductoSchema } = require("../schemas/productoSchema");
const { productoOpcionalRouter } = require("./opcionalRoutes");

router.use("/:id/opcionales", productoOpcionalRouter);

router.post("/", validate(createProductoSchema), controller.createProducto);
router.get("/", controller.getProductos);
router.get("/:id", controller.getProductoById);
router.put("/:id", validate(updateProductoSchema), controller.updateProducto);
router.delete("/:id", controller.deleteProducto);

module.exports = router;
