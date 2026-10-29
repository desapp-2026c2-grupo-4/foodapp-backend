const express = require("express");
const router = express.Router();
const controller = require("../controllers/pedidoController");
const validate = require("../middlewares/validateMiddleware");
const { autenticar } = require("../middlewares/authMiddleware");
const { requireAdmin, requireStaff, requireRole } = require("../middlewares/roleMiddleware");
const { createPedidoSchema, updatePedidoSchema, updateDetallePreparadoSchema } = require("../schemas/pedidoSchema");

router.post("/", autenticar, requireRole("CLIENTE", "ADMIN"), validate(createPedidoSchema), controller.createPedido);
router.get("/", autenticar, controller.getPedidos);
router.get("/:id/detalles", autenticar, controller.getDetallesByPedidoId);
router.put("/:id/detalles/:idDetalle", autenticar, requireStaff, validate(updateDetallePreparadoSchema), controller.updateDetallePreparado);
router.get("/:id", autenticar, controller.getPedidoById);
router.put("/:id", autenticar, requireStaff, validate(updatePedidoSchema), controller.updatePedido);
router.delete("/:id", autenticar, requireAdmin, controller.deletePedido);

module.exports = router;
