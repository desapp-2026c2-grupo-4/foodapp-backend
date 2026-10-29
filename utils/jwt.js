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

module.exports = { firmarToken, verificarToken };
