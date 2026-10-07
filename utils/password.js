const bcrypt = require("bcryptjs");

const SALT_ROUNDS = 10;

const esHashBcrypt = (valor) =>
  typeof valor === "string" && /^\$2[aby]\$\d{2}\$/.test(valor);

const hashPassword = (plana) => bcrypt.hash(plana, SALT_ROUNDS);

// Compara la contraseña ingresada con la guardada.
// Acepta hashes bcrypt y, por compatibilidad con datos previos al hashing,
// texto plano (en ese caso migra el registro al hash).
const verificarPassword = async (ingresada, guardada) => {
  if (esHashBcrypt(guardada)) return bcrypt.compare(ingresada, guardada);
  return ingresada === guardada;
};

module.exports = { hashPassword, verificarPassword, esHashBcrypt };
