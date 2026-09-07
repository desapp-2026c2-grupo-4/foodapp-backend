const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

/**
 * Producto_Pedido según AGENTS.md §5.15
 * Producto_Pedido(
 *   id_producto,
 *   id_pedido,
 *   id_producto_pedido
 * )
 * Tabla intermedia simple entre Producto y Pedido (histórico ligero).
 * Se mantiene además DetallePedido (§5.6) que guarda cantidad/precio/observaciones.
 */
const ProductoPedido = sequelize.define("ProductoPedido", {
  id_producto_pedido: {
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
  id_pedido: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "pedidos", key: "id_pedido" },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  },
}, {
  tableName: "producto_pedido",
  timestamps: false,
  indexes: [
    { unique: true, fields: ["id_producto", "id_pedido"] },
  ],
});

module.exports = ProductoPedido;
