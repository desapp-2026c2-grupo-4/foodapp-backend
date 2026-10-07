const { Producto, Sucursal, ProductoSucursal } = require("../models");

function errorConStatus(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function validarSucursalYProducto(id_sucursal, id_producto, transaction) {
  const sucursal = await Sucursal.findByPk(id_sucursal, { transaction });
  if (!sucursal) throw errorConStatus(404, "Sucursal no encontrada");
  const producto = await Producto.findByPk(id_producto, { transaction });
  if (!producto) throw errorConStatus(404, `Producto ${id_producto} no encontrado`);
  return { sucursal, producto };
}

/**
 * Lista todos los productos con su stock en una sucursal.
 * Los productos sin fila en Producto_Sucursal se informan con stock 0.
 */
async function listarStockSucursal(id_sucursal) {
  const sucursal = await Sucursal.findByPk(id_sucursal);
  if (!sucursal) throw errorConStatus(404, "Sucursal no encontrada");
  const productos = await Producto.findAll({
    include: [{
      model: Sucursal,
      as: "sucursales",
      where: { id_sucursal },
      required: false,
      through: { attributes: ["stock"] },
    }],
    order: [["id_producto", "ASC"]],
  });
  return productos.map((p) => {
    const fila = (p.sucursales || [])[0];
    return {
      id_producto: p.id_producto,
      nombre: p.nombre,
      precio: p.precio,
      estado: p.estado,
      stock: fila && fila.ProductoSucursal ? fila.ProductoSucursal.stock : 0,
    };
  });
}

/**
 * Suma stock a un producto en una sucursal (crea la fila si no existe).
 */
async function agregarStock({ id_sucursal, id_producto, cantidad }, transaction) {
  if (!Number.isInteger(cantidad) || cantidad < 1) {
    throw errorConStatus(400, "La cantidad a agregar debe ser un entero >= 1");
  }
  const { producto } = await validarSucursalYProducto(id_sucursal, id_producto, transaction);
  const [fila] = await ProductoSucursal.findOrCreate({
    where: { id_sucursal, id_producto },
    defaults: { id_sucursal, id_producto, stock: 0 },
    transaction,
  });
  await fila.update({ stock: fila.stock + cantidad }, { transaction });
  return { id_sucursal, id_producto, nombre: producto.nombre, stock: fila.stock };
}

/**
 * Descuenta stock según las líneas de un pedido en una sucursal.
 * Agrega cantidades por producto, bloquea las filas y falla
 * con 409 si falta fila o no hay stock suficiente (hace rollback el pedido).
 */
async function descontarStock(lineas, id_sucursal, transaction) {
  const porProducto = new Map();
  for (const l of lineas) {
    porProducto.set(l.id_producto, (porProducto.get(l.id_producto) || 0) + l.cantidad);
  }
  for (const [id_producto, cantidad] of porProducto) {
    const { producto } = await validarSucursalYProducto(id_sucursal, id_producto, transaction);
    const fila = await ProductoSucursal.findOne({
      where: { id_sucursal, id_producto },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const disponible = fila ? fila.stock : 0;
    if (disponible < cantidad) {
      throw errorConStatus(409, `Stock insuficiente de ${producto.nombre} en la sucursal (disponible: ${disponible}, pedido: ${cantidad})`);
    }
    await fila.update({ stock: fila.stock - cantidad }, { transaction });
  }
}

module.exports = { listarStockSucursal, agregarStock, descontarStock };
