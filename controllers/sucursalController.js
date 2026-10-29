const { Sucursal, SucursalHorario, sequelize } = require("../models");
const { abiertaAhora } = require("../utils/schedule");

const includeHorarios = [{ model: SucursalHorario, as: "horarios", attributes: ["id_horario", "dia_semana", "hora_apertura", "hora_cierre"] }];

const serializar = (sucursal, ahora = new Date()) => {
  const data = sucursal.toJSON();
  data.horarios = (data.horarios || []).sort((a, b) => a.dia_semana - b.dia_semana);
  data.abierta_ahora = abiertaAhora(data, ahora);
  return data;
};

const getSucursales = async (req, res, next) => {
  try {
    const ahora = new Date();
    const sucursales = await Sucursal.findAll({
      include: includeHorarios,
      order: [["id_sucursal", "ASC"]],
    });
    res.json(sucursales.map((s) => serializar(s, ahora)));
  } catch (err) {
    next(err);
  }
};

const getSucursalById = async (req, res, next) => {
  try {
    const sucursal = await Sucursal.findByPk(req.params.id, {
      include: includeHorarios,
    });
    if (!sucursal) return res.status(404).json({ error: "Sucursal no encontrada" });
    res.json(serializar(sucursal));
  } catch (err) {
    next(err);
  }
};

const updateSucursal = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const sucursal = await Sucursal.findByPk(req.params.id, { transaction: t });
    if (!sucursal) {
      await t.rollback();
      return res.status(404).json({ error: "Sucursal no encontrada" });
    }

    const permitidos = ["nombre", "estado", "telefono", "calle", "altura", "ciudad", "provincia", "codigo_postal", "latitud", "longitud", "radio_km"];
    const datos = {};
    for (const key of permitidos) {
      if (req.body[key] !== undefined) datos[key] = req.body[key];
    }
    const tocaHorarios = req.body.horarios !== undefined;
    if (Object.keys(datos).length === 0 && !tocaHorarios) {
      await t.rollback();
      return res.status(400).json({ error: "No se enviaron campos para actualizar" });
    }

    if (Object.keys(datos).length > 0) {
      await sucursal.update(datos, { transaction: t });
    }
    if (tocaHorarios) {
      await SucursalHorario.destroy({ where: { id_sucursal: sucursal.id_sucursal }, transaction: t });
      if (Array.isArray(req.body.horarios) && req.body.horarios.length > 0) {
        await SucursalHorario.bulkCreate(
          req.body.horarios.map((h) => ({
            id_sucursal: sucursal.id_sucursal,
            dia_semana: h.dia_semana,
            hora_apertura: h.hora_apertura,
            hora_cierre: h.hora_cierre,
          })),
          { transaction: t }
        );
      }
    }

    await t.commit();
    const actualizado = await Sucursal.findByPk(sucursal.id_sucursal, {
      include: includeHorarios,
    });
    res.json(serializar(actualizado));
  } catch (err) {
    if (!t.finished) await t.rollback();
    next(err);
  }
};

const createSucursal = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { nombre, estado, telefono, horarios, calle, altura, ciudad, provincia, codigo_postal, latitud, longitud, radio_km } = req.body;
    if (!nombre || !calle || !altura || !ciudad || !provincia) {
      await t.rollback();
      return res.status(400).json({ error: "nombre, calle, altura, ciudad y provincia son obligatorios" });
    }
    const sucursal = await Sucursal.create(
      { nombre, estado, telefono, calle, altura, ciudad, provincia, codigo_postal: codigo_postal || null, latitud, longitud, radio_km },
      { transaction: t }
    );
    if (Array.isArray(horarios) && horarios.length > 0) {
      await SucursalHorario.bulkCreate(
        horarios.map((h) => ({
          id_sucursal: sucursal.id_sucursal,
          dia_semana: h.dia_semana,
          hora_apertura: h.hora_apertura,
          hora_cierre: h.hora_cierre,
        })),
        { transaction: t }
      );
    }
    await t.commit();
    const creada = await Sucursal.findByPk(sucursal.id_sucursal, {
      include: includeHorarios,
    });
    res.status(201).json(serializar(creada));
  } catch (err) {
    if (!t.finished) await t.rollback();
    next(err);
  }
};

const deleteSucursal = async (req, res, next) => {
  try {
    const sucursal = await Sucursal.findByPk(req.params.id);
    if (!sucursal) return res.status(404).json({ error: "Sucursal no encontrada" });
    await sucursal.destroy();
    res.json({ mensaje: "Sucursal dada de baja" });
  } catch (err) {
    next(err);
  }
};

module.exports = { getSucursales, getSucursalById, updateSucursal, createSucursal, deleteSucursal };
