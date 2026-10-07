const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Banner = sequelize.define("Banner", {
  id_banner: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  titulo: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  imagen: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  orden: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 },
  },
}, {
  tableName: "banners",
});

module.exports = Banner;
