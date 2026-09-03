require("dotenv").config()
const express = require("express");
const pool = require("./config/db");

const app = express();
const PORT = process.env.PORT || 3000;

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

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
