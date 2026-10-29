const { Producto, Sucursal, MateriaPrima, MateriaPrimaSucursal, ProductoMateriaPrima } = require("../models");

function errorConStatus(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function validarSucursalYMateriaPrima(id_sucursal, id_materia_prima, transaction) {
  const sucursal = await Sucursal.findByPk(id_sucursal, { transaction });
  if (!sucursal) throw errorConStatus(404, "Sucursal no encontrada");
  const materia = await MateriaPrima.findByPk(id_materia_prima, { transaction });
  if (!materia) throw errorConStatus(404, `Materia prima ${id_materia_prima} no encontrada`);
  return { sucursal, materia };
}

// Devuelve el producto con su receta (materias primas y cantidad requerida por unidad).
async function productoConReceta(id_producto, transaction) {
  const producto = await Producto.findByPk(id_producto, {
    include: [{
      model: MateriaPrima,
      as: "materiasPrimas",
      through: { attributes: ["cantidad"] },
    }],
    transaction,
  });
  if (!producto) throw errorConStatus(404, `Producto ${id_producto} no encontrado`);
  return producto;
}

/**
 * Convierte un mapa de productos requeridos (id_producto -> cantidad) en
 * necesidades de materias primas (id_materia_prima -> cantidad), multiplicando
 * por la receta de cada producto. Un producto sin receta no puede producirse.
 */
async function necesidadesMateriasDesdeProductos(porProducto, transaction, { requerirReceta = true } = {}) {
  const necesidades = new Map();
  for (const [id_producto, cantidad] of porProducto) {
    const producto = await productoConReceta(id_producto, transaction);
    const receta = producto.materiasPrimas || [];
    if (receta.length === 0) {
      if (requerirReceta) {
        throw errorConStatus(409, `El producto ${producto.nombre} no tiene materias primas asignadas y no puede producirse`);
      }
      continue;
    }
    for (const mp of receta) {
      const requerida = mp.ProductoMateriaPrima.cantidad * cantidad;
      necesidades.set(mp.id_materia_prima, (necesidades.get(mp.id_materia_prima) || 0) + requerida);
    }
  }
  return necesidades;
}

/**
 * Lista todas las materias primas con su stock en una sucursal.
 * Las materias primas sin fila se informan con stock 0.
 */
async function listarStockSucursal(id_sucursal) {
  const sucursal = await Sucursal.findByPk(id_sucursal);
  if (!sucursal) throw errorConStatus(404, "Sucursal no encontrada");
  const materias = await MateriaPrima.findAll({
    include: [{
      model: Sucursal,
      as: "sucursales",
      where: { id_sucursal },
      required: false,
      through: { attributes: ["stock"] },
    }],
    order: [["id_materia_prima", "ASC"]],
  });
  return materias.map((m) => {
    const fila = (m.sucursales || [])[0];
    const stock = fila && fila.MateriaPrimaSucursal ? fila.MateriaPrimaSucursal.stock : 0;
    return {
      id_materia_prima: m.id_materia_prima,
      nombre: m.nombre,
      estado: m.estado,
      stock,
      stock_minimo: m.stock_minimo,
      bajo_stock: m.stock_minimo > 0 && stock < m.stock_minimo,
    };
  });
}

/**
 * Suma stock a una materia prima en una sucursal (crea la fila si no existe).
 */
async function agregarStock({ id_sucursal, id_materia_prima, cantidad }, transaction) {
  if (!Number.isInteger(cantidad) || cantidad < 1) {
    throw errorConStatus(400, "La cantidad a agregar debe ser un entero >= 1");
  }
  const { materia } = await validarSucursalYMateriaPrima(id_sucursal, id_materia_prima, transaction);
  const [fila] = await MateriaPrimaSucursal.findOrCreate({
    where: { id_sucursal, id_materia_prima },
    defaults: { id_sucursal, id_materia_prima, stock: 0 },
    transaction,
  });
  await fila.update({ stock: fila.stock + cantidad }, { transaction });
  return {
    id_sucursal,
    id_materia_prima,
    nombre: materia.nombre,
    stock: fila.stock,
    stock_minimo: materia.stock_minimo,
    bajo_stock: materia.stock_minimo > 0 && fila.stock < materia.stock_minimo,
  };
}

/**
 * Descuenta las materias primas necesarias para las líneas de un pedido en una
 * sucursal. Agrupa por producto, expande a materias primas según la receta,
 * bloquea las filas y falla con 409 si no hay stock suficiente (rollback).
 */
async function descontarStock(lineas, id_sucursal, transaction) {
  const porProducto = new Map();
  for (const l of lineas) {
    porProducto.set(l.id_producto, (porProducto.get(l.id_producto) || 0) + l.cantidad);
  }
  const necesidades = await necesidadesMateriasDesdeProductos(porProducto, transaction);
  for (const [id_materia_prima, cantidad] of necesidades) {
    const { materia } = await validarSucursalYMateriaPrima(id_sucursal, id_materia_prima, transaction);
    const fila = await MateriaPrimaSucursal.findOne({
      where: { id_sucursal, id_materia_prima },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const disponible = fila ? fila.stock : 0;
    if (disponible < cantidad) {
      throw errorConStatus(409, `Stock insuficiente de ${materia.nombre} en la sucursal (disponible: ${disponible}, requerido: ${cantidad})`);
    }
    await fila.update({ stock: fila.stock - cantidad }, { transaction });
  }
}

/**
 * Repone las materias primas consumidas por un pedido (por ejemplo al cancelarlo).
 */
async function reponerStock(lineas, id_sucursal, transaction) {
  const porProducto = new Map();
  for (const l of lineas) {
    porProducto.set(l.id_producto, (porProducto.get(l.id_producto) || 0) + l.cantidad);
  }
  const necesidades = await necesidadesMateriasDesdeProductos(porProducto, transaction, { requerirReceta: false });
  for (const [id_materia_prima, cantidad] of necesidades) {
    const [fila] = await MateriaPrimaSucursal.findOrCreate({
      where: { id_sucursal, id_materia_prima },
      defaults: { id_sucursal, id_materia_prima, stock: 0 },
      transaction,
    });
    await fila.update({ stock: fila.stock + cantidad }, { transaction });
  }
}

/**
 * Stock disponible de un producto en una sucursal, derivado de su receta:
 * min( floor(stock_materia_prima / cantidad_receta) ). Sin receta => 0.
 */
/**
 * Stock derivado de varios productos en una sucursal, en pocas queries:
 * lee toda la receta y todo el stock de materias primas de la sucursal una vez
 * y calcula min( floor(stock_materia_prima / cantidad_receta) ) por producto.
 * Devuelve un Map<id_producto, stock>. Productos sin receta => 0.
 */
async function calcularStockProductos(id_sucursal, transaction) {
  const sucursal = await Sucursal.findByPk(id_sucursal, { transaction });
  if (!sucursal) throw errorConStatus(404, "Sucursal no encontrada");

  const [recetas, stockMaterias] = await Promise.all([
    ProductoMateriaPrima.findAll({ transaction }),
    MateriaPrimaSucursal.findAll({ where: { id_sucursal }, transaction }),
  ]);

  const stockPorMateria = new Map();
  for (const fila of stockMaterias) {
    stockPorMateria.set(fila.id_materia_prima, fila.stock);
  }

  const stockPorProducto = new Map();
  for (const item of recetas) {
    const disponible = stockPorMateria.get(item.id_materia_prima) || 0;
    const unidades = Math.floor(disponible / item.cantidad);
    const actual = stockPorProducto.has(item.id_producto) ? stockPorProducto.get(item.id_producto) : Infinity;
    stockPorProducto.set(item.id_producto, Math.min(actual, unidades));
  }
  return stockPorProducto;
}

/**
 * Stock disponible de un producto en una sucursal, derivado de su receta:
 * min( floor(stock_materia_prima / cantidad_receta) ). Sin receta => 0.
 */
async function calcularStockProducto(id_producto, id_sucursal, transaction) {
  const producto = await productoConReceta(id_producto, transaction);
  const sucursal = await Sucursal.findByPk(id_sucursal, { transaction });
  if (!sucursal) throw errorConStatus(404, "Sucursal no encontrada");
  const receta = producto.materiasPrimas || [];
  if (receta.length === 0) return 0;
  let minimo = Infinity;
  for (const mp of receta) {
    const requerida = mp.ProductoMateriaPrima.cantidad;
    const fila = await MateriaPrimaSucursal.findOne({
      where: { id_sucursal, id_materia_prima: mp.id_materia_prima },
      transaction,
    });
    const disponible = fila ? fila.stock : 0;
    minimo = Math.min(minimo, Math.floor(disponible / requerida));
  }
  return minimo === Infinity ? 0 : minimo;
}

module.exports = {
  listarStockSucursal,
  agregarStock,
  descontarStock,
  reponerStock,
  necesidadesMateriasDesdeProductos,
  calcularStockProducto,
  calcularStockProductos,
};
