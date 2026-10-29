const express = require("express");
const router = express.Router();
const controller = require("../controllers/empleadoController");
const validate = require("../middlewares/validateMiddleware");
const { autenticar } = require("../middlewares/authMiddleware");
const { requireAdmin } = require("../middlewares/roleMiddleware");
const { createEmpleadoSchema, updateEmpleadoSchema } = require("../schemas/empleadoSchema");

router.use(autenticar, requireAdmin);
router.post("/", validate(createEmpleadoSchema), controller.createEmpleado);
router.get("/", controller.getEmpleados);
router.get("/:id", controller.getEmpleadoById);
router.put("/:id", validate(updateEmpleadoSchema), controller.updateEmpleado);
router.delete("/:id", controller.deleteEmpleado);

module.exports = router;
