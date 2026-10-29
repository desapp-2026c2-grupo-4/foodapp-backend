const express = require("express");
const router = express.Router();
const controller = require("../controllers/bannerController");
const validate = require("../middlewares/validateMiddleware");
const { autenticar } = require("../middlewares/authMiddleware");
const { requireAdmin } = require("../middlewares/roleMiddleware");
const { createBannerSchema, updateBannerSchema } = require("../schemas/bannerSchema");

router.get("/", controller.getBanners);
router.get("/:id", controller.getBannerById);
router.post("/", autenticar, requireAdmin, validate(createBannerSchema), controller.createBanner);
router.put("/:id", autenticar, requireAdmin, validate(updateBannerSchema), controller.updateBanner);
router.delete("/:id", autenticar, requireAdmin, controller.deleteBanner);

module.exports = router;
