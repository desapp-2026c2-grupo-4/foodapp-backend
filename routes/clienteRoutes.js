const express = require("express");
const router = express.Router();
const controller = require("../controllers/clienteController");
const validate = require("../middlewares/validateMiddleware");
const { createClienteSchema, updateClienteSchema } = require("../schemas/clienteSchema");

router.post("/", validate(createClienteSchema), controller.createCliente);
router.get("/", controller.getClientes);
router.get("/:id", controller.getClienteById);
router.put("/:id", validate(updateClienteSchema), controller.updateCliente);

module.exports = router;
