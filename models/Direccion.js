const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Direccion = sequelize.define("Direccion", {
  id_direccion: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  calle: { type: DataTypes.STRING, allowNull: false },
  altura: { type: DataTypes.STRING, allowNull: false },
  piso: { type: DataTypes.STRING, allowNull: true },
  departamento: { type: DataTypes.STRING, allowNull: true },
  ciudad: { type: DataTypes.STRING, allowNull: false },
  provincia: { type: DataTypes.STRING, allowNull: false },
  latitud: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
  longitud: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
  id_cliente: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "clientes", key: "id_cliente" },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  },
}, {
  tableName: "direcciones",
});

module.exports = Direccion;
