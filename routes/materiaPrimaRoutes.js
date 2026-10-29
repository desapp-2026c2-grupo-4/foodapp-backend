const express = require("express");
const router = express.Router();
const controller = require("../controllers/materiaPrimaController");
const validate = require("../middlewares/validateMiddleware");
const { autenticar } = require("../middlewares/authMiddleware");
const { requireAdmin, requireStaff } = require("../middlewares/roleMiddleware");
const { createMateriaPrimaSchema, updateMateriaPrimaSchema } = require("../schemas/materiaPrimaSchema");

router.get("/", autenticar, requireStaff, controller.getMateriasPrimas);
router.get("/:id", autenticar, requireStaff, controller.getMateriaPrimaById);
router.post("/", autenticar, requireAdmin, validate(createMateriaPrimaSchema), controller.createMateriaPrima);
router.put("/:id", autenticar, requireAdmin, validate(updateMateriaPrimaSchema), controller.updateMateriaPrima);
router.delete("/:id", autenticar, requireAdmin, controller.deleteMateriaPrima);

module.exports = router;
