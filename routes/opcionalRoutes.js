const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/opcionalController");
const validate = require("../middlewares/validateMiddleware");
const { createOpcionalSchema, updateOpcionalSchema } = require("../schemas/opcionalSchema");

// Opcionales anidados por producto: /api/productos/:id/opcionales
const productoOpcionalRouter = express.Router({ mergeParams: true });
productoOpcionalRouter.get("/", ctrl.getOpcionalesByProducto);
productoOpcionalRouter.post("/", validate(createOpcionalSchema), ctrl.createOpcional);

// Opcionales globales: /api/opcionales
router.get("/", ctrl.getAllOpcionales);
router.put("/:id", validate(updateOpcionalSchema), ctrl.updateOpcional);
router.delete("/:id", ctrl.deleteOpcional);

module.exports = { router, productoOpcionalRouter };
