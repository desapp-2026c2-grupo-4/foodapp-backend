const { Cliente, Empleado } = require("../models");
const { verificarToken } = require("../utils/jwt");

const noAutorizado = (res, mensaje = "No autorizado") =>
  res.status(401).json({ error: mensaje });

const autenticar = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) return noAutorizado(res, "Token requerido");

    const token = header.slice(7).trim();
    if (!token) return noAutorizado(res, "Token requerido");

    let payload;
    try {
      payload = verificarToken(token);
    } catch {
      return noAutorizado(res, "Token inválido o expirado");
    }

    if (payload.id_cliente) {
      const cliente = await Cliente.findByPk(payload.id_cliente, {
        attributes: ["id_cliente", "nombre", "apellido", "email"],
      });
      if (!cliente) return noAutorizado(res, "Usuario no encontrado");
      req.user = {
        id_cliente: cliente.id_cliente,
        nombre: cliente.nombre,
        apellido: cliente.apellido,
        email: cliente.email,
        rol: "CLIENTE",
        tipo: "cliente",
      };
      return next();
    }

    if (payload.id_empleado) {
      const empleado = await Empleado.findByPk(payload.id_empleado, {
        attributes: ["id_empleado", "nombre", "apellido", "email", "rol", "id_sucursal"],
      });
      if (!empleado) return noAutorizado(res, "Usuario no encontrado");
      req.user = {
        id_empleado: empleado.id_empleado,
        nombre: empleado.nombre,
        apellido: empleado.apellido,
        email: empleado.email,
        rol: empleado.rol,
        id_sucursal: empleado.id_sucursal,
        tipo: "empleado",
      };
      return next();
    }

    return noAutorizado(res, "Token inválido");
  } catch (err) {
    next(err);
  }
};

const autenticarOpcional = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return next();
  return autenticar(req, res, next);
};

module.exports = { autenticar, autenticarOpcional };
