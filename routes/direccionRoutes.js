const express = require("express");
const router = express.Router({ mergeParams: true });
const controller = require("../controllers/direccionController");
const validate = require("../middlewares/validateMiddleware");
const { autenticar } = require("../middlewares/authMiddleware");
const { requireClienteSelfOrAdmin } = require("../middlewares/ownershipMiddleware");
const { createDireccionSchema } = require("../schemas/direccionSchema");

// Montado en /api/clientes/:id/direcciones (ver clienteRoutes.js)
router.use(autenticar, requireClienteSelfOrAdmin);
router.get("/", controller.getDireccionesByCliente);
router.post("/", validate(createDireccionSchema), controller.createDireccion);
router.delete("/:idDireccion", controller.deleteDireccion);

module.exports = router;
