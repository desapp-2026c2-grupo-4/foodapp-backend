const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/opcionalController");
const validate = require("../middlewares/validateMiddleware");
const { autenticar } = require("../middlewares/authMiddleware");
const { requireAdmin, requireStaff } = require("../middlewares/roleMiddleware");
const { createOpcionalSchema, updateOpcionalSchema } = require("../schemas/opcionalSchema");

// Opcionales anidados por producto: /api/productos/:id/opcionales
const productoOpcionalRouter = express.Router({ mergeParams: true });
productoOpcionalRouter.get("/", ctrl.getOpcionalesByProducto);
productoOpcionalRouter.post("/", autenticar, requireAdmin, validate(createOpcionalSchema), ctrl.createOpcional);

// Opcionales globales: /api/opcionales
router.get("/", autenticar, requireStaff, ctrl.getAllOpcionales);
router.put("/:id", autenticar, requireAdmin, validate(updateOpcionalSchema), ctrl.updateOpcional);
router.delete("/:id", autenticar, requireAdmin, ctrl.deleteOpcional);

module.exports = { router, productoOpcionalRouter };
