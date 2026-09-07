const express = require("express");
const router = express.Router();
const controller = require("../controllers/pedidoController");

router.post("/", controller.createPedido);
router.get("/", controller.getPedidos);
router.get("/:id/detalles", controller.getDetallesByPedidoId);
router.get("/:id", controller.getPedidoById);
router.put("/:id", controller.updatePedido);
router.delete("/:id", controller.deletePedido);

module.exports = router;
