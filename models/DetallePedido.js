const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const DetallePedido = sequelize.define("DetallePedido", {
  id_detalle: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  id_pedido: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "pedidos", key: "id_pedido" },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  },
  id_producto: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "productos", key: "id_producto" },
    onUpdate: "CASCADE",
    onDelete: "RESTRICT",
  },
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1 },
  },
  precio: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: { min: 0 },
    comment: "Precio histórico al momento del pedido",
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  id_promocion: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: "promociones", key: "id_promocion" },
    onUpdate: "CASCADE",
    onDelete: "SET NULL",
    comment: "Promoción aplicada a esta línea (histórico §5.16). NULL = producto suelto",
  },
}, {
  tableName: "detalle_pedidos",
  timestamps: false,
});

module.exports = DetallePedido;
