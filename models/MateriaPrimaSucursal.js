const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const MateriaPrimaSucursal = sequelize.define("MateriaPrimaSucursal", {
  id_materia_prima: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
    references: { model: "materias_primas", key: "id_materia_prima" },
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
  tableName: "materia_prima_sucursal",
  timestamps: false,
});

module.exports = MateriaPrimaSucursal;
