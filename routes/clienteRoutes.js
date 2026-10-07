const express = require("express");
const router = express.Router();
const controller = require("../controllers/clienteController");
const validate = require("../middlewares/validateMiddleware");
const { createClienteSchema, updateClienteSchema, cambiarPasswordSchema } = require("../schemas/clienteSchema");
const direccionRoutes = require("./direccionRoutes");

router.use("/:id/direcciones", direccionRoutes);
router.post("/", validate(createClienteSchema), controller.createCliente);
router.get("/", controller.getClientes);
router.get("/:id", controller.getClienteById);
router.put("/:id", validate(updateClienteSchema), controller.updateCliente);
router.put("/:id/password", validate(cambiarPasswordSchema), controller.cambiarPassword);

module.exports = router;
