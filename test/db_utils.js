const { sequelize } = require("../models");
const { crearAdmin, resetAdmin } = require("./helpers/auth");

// Recrea el esquema completo en la base de test.
// Solo usar en tests (la conexión la define test/setup.js).
async function resetDb() {
  resetAdmin();
  await sequelize.sync({ force: true });
  await crearAdmin();
}

async function closeDb() {
  await sequelize.close();
}

module.exports = { resetDb, closeDb };
