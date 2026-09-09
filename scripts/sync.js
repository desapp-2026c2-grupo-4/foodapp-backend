require("dotenv").config();
const { sequelize } = require("../models");

const force = process.argv.includes("--force");

(async () => {
  try {
    await sequelize.authenticate();
    console.log("Conexión OK, sincronizando modelos...");
    await sequelize.sync({ force });
    console.log(`Sincronización ${force ? "force (drop + create)" : "alter"} completada`);
    process.exit(0);
  } catch (err) {
    console.error("Error al sincronizar:", err);
    process.exit(1);
  }
})();
