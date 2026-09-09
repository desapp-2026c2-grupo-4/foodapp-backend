const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const CategoriaProducto = sequelize.define("CategoriaProducto", {
  id_categoria_producto: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  id_producto: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "productos", key: "id_producto" },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  },
  id_categoria: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "categorias", key: "id_categoria" },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  },
}, {
  tableName: "categoria_producto",
  timestamps: false,
  indexes: [
    { unique: true, fields: ["id_producto", "id_categoria"] },
  ],
});

module.exports = CategoriaProducto;
