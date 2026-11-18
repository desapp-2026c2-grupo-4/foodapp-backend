const authService = require("../services/authService");

const register = async (req, res, next) => {
  try {
    // Siempre CLIENTE: el servicio crea en la tabla clientes (sin campo rol)
    const { token, user } = await authService.register(req.body);
    res.status(201).json({ token, user });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { token, user } = await authService.login(req.body);
    res.json({ token, user });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

const recuperarPassword = async (req, res, next) => {
  try {
    const resultado = await authService.recuperarPassword(req.body);
    res.json(resultado);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

const restablecerPassword = async (req, res, next) => {
  try {
    const resultado = await authService.restablecerPassword(req.body);
    res.json(resultado);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

module.exports = { register, login, recuperarPassword, restablecerPassword };
