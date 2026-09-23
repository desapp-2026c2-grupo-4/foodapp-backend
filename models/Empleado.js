const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Empleado = sequelize.define("Empleado", {
  id_empleado: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: { type: DataTypes.STRING, allowNull: false },
  apellido: { type: DataTypes.STRING, allowNull: false },
  rol: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "ADMIN",
    validate: { isIn: [["ADMIN", "REPARTIDOR", "EMPLEADO"]] },
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    validate: { isEmail: true },
  },
  password: { type: DataTypes.STRING, allowNull: false },
  id_sucursal: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: "sucursales", key: "id_sucursal" },
    onUpdate: "CASCADE",
    onDelete: "SET NULL",
  },
}, {
  tableName: "empleados",
});

module.exports = Empleado;
