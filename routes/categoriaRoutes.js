const express = require("express");
const router = express.Router();
const controller = require("../controllers/categoriaController");
const validate = require("../middlewares/validateMiddleware");
const { autenticar } = require("../middlewares/authMiddleware");
const { requireAdmin } = require("../middlewares/roleMiddleware");
const { createCategoriaSchema, updateCategoriaSchema } = require("../schemas/categoriaSchema");

router.get("/", controller.getCategorias);
router.get("/:id", controller.getCategoriaById);
router.post("/", autenticar, requireAdmin, validate(createCategoriaSchema), controller.createCategoria);
router.put("/:id", autenticar, requireAdmin, validate(updateCategoriaSchema), controller.updateCategoria);
router.delete("/:id", autenticar, requireAdmin, controller.deleteCategoria);

module.exports = router;
