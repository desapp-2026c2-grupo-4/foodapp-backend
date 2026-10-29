const express = require("express");
const router = express.Router();
const controller = require("../controllers/promocionController");
const validate = require("../middlewares/validateMiddleware");
const { autenticar } = require("../middlewares/authMiddleware");
const { requireAdmin } = require("../middlewares/roleMiddleware");
const { createPromocionSchema, updatePromocionSchema } = require("../schemas/promocionSchema");

router.get("/", controller.getPromociones);
router.get("/:id", controller.getPromocionById);
router.post("/", autenticar, requireAdmin, validate(createPromocionSchema), controller.createPromocion);
router.put("/:id", autenticar, requireAdmin, validate(updatePromocionSchema), controller.updatePromocion);
router.delete("/:id", autenticar, requireAdmin, controller.deletePromocion);

module.exports = router;
