require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const pool = require("./config/db");
const { sequelize } = require("./models");
const errorMiddleware = require("./middlewares/errorMiddleware");

const productoRoutes = require("./routes/productoRoutes");
const sucursalRoutes = require("./routes/sucursalRoutes");
const pedidoRoutes = require("./routes/pedidoRoutes");
const clienteRoutes = require("./routes/clienteRoutes");
const { router: opcionalRoutes } = require("./routes/opcionalRoutes");
const categoriaRoutes = require("./routes/categoriaRoutes");
const promocionRoutes = require("./routes/promocionRoutes");
const reporteRoutes = require("./routes/reporteRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("La app funciona");
});

app.get("/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT 1 AS ok");
    res.json({ mensaje: "Conexión OK", data: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error de conexión", error: error.message });
  }
});

app.get("/health", async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: "ok", db: "connected" });
  } catch (e) {
    res.status(500).json({ status: "error", error: e.message });
  }
});

// Rutas API según AGENTS.md §8 - endpoints REST sin duplicar por rol
app.use("/api/productos", productoRoutes);
app.use("/api/opcionales", opcionalRoutes);
app.use("/api/sucursales", sucursalRoutes);
app.use("/api/pedidos", pedidoRoutes);
app.use("/api/clientes", clienteRoutes);
app.use("/api/categorias", categoriaRoutes);
app.use("/api/promociones", promocionRoutes);
app.use("/api/reportes", reporteRoutes);

app.use(errorMiddleware);

// Sincronización no forzada al levantar; usar scripts/sync.js con --force si se requiere recrear
sequelize.authenticate()
  .then(() => console.log("Sequelize conectado a PostgreSQL"))
  .catch((err) => console.error("Error Sequelize:", err.message));

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
  });
}

module.exports = app;
