const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const SucursalHorario = sequelize.define("SucursalHorario", {
  id_horario: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  id_sucursal: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "sucursales", key: "id_sucursal" },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  },
  dia_semana: {
    type: DataTypes.SMALLINT,
    allowNull: false,
    validate: { min: 1, max: 7 },
  },
  hora_apertura: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  hora_cierre: {
    type: DataTypes.TIME,
    allowNull: false,
  },
}, {
  tableName: "sucursal_horarios",
  timestamps: false,
  indexes: [
    { unique: true, fields: ["id_sucursal", "dia_semana"] },
  ],
});

module.exports = SucursalHorario;
