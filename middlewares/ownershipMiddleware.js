const { esAdmin, esCliente } = require("../utils/authz");

const requireClienteSelfOrAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "No autorizado" });
  if (esAdmin(req.user)) return next();
  if (esCliente(req.user) && Number(req.user.id_cliente) === Number(req.params.id)) return next();
  return res.status(403).json({ error: "No podés acceder a datos de otro cliente" });
};

module.exports = { requireClienteSelfOrAdmin };
