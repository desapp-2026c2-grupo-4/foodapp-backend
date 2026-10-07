const stockService = require("../services/stockService");

const getStock = async (req, res, next) => {
  try {
    const filas = await stockService.listarStockSucursal(req.query.sucursal);
    res.json(filas);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

const agregarStock = async (req, res, next) => {
  try {
    const fila = await stockService.agregarStock(req.body);
    res.json(fila);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

module.exports = { getStock, agregarStock };
