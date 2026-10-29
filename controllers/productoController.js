const { sequelize, Producto, Categoria, MateriaPrima, CategoriaProducto, ProductoMateriaPrima, Opcional } = require("../models");
const stockService = require("../services/stockService");
const { esStaff, sucursalPermitida } = require("../utils/authz");

const includes = [
  { model: Categoria, as: "categorias", through: { attributes: [] } },
  { model: MateriaPrima, as: "materiasPrimas", attributes: ["id_materia_prima", "nombre"], through: { attributes: ["cantidad"] } },
  { model: Opcional, as: "opcionales" },
];

const validarMateriasPrimas = async (materiasPrimas, transaction) => {
  if (!Array.isArray(materiasPrimas)) {
    return "materiasPrimas debe ser un array de { id_materia_prima, cantidad }";
  }
  for (const item of materiasPrimas) {
    if (!item || item.id_materia_prima === undefined) {
      return "Cada materia prima requiere id_materia_prima";
    }
    const cantidad = Number(item.cantidad);
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      return `La cantidad de la materia prima ${item.id_materia_prima} debe ser un entero >= 1`;
    }
    const materia = await MateriaPrima.findByPk(item.id_materia_prima, { transaction });
    if (!materia) return `Materia prima ${item.id_materia_prima} no encontrada`;
  }
  return null;
};

const getProductos = async (req, res, next) => {
  try {
    const productos = await Producto.findAll({
      include: includes,
      order: [["id_producto", "ASC"]],
    });
    // Con ?sucursal=<id> se adjunta el stock derivado de la receta en esa sucursal.
    // El stock es información operativa: solo ADMIN/EMPLEADO y con alcance de sucursal.
    const { sucursal } = req.query;
    if (sucursal) {
      if (!req.user) return res.status(401).json({ error: "Token requerido para consultar stock" });
      if (!esStaff(req.user)) return res.status(403).json({ error: "No tenés permisos para consultar stock" });
      if (!sucursalPermitida(req.user, sucursal)) {
        return res.status(403).json({ error: "No podés consultar stock de otra sucursal" });
      }
      const stockPorProducto = await stockService.calcularStockProductos(sucursal);
      return res.json(
        productos.map((p) => ({ ...p.toJSON(), stock: stockPorProducto.get(p.id_producto) ?? 0 }))
      );
    }
    res.json(productos);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

const getProductoById = async (req, res, next) => {
  try {
    const producto = await Producto.findByPk(req.params.id, { include: includes });
    if (!producto) return res.status(404).json({ error: "Producto no encontrado" });
    res.json(producto);
  } catch (err) {
    next(err);
  }
};

const updateProducto = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const producto = await Producto.findByPk(req.params.id, { transaction: t });
    if (!producto) {
      await t.rollback();
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const permitidos = ["nombre", "descripcion", "precio", "imagen", "estado"];
    const datos = {};
    for (const key of permitidos) {
      if (req.body[key] !== undefined) datos[key] = req.body[key];
    }
    const { categorias, materiasPrimas } = req.body;
    if (Object.keys(datos).length === 0 && categorias === undefined && materiasPrimas === undefined) {
      await t.rollback();
      return res.status(400).json({ error: "No se enviaron campos para actualizar" });
    }

    if (categorias !== undefined) {
      if (!Array.isArray(categorias)) {
        await t.rollback();
        return res.status(400).json({ error: "categorias debe ser un array de id_categoria" });
      }
      for (const id_categoria of categorias) {
        const cat = await Categoria.findByPk(id_categoria, { transaction: t });
        if (!cat) {
          await t.rollback();
          return res.status(404).json({ error: `Categoría ${id_categoria} no encontrada` });
        }
      }
    }
    if (materiasPrimas !== undefined) {
      const errorValidacion = await validarMateriasPrimas(materiasPrimas, t);
      if (errorValidacion) {
        await t.rollback();
        return res.status(400).json({ error: errorValidacion });
      }
    }

    if (Object.keys(datos).length > 0) {
      await producto.update(datos, { transaction: t });
    }
    // Sincronizar categorías (reemplaza las actuales por las enviadas)
    if (categorias !== undefined) {
      await CategoriaProducto.destroy({ where: { id_producto: producto.id_producto }, transaction: t });
      for (const id_categoria of categorias) {
        await CategoriaProducto.create(
          { id_producto: producto.id_producto, id_categoria },
          { transaction: t }
        );
      }
    }
    // Sincronizar receta (materias primas) reemplazando las actuales
    if (materiasPrimas !== undefined) {
      await ProductoMateriaPrima.destroy({ where: { id_producto: producto.id_producto }, transaction: t });
      for (const item of materiasPrimas) {
        await ProductoMateriaPrima.create({
          id_producto: producto.id_producto,
          id_materia_prima: item.id_materia_prima,
          cantidad: item.cantidad,
        }, { transaction: t });
      }
    }

    await t.commit();
    const actualizado = await Producto.findByPk(producto.id_producto, { include: includes });
    res.json(actualizado);
  } catch (err) {
    if (!t.finished) await t.rollback();
    next(err);
  }
};

const createProducto = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { nombre, descripcion, precio, imagen, estado, categorias, materiasPrimas } = req.body;
    if (!nombre || precio === undefined) {
      await t.rollback();
      return res.status(400).json({ error: "nombre y precio son obligatorios" });
    }
    if (categorias !== undefined && !Array.isArray(categorias)) {
      await t.rollback();
      return res.status(400).json({ error: "categorias debe ser un array de id_categoria" });
    }
    // Validar categorías antes de crear para no dejar el producto a medio crear
    if (Array.isArray(categorias)) {
      for (const id_categoria of categorias) {
        const cat = await Categoria.findByPk(id_categoria, { transaction: t });
        if (!cat) {
          await t.rollback();
          return res.status(404).json({ error: `Categoría ${id_categoria} no encontrada` });
        }
      }
    }
    const errorReceta = await validarMateriasPrimas(materiasPrimas || [], t);
    if (errorReceta) {
      await t.rollback();
      return res.status(400).json({ error: errorReceta });
    }

    const producto = await Producto.create(
      { nombre, descripcion, precio, imagen, estado },
      { transaction: t }
    );
    // categorias opcional: array de id_categoria
    if (Array.isArray(categorias) && categorias.length > 0) {
      for (const id_categoria of categorias) {
        await CategoriaProducto.create(
          { id_producto: producto.id_producto, id_categoria },
          { transaction: t }
        );
      }
    }
    // receta opcional: array de { id_materia_prima, cantidad }
    if (Array.isArray(materiasPrimas) && materiasPrimas.length > 0) {
      for (const item of materiasPrimas) {
        await ProductoMateriaPrima.create({
          id_producto: producto.id_producto,
          id_materia_prima: item.id_materia_prima,
          cantidad: item.cantidad,
        }, { transaction: t });
      }
    }
    await t.commit();
    const creado = await Producto.findByPk(producto.id_producto, { include: includes });
    res.status(201).json(creado);
  } catch (err) {
    if (!t.finished) await t.rollback();
    next(err);
  }
};

const deleteProducto = async (req, res, next) => {
  try {
    const producto = await Producto.findByPk(req.params.id);
    if (!producto) return res.status(404).json({ error: "Producto no encontrado" });
    await producto.destroy();
    res.json({ mensaje: "Producto dado de baja" });
  } catch (err) {
    next(err);
  }
};

module.exports = { getProductos, getProductoById, updateProducto, createProducto, deleteProducto };
