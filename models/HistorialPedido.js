const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const HistorialPedido = sequelize.define("HistorialPedido", {
  id_historial: {
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
  estado: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  fecha_hora: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: "historial_pedidos",
  timestamps: false,
});

module.exports = HistorialPedido;
