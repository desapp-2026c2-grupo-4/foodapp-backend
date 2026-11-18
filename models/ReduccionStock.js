const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ReduccionStock = sequelize.define("ReduccionStock", {
  id_reduccion_stock: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  id_sucursal: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "sucursales", key: "id_sucursal" },
    onUpdate: "CASCADE",
    onDelete: "RESTRICT",
  },
  id_materia_prima: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "materias_primas", key: "id_materia_prima" },
    onUpdate: "CASCADE",
    onDelete: "RESTRICT",
  },
  id_empleado: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "empleados", key: "id_empleado" },
    onUpdate: "CASCADE",
    onDelete: "RESTRICT",
  },
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1 },
  },
  stock_anterior: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 0 },
  },
  stock_nuevo: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 0 },
  },
  motivo: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: { notEmpty: true },
  },
  fecha_hora: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: "reducciones_stock",
  timestamps: false,
});

module.exports = ReduccionStock;
