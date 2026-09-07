const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Cliente = sequelize.define("Cliente", {
  id_cliente: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  apellido: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  tipo_doc: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  dni: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  tableName: "clientes",
});

module.exports = Cliente;
