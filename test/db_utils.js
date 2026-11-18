const { sequelize } = require("../models");
const parametroService = require("../services/parametroService");
const { crearAdmin, resetAdmin } = require("./helpers/auth");

// Recrea el esquema completo en la base de test.
// Solo usar en tests (la conexión la define test/setup.js).
async function resetDb() {
  resetAdmin();
  parametroService.resetCache();
  await sequelize.sync({ force: true });
  await crearAdmin();
}

async function closeDb() {
  await sequelize.close();
}

module.exports = { resetDb, closeDb };
