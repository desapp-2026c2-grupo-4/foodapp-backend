const prohibido = (res, mensaje = "No tenés permisos para realizar esta acción") =>
  res.status(403).json({ error: mensaje });

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "No autorizado" });
  if (!roles.includes(req.user.rol)) return prohibido(res);
  next();
};

const requireAdmin = requireRole("ADMIN");
const requireStaff = requireRole("ADMIN", "EMPLEADO");
const requireCliente = requireRole("CLIENTE");

const requireSucursal = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "No autorizado" });
  if (req.user.rol === "ADMIN") return next();
  if (req.user.rol !== "EMPLEADO" || !req.user.id_sucursal) {
    return prohibido(res, "El usuario no tiene una sucursal asignada");
  }
  next();
};

module.exports = { requireRole, requireAdmin, requireStaff, requireCliente, requireSucursal };
