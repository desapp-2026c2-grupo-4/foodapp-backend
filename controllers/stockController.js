const stockService = require("../services/stockService");
const { sucursalPermitida } = require("../utils/authz");

const noAutorizadoSucursal = (res) =>
  res.status(403).json({ error: "No podés operar sobre otra sucursal" });

const getStock = async (req, res, next) => {
  try {
    const idSucursal = req.query.sucursal;
    if (!idSucursal) return res.status(404).json({ error: "Sucursal no encontrada" });
    if (!sucursalPermitida(req.user, idSucursal)) return noAutorizadoSucursal(res);
    const filas = await stockService.listarStockSucursal(idSucursal);
    res.json(filas);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

const agregarStock = async (req, res, next) => {
  try {
    const idSucursal = req.body.id_sucursal;
    if (!sucursalPermitida(req.user, idSucursal)) return noAutorizadoSucursal(res);
    const fila = await stockService.agregarStock(req.body);
    res.json(fila);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

// GET /api/productos/:id/stock?sucursal=  -> stock derivado de la receta
const getStockProducto = async (req, res, next) => {
  try {
    const id_sucursal = req.query.sucursal;
    if (!id_sucursal) {
      return res.status(400).json({ error: "La query sucursal es obligatoria" });
    }
    if (!sucursalPermitida(req.user, id_sucursal)) return noAutorizadoSucursal(res);
    const stock = await stockService.calcularStockProducto(req.params.id, id_sucursal);
    res.json({ id_producto: Number(req.params.id), id_sucursal: Number(id_sucursal), stock });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

module.exports = { getStock, agregarStock, getStockProducto };
