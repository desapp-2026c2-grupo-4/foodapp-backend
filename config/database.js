const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DATABASE_URL,
  {
    dialect: "postgres",
    logging: false,
    define: {
      underscored: true,
      timestamps: true,
    },
  }
);

module.exports = sequelize;
