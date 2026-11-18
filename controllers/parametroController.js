const parametroService = require("../services/parametroService");

const getParametros = async (req, res, next) => {
  try {
    res.json(await parametroService.listar());
  } catch (err) {
    next(err);
  }
};

const updateParametros = async (req, res, next) => {
  try {
    const parametros = await parametroService.actualizar(req.body, req.user?.id_empleado ?? null);
    res.json(parametros);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

module.exports = { getParametros, updateParametros };
