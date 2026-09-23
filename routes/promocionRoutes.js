const express = require("express");
const router = express.Router();
const controller = require("../controllers/promocionController");
const validate = require("../middlewares/validateMiddleware");
const { createPromocionSchema, updatePromocionSchema } = require("../schemas/promocionSchema");

// Nota: la autorización por rol (ADMIN) se aplica en el frontend (RequireAdmin).
// Cuando se incorpore JWT, proteger POST/PUT/DELETE con authMiddleware + roleMiddleware (§7 AGENTS.md).
router.post("/", validate(createPromocionSchema), controller.createPromocion);
router.get("/", controller.getPromociones);
router.get("/:id", controller.getPromocionById);
router.put("/:id", validate(updatePromocionSchema), controller.updatePromocion);
router.delete("/:id", controller.deletePromocion);

module.exports = router;
