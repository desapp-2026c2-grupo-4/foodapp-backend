const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PromocionProducto = sequelize.define("PromocionProducto", {
  id_promocion_producto: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  id_promocion: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "promociones", key: "id_promocion" },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  },
  id_producto: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "productos", key: "id_producto" },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  },
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: { min: 1 },
    comment: "Unidades de este producto incluidas en la promoción",
  },
}, {
  tableName: "promocion_producto",
  timestamps: false,
  indexes: [
    { unique: true, fields: ["id_promocion", "id_producto"] },
  ],
});

module.exports = PromocionProducto;
