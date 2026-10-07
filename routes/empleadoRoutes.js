const express = require("express");
const router = express.Router();
const controller = require("../controllers/empleadoController");
const validate = require("../middlewares/validateMiddleware");
const { createEmpleadoSchema, updateEmpleadoSchema } = require("../schemas/empleadoSchema");

router.post("/", validate(createEmpleadoSchema), controller.createEmpleado);
router.get("/", controller.getEmpleados);
router.get("/:id", controller.getEmpleadoById);
router.put("/:id", validate(updateEmpleadoSchema), controller.updateEmpleado);
router.delete("/:id", controller.deleteEmpleado);

module.exports = router;
