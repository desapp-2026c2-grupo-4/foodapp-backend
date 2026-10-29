const express = require("express");
const router = express.Router();
const controller = require("../controllers/clienteController");
const validate = require("../middlewares/validateMiddleware");
const { autenticar } = require("../middlewares/authMiddleware");
const { requireAdmin } = require("../middlewares/roleMiddleware");
const { requireClienteSelfOrAdmin } = require("../middlewares/ownershipMiddleware");
const { createClienteSchema, updateClienteSchema, cambiarPasswordSchema } = require("../schemas/clienteSchema");
const direccionRoutes = require("./direccionRoutes");

router.use("/:id/direcciones", direccionRoutes);
router.post("/", autenticar, requireAdmin, validate(createClienteSchema), controller.createCliente);
router.get("/", autenticar, requireAdmin, controller.getClientes);
router.get("/:id", autenticar, requireClienteSelfOrAdmin, controller.getClienteById);
router.put("/:id", autenticar, requireClienteSelfOrAdmin, validate(updateClienteSchema), controller.updateCliente);
router.put("/:id/password", autenticar, requireClienteSelfOrAdmin, validate(cambiarPasswordSchema), controller.cambiarPassword);

module.exports = router;
