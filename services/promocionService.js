const { sequelize, Promocion, PromocionProducto, Producto } = require("../models");

const TIPOS = ["PRECIO_FIJO", "PORCENTAJE", "DOS_POR_UNO"];

/**
 * Indica si una promoción está vigente: activa y dentro de fecha_inicio/fecha_fin.
 */
function estaVigente(promocion, fechaRef = new Date()) {
  if (!promocion || !promocion.activa) return false;
  const hoy = fechaRef.toISOString().slice(0, 10);
  return promocion.fecha_inicio <= hoy && hoy <= promocion.fecha_fin;
}

/**
 * Calcula el precio promocional de un conjunto de productos.
 * @param {object} promocion - instancia con tipo y valor
 * @param {Array<{precio: number, cantidad: number}>} items - precios base vigentes
 * @returns {number} precio final del conjunto
 */
function calcularPrecioPromocional(promocion, items) {
  const totalBase = items.reduce((sum, i) => sum + parseFloat(i.precio) * i.cantidad, 0);
  switch (promocion.tipo) {
    case "PRECIO_FIJO":
      return parseFloat(promocion.valor);
    case "PORCENTAJE":
      return totalBase * (1 - parseFloat(promocion.valor) / 100);
    case "DOS_POR_UNO":
      // Por cada producto: de cada par se paga 1 (cantidad - floor(cantidad/2))
      return items.reduce(
        (sum, i) => sum + parseFloat(i.precio) * (i.cantidad - Math.floor(i.cantidad / 2)),
        0
      );
    default:
      return totalBase;
  }
}

function validarValorSegunTipo(tipo, valor) {
  const v = parseFloat(valor);
  if (tipo === "PORCENTAJE" && (v <= 0 || v > 100)) {
    const err = new Error("El valor de una promoción PORCENTAJE debe estar entre 0 y 100");
    err.status = 400;
    throw err;
  }
}

function validarVigencia(fecha_inicio, fecha_fin) {
  if (fecha_inicio && fecha_fin && fecha_fin < fecha_inicio) {
    const err = new Error("fecha_fin no puede ser anterior a fecha_inicio");
    err.status = 400;
    throw err;
  }
}

async function validarProductos(productos, transaction) {
  for (const item of productos) {
    if (!item.id_producto || !item.cantidad || item.cantidad < 1) {
      const err = new Error("Cada producto requiere id_producto y cantidad >= 1");
      err.status = 400;
      throw err;
    }
    const producto = await Producto.findByPk(item.id_producto, { transaction });
    if (!producto) {
      const err = new Error(`Producto ${item.id_producto} no encontrado`);
      err.status = 404;
      throw err;
    }
  }
}

async function fetchCompleta(id_promocion, transaction) {
  return Promocion.findByPk(id_promocion, {
    include: [{ model: Producto, as: "productos", through: { attributes: ["cantidad"] } }],
    transaction,
  });
}

/**
 * Crea una promoción con sus productos dentro de una transacción.
 */
async function crearPromocion({ nombre, descripcion, imagen, tipo, valor, fecha_inicio, fecha_fin, activa = true, productos = [] }) {
  validarVigencia(fecha_inicio, fecha_fin);
  validarValorSegunTipo(tipo, valor);
  const t = await sequelize.transaction();
  try {
    await validarProductos(productos, t);
    const promocion = await Promocion.create(
      { nombre, descripcion, imagen: imagen || null, tipo, valor, fecha_inicio, fecha_fin, activa },
      { transaction: t }
    );
    for (const item of productos) {
      await PromocionProducto.create(
        { id_promocion: promocion.id_promocion, id_producto: item.id_producto, cantidad: item.cantidad },
        { transaction: t }
      );
    }
    await t.commit();
    return fetchCompleta(promocion.id_promocion);
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

/**
 * Modifica una promoción. Si se envían productos, reemplaza el conjunto completo.
 */
async function modificarPromocion(id_promocion, { nombre, descripcion, imagen, tipo, valor, fecha_inicio, fecha_fin, activa, productos }) {
  const promocion = await Promocion.findByPk(id_promocion);
  if (!promocion) {
    const err = new Error("Promoción no encontrada");
    err.status = 404;
    throw err;
  }
  const t = await sequelize.transaction();
  try {
    const datos = {};
    for (const [k, v] of Object.entries({ nombre, descripcion, imagen, tipo, valor, fecha_inicio, fecha_fin, activa })) {
      if (v !== undefined) datos[k] = v;
    }
    const tipoFinal = datos.tipo ?? promocion.tipo;
    const valorFinal = datos.valor ?? promocion.valor;
    validarValorSegunTipo(tipoFinal, valorFinal);
    validarVigencia(datos.fecha_inicio ?? promocion.fecha_inicio, datos.fecha_fin ?? promocion.fecha_fin);
    if (productos !== undefined) await validarProductos(productos, t);
    if (Object.keys(datos).length > 0) await promocion.update(datos, { transaction: t });
    if (productos !== undefined) {
      await PromocionProducto.destroy({ where: { id_promocion }, transaction: t });
      for (const item of productos) {
        await PromocionProducto.create(
          { id_promocion, id_producto: item.id_producto, cantidad: item.cantidad },
          { transaction: t }
        );
      }
    }
    await t.commit();
    return fetchCompleta(id_promocion);
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

/**
 * Distribuye un total (en centavos) entre líneas con pesos, devolviendo
 * precios unitarios enteros en centavos que suman EXACTO el total.
 * El redondeo residual se absorbe en la primera línea.
 */
function distribuirPrecioUnitario(totalCentavos, lineas) {
  const totalPeso = lineas.reduce((sum, l) => sum + l.peso, 0);
  let unidades;
  if (totalPeso <= 0) {
    // Sin base (ej. todo gratis): reparto equitativo por unidad
    const totalUnidades = lineas.reduce((sum, l) => sum + l.cantidad, 0) || 1;
    unidades = lineas.map(() => Math.round(totalCentavos / totalUnidades));
  } else {
    unidades = lineas.map((l) => Math.round((totalCentavos * l.peso) / totalPeso / l.cantidad));
  }
  const suma = unidades.reduce((sum, u, i) => sum + u * lineas[i].cantidad, 0);
  unidades[0] += totalCentavos - suma; // ajuste al centavo, mantiene 2 decimales
  return unidades;
}

/**
 * Expande una promoción en líneas de DetallePedido para N unidades pedidas.
 * Valida vigencia, calcula el precio promocional con precios base actuales
 * y lo distribuye al centavo exacto entre las líneas.
 * @returns {Promise<Array<{id_producto, cantidad, precio, id_promocion}>>}
 */
async function expandirPromocion(id_promocion, cantidadPedido, transaction) {
  const promo = await fetchCompleta(id_promocion, transaction);
  if (!promo) {
    const err = new Error(`Promoción ${id_promocion} no encontrada`);
    err.status = 404;
    throw err;
  }
  if (!estaVigente(promo)) {
    const err = new Error(`La promoción "${promo.nombre}" no está vigente`);
    err.status = 400;
    throw err;
  }
  const base = promo.productos.map((p) => ({
    id_producto: p.id_producto,
    cantidad: p.PromocionProducto.cantidad,
    precio: parseFloat(p.precio),
  }));
  const precioBundle = calcularPrecioPromocional(promo, base);
  const totalCentavos = Math.round(precioBundle * cantidadPedido * 100);
  const lineas = base.map((b) => ({
    id_producto: b.id_producto,
    cantidad: b.cantidad * cantidadPedido,
    peso: b.precio * b.cantidad * cantidadPedido,
  }));
  const unitarios = distribuirPrecioUnitario(totalCentavos, lineas);
  return lineas.map((l, i) => ({
    id_producto: l.id_producto,
    cantidad: l.cantidad,
    precio: unitarios[i] / 100,
    id_promocion: promo.id_promocion,
  }));
}

module.exports = {
  TIPOS,
  estaVigente,
  calcularPrecioPromocional,
  crearPromocion,
  modificarPromocion,
  fetchCompleta,
  expandirPromocion,
};
