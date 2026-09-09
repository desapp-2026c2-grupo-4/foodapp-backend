const express = require("express");
const router = express.Router();
const controller = require("../controllers/productoController");

router.post("/", controller.createProducto);
router.get("/", controller.getProductos);
router.get("/:id", controller.getProductoById);
router.put("/:id", controller.updateProducto);
router.delete("/:id", controller.deleteProducto);

module.exports = router;
