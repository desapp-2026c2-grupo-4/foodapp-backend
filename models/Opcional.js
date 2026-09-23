const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Opcional = sequelize.define("Opcional", {
  id_opcional: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  precio: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 },
    comment: "Precio extra del opcional",
  },
  estado: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "disponible",
    validate: { isIn: [["disponible", "no_disponible"]] },
  },
  id_producto: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "productos", key: "id_producto" },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  },
}, {
  tableName: "opcionales",
});

module.exports = Opcional;
