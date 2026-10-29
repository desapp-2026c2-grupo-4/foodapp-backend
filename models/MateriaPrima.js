const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const MateriaPrima = sequelize.define("MateriaPrima", {
  id_materia_prima: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { notEmpty: true },
  },
  estado: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "disponible",
    validate: { isIn: [["disponible", "no_disponible"]] },
  },
  stock_minimo: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 },
  },
}, {
  tableName: "materias_primas",
  paranoid: true,
});

module.exports = MateriaPrima;
