const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Pedido = sequelize.define("Pedido", {
  id_pedido: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  fecha_hora: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  importe: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 },
  },
  estado: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "Pendiente",
    validate: {
      isIn: [["Pendiente", "Confirmado", "Preparando", "Listo", "En camino", "Entregado", "Cancelado"]],
    },
  },
  id_cliente: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "clientes", key: "id_cliente" },
    onUpdate: "CASCADE",
    onDelete: "RESTRICT",
  },
  id_sucursal: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: "sucursales", key: "id_sucursal" },
    onUpdate: "CASCADE",
    onDelete: "SET NULL",
  },
  id_direccion: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "direcciones", key: "id_direccion" },
    onUpdate: "CASCADE",
    onDelete: "RESTRICT",
  },
}, {
  tableName: "pedidos",
  updatedAt: false,
  createdAt: "fecha_hora",
});

module.exports = Pedido;
