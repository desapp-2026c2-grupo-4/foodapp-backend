const express = require("express");
const router = express.Router();
const controller = require("../controllers/sucursalController");

router.post("/", controller.createSucursal);
router.get("/", controller.getSucursales);
router.get("/:id", controller.getSucursalById);
router.put("/:id", controller.updateSucursal);
router.delete("/:id", controller.deleteSucursal);

module.exports = router;
