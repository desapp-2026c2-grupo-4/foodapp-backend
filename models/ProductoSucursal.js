const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ProductoSucursal = sequelize.define("ProductoSucursal", {
  id_producto: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
    references: { model: "productos", key: "id_producto" },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  },
  id_sucursal: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
    references: { model: "sucursales", key: "id_sucursal" },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  },
  stock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 },
  },
}, {
  tableName: "producto_sucursal",
  timestamps: false,
});

module.exports = ProductoSucursal;
