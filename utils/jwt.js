const jwt = require("jsonwebtoken");

const getSecret = () => {
  if (!process.env.JWT_SECRET) {
    console.warn("JWT_SECRET no definido, usando valor de desarrollo");
    return "desarrollo";
  }
  return process.env.JWT_SECRET;
};

const firmarToken = (payload) =>
  jwt.sign(payload, getSecret(), { expiresIn: process.env.JWT_EXPIRES_IN || "12h" });

const verificarToken = (token) => jwt.verify(token, getSecret());

const firmarTokenRecuperacion = ({ id_cliente }) =>
  jwt.sign({ id_cliente, purpose: "password_reset" }, getSecret(), { expiresIn: "15m" });

const verificarTokenRecuperacion = (token) => {
  let payload;
  try {
    payload = jwt.verify(token, getSecret());
  } catch {
    const err = new Error("El token de recuperación es inválido o expiró");
    err.status = 400;
    throw err;
  }
  if (payload.purpose !== "password_reset" || !payload.id_cliente) {
    const err = new Error("El token de recuperación es inválido o expiró");
    err.status = 400;
    throw err;
  }
  return payload;
};

module.exports = {
  firmarToken,
  verificarToken,
  firmarTokenRecuperacion,
  verificarTokenRecuperacion,
};
