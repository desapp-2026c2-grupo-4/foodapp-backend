const express = require("express");
const router = express.Router();
const controller = require("../controllers/sucursalController");
const validate = require("../middlewares/validateMiddleware");
const { autenticar } = require("../middlewares/authMiddleware");
const { requireAdmin } = require("../middlewares/roleMiddleware");
const { createSucursalSchema, updateSucursalSchema } = require("../schemas/sucursalSchema");

// Catálogo público de sucursales (sin stock). La gestión requiere ADMIN.
router.get("/", controller.getSucursales);
router.get("/:id", controller.getSucursalById);
router.post("/", autenticar, requireAdmin, validate(createSucursalSchema), controller.createSucursal);
router.put("/:id", autenticar, requireAdmin, validate(updateSucursalSchema), controller.updateSucursal);
router.delete("/:id", autenticar, requireAdmin, controller.deleteSucursal);

module.exports = router;
