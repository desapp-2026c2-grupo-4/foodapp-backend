const express = require("express");
const router = express.Router({ mergeParams: true });
const controller = require("../controllers/direccionController");
const validate = require("../middlewares/validateMiddleware");
const { createDireccionSchema } = require("../schemas/direccionSchema");

// Montado en /api/clientes/:id/direcciones (ver clienteRoutes.js)
router.get("/", controller.getDireccionesByCliente);
router.post("/", validate(createDireccionSchema), controller.createDireccion);
router.delete("/:idDireccion", controller.deleteDireccion);

module.exports = router;
