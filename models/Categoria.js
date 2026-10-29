const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Categoria = sequelize.define("Categoria", {
  id_categoria: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
}, {
  tableName: "categorias",
  // timestamps con createdAt/updatedAt desactivados: solo agrega deleted_at
  timestamps: true,
  createdAt: false,
  updatedAt: false,
  paranoid: true,
});

module.exports = Categoria;
