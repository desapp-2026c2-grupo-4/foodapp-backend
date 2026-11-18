const express = require("express");
const router = express.Router();
const controller = require("../controllers/parametroController");
const validate = require("../middlewares/validateMiddleware");
const { autenticar } = require("../middlewares/authMiddleware");
const { requireAdmin, requireStaff } = require("../middlewares/roleMiddleware");
const { updateParametrosSchema } = require("../schemas/parametroSchema");

router.use(autenticar);
router.get("/", requireStaff, controller.getParametros);
router.put("/", requireAdmin, validate(updateParametrosSchema), controller.updateParametros);

module.exports = router;
