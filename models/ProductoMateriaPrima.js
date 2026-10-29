const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ProductoMateriaPrima = sequelize.define("ProductoMateriaPrima", {
  id_producto: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
    references: { model: "productos", key: "id_producto" },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  },
  id_materia_prima: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
    references: { model: "materias_primas", key: "id_materia_prima" },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  },
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: { min: 1 },
    comment: "Unidades de materia prima requeridas por unidad de producto",
  },
}, {
  tableName: "producto_materia_prima",
  timestamps: false,
});

module.exports = ProductoMateriaPrima;
