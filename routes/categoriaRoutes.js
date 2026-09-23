const express = require("express");
const router = express.Router();
const controller = require("../controllers/categoriaController");
const validate = require("../middlewares/validateMiddleware");
const { createCategoriaSchema, updateCategoriaSchema } = require("../schemas/categoriaSchema");

router.post("/", validate(createCategoriaSchema), controller.createCategoria);
router.get("/", controller.getCategorias);
router.get("/:id", controller.getCategoriaById);
router.put("/:id", validate(updateCategoriaSchema), controller.updateCategoria);
router.delete("/:id", controller.deleteCategoria);

module.exports = router;
