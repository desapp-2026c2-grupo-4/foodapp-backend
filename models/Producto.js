const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Producto = sequelize.define("Producto", {
  id_producto: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: { type: DataTypes.STRING, allowNull: false },
  descripcion: { type: DataTypes.TEXT, allowNull: true },
  precio: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: { min: 0 },
  },
  imagen: { type: DataTypes.STRING, allowNull: true },
  estado: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "disponible",
    validate: { isIn: [["disponible", "no_disponible", "pausado"]] },
  },
}, {
  tableName: "productos",
});

module.exports = Producto;
