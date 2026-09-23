const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Promocion = sequelize.define("Promocion", {
  id_promocion: {
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
  imagen: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  tipo: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { isIn: [["PRECIO_FIJO", "PORCENTAJE", "DOS_POR_UNO"]] },
    comment: "PRECIO_FIJO: precio final del conjunto. PORCENTAJE: % de descuento. DOS_POR_UNO: 2x1",
  },
  valor: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 },
    comment: "Precio final (PRECIO_FIJO) o porcentaje de descuento (PORCENTAJE)",
  },
  fecha_inicio: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  fecha_fin: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  activa: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: "promociones",
});

module.exports = Promocion;
