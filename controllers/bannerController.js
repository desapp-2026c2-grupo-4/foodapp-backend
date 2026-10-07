const { Banner } = require("../models");

const getBanners = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.activo !== undefined) where.activo = req.query.activo === "true";
    const banners = await Banner.findAll({
      where,
      order: [["orden", "ASC"], ["id_banner", "ASC"]],
    });
    res.json(banners);
  } catch (err) { next(err); }
};

const getBannerById = async (req, res, next) => {
  try {
    const banner = await Banner.findByPk(req.params.id);
    if (!banner) return res.status(404).json({ error: "Banner no encontrado" });
    res.json(banner);
  } catch (err) { next(err); }
};

const createBanner = async (req, res, next) => {
  try {
    const { titulo, descripcion, imagen, activo, orden } = req.body;
    const banner = await Banner.create({ titulo, descripcion, imagen, activo, orden });
    res.status(201).json(banner);
  } catch (err) { next(err); }
};

const updateBanner = async (req, res, next) => {
  try {
    const banner = await Banner.findByPk(req.params.id);
    if (!banner) return res.status(404).json({ error: "Banner no encontrado" });
    const permitidos = ["titulo", "descripcion", "imagen", "activo", "orden"];
    const datos = {};
    for (const k of permitidos) if (req.body[k] !== undefined) datos[k] = req.body[k];
    await banner.update(datos);
    res.json(banner);
  } catch (err) { next(err); }
};

const deleteBanner = async (req, res, next) => {
  try {
    const banner = await Banner.findByPk(req.params.id);
    if (!banner) return res.status(404).json({ error: "Banner no encontrado" });
    await banner.destroy();
    res.json({ mensaje: "Banner eliminado" });
  } catch (err) { next(err); }
};

module.exports = { getBanners, getBannerById, createBanner, updateBanner, deleteBanner };
