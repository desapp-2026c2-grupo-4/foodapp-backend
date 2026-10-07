const { sequelize } = require("../models");

// Recrea el esquema completo en la base de test.
// Solo usar en tests (la conexión la define test/setup.js).
async function resetDb() {
  await sequelize.sync({ force: true });
}

async function closeDb() {
  await sequelize.close();
}

module.exports = { resetDb, closeDb };
