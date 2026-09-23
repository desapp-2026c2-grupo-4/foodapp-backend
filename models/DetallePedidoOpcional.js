const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const DetallePedidoOpcional = sequelize.define("DetallePedidoOpcional", {
  id_detalle_opcional: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  id_detalle: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "detalle_pedidos", key: "id_detalle" },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  },
  id_opcional: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "opcionales", key: "id_opcional" },
    onUpdate: "CASCADE",
    onDelete: "RESTRICT",
  },
  // Snapshot del precio del opcional al momento del pedido
  precio: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 },
  },
}, {
  tableName: "detalle_pedido_opcionales",
  timestamps: false,
  indexes: [
    { unique: true, fields: ["id_detalle", "id_opcional"] },
  ],
});

module.exports = DetallePedidoOpcional;
