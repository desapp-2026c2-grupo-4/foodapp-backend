const express = require("express");
const router = express.Router();
const controller = require("../controllers/sucursalController");
const validate = require("../middlewares/validateMiddleware");
const { createSucursalSchema, updateSucursalSchema } = require("../schemas/sucursalSchema");

router.post("/", validate(createSucursalSchema), controller.createSucursal);
router.get("/", controller.getSucursales);
router.get("/:id", controller.getSucursalById);
router.put("/:id", validate(updateSucursalSchema), controller.updateSucursal);
router.delete("/:id", controller.deleteSucursal);

module.exports = router;
