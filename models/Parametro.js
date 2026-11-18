const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Parametro = sequelize.define("Parametro", {
  id_parametro: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  clave: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { notEmpty: true },
  },
  valor: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  tipo: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "string",
    validate: { isIn: [["string", "integer", "decimal", "boolean"]] },
  },
  grupo: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "general",
  },
  descripcion: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  id_empleado_actualizacion: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: "empleados", key: "id_empleado" },
    onUpdate: "CASCADE",
    onDelete: "SET NULL",
  },
}, {
  tableName: "parametros",
  timestamps: true,
});

module.exports = Parametro;
