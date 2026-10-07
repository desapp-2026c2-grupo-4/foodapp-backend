const express = require("express");
const router = express.Router();
const controller = require("../controllers/bannerController");
const validate = require("../middlewares/validateMiddleware");
const { createBannerSchema, updateBannerSchema } = require("../schemas/bannerSchema");

// Nota: la autorización por rol (ADMIN) se aplica en el frontend (RequireAdmin).
// Cuando se incorpore JWT, proteger POST/PUT/DELETE con authMiddleware + roleMiddleware (§7 AGENTS.md).
router.post("/", validate(createBannerSchema), controller.createBanner);
router.get("/", controller.getBanners);
router.get("/:id", controller.getBannerById);
router.put("/:id", validate(updateBannerSchema), controller.updateBanner);
router.delete("/:id", controller.deleteBanner);

module.exports = router;
