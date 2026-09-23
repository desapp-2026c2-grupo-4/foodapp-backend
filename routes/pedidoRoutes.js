const express = require("express");
const router = express.Router();
const controller = require("../controllers/pedidoController");
const validate = require("../middlewares/validateMiddleware");
const { createPedidoSchema, updatePedidoSchema } = require("../schemas/pedidoSchema");

router.post("/", validate(createPedidoSchema), controller.createPedido);
router.get("/", controller.getPedidos);
router.get("/:id/detalles", controller.getDetallesByPedidoId);
router.get("/:id", controller.getPedidoById);
router.put("/:id", validate(updatePedidoSchema), controller.updatePedido);
router.delete("/:id", controller.deletePedido);

module.exports = router;
