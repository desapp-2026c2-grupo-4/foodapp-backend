const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Sucursal = sequelize.define("Sucursal", {
  id_sucursal: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: { type: DataTypes.STRING, allowNull: false },
  estado: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "activa",
    validate: { isIn: [["activa", "inactiva", "cerrada"]] },
  },
  telefono: { type: DataTypes.STRING, allowNull: true },
  horario: { type: DataTypes.STRING, allowNull: true },
  calle: { type: DataTypes.STRING, allowNull: false },
  altura: { type: DataTypes.STRING, allowNull: false },
  ciudad: { type: DataTypes.STRING, allowNull: false },
  provincia: { type: DataTypes.STRING, allowNull: false },
  latitud: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
  longitud: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
}, {
  tableName: "sucursales",
});

module.exports = Sucursal;
