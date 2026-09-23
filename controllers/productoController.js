const { Producto, Categoria, Sucursal, CategoriaProducto, Opcional } = require("../models");

const getProductos = async (req, res, next) => {
  try {
    const productos = await Producto.findAll({
      include: [
        { model: Categoria, as: "categorias", through: { attributes: [] } },
        { model: Sucursal, as: "sucursales", through: { attributes: ["stock"] } },
        { model: Opcional, as: "opcionales" },
      ],
      order: [["id_producto", "ASC"]],
    });
    res.json(productos);
  } catch (err) {
    next(err);
  }
};

const getProductoById = async (req, res, next) => {
  try {
    const producto = await Producto.findByPk(req.params.id, {
      include: [
        { model: Categoria, as: "categorias", through: { attributes: [] } },
        { model: Sucursal, as: "sucursales", through: { attributes: ["stock"] } },
        { model: Opcional, as: "opcionales" },
      ],
    });
    if (!producto) return res.status(404).json({ error: "Producto no encontrado" });
    res.json(producto);
  } catch (err) {
    next(err);
  }
};

const updateProducto = async (req, res, next) => {
  try {
    const producto = await Producto.findByPk(req.params.id);
    if (!producto) return res.status(404).json({ error: "Producto no encontrado" });

    const permitidos = ["nombre", "descripcion", "precio", "imagen", "estado"];
    const datos = {};
    for (const key of permitidos) {
      if (req.body[key] !== undefined) datos[key] = req.body[key];
    }
    const { categorias } = req.body;
    if (Object.keys(datos).length === 0 && categorias === undefined) {
      return res.status(400).json({ error: "No se enviaron campos para actualizar" });
    }

    await producto.update(datos);
    // Sincronizar categorías (reemplaza las actuales por las enviadas)
    if (categorias !== undefined) {
      if (!Array.isArray(categorias)) {
        return res.status(400).json({ error: "categorias debe ser un array de id_categoria" });
      }
      for (const id_categoria of categorias) {
        const cat = await Categoria.findByPk(id_categoria);
        if (!cat) return res.status(404).json({ error: `Categoría ${id_categoria} no encontrada` });
      }
      await CategoriaProducto.destroy({ where: { id_producto: producto.id_producto } });
      for (const id_categoria of categorias) {
        await CategoriaProducto.create({ id_producto: producto.id_producto, id_categoria });
      }
    }
    const actualizado = await Producto.findByPk(producto.id_producto, {
      include: [
        { model: Categoria, as: "categorias", through: { attributes: [] } },
        { model: Sucursal, as: "sucursales", through: { attributes: ["stock"] } },
        { model: Opcional, as: "opcionales" },
      ],
    });
    res.json(actualizado);
  } catch (err) {
    next(err);
  }
};

const createProducto = async (req, res, next) => {
  try {
    const { nombre, descripcion, precio, imagen, estado, categorias } = req.body;
    if (!nombre || precio === undefined) {
      return res.status(400).json({ error: "nombre y precio son obligatorios" });
    }
    // Validar categorías antes de crear para no dejar el producto a medio crear
    if (Array.isArray(categorias)) {
      for (const id_categoria of categorias) {
        const cat = await Categoria.findByPk(id_categoria);
        if (!cat) return res.status(404).json({ error: `Categoría ${id_categoria} no encontrada` });
      }
    }
    const producto = await Producto.create({ nombre, descripcion, precio, imagen, estado });
    // categorias opcional: array de id_categoria
    if (Array.isArray(categorias) && categorias.length > 0) {
      for (const id_categoria of categorias) {
        await CategoriaProducto.create({ id_producto: producto.id_producto, id_categoria });
      }
    }
    const creado = await Producto.findByPk(producto.id_producto, {
      include: [
        { model: Categoria, as: "categorias", through: { attributes: [] } },
        { model: Sucursal, as: "sucursales", through: { attributes: ["stock"] } },
        { model: Opcional, as: "opcionales" },
      ],
    });
    res.status(201).json(creado);
  } catch (err) {
    next(err);
  }
};

const deleteProducto = async (req, res, next) => {
  try {
    const producto = await Producto.findByPk(req.params.id);
    if (!producto) return res.status(404).json({ error: "Producto no encontrado" });
    await producto.destroy();
    res.json({ mensaje: "Producto eliminado" });
  } catch (err) {
    // FK restrict si tiene detalles
    if (err.name === "SequelizeForeignKeyConstraintError") {
      return res.status(409).json({ error: "No se puede eliminar producto con pedidos asociados" });
    }
    next(err);
  }
};

module.exports = { getProductos, getProductoById, updateProducto, createProducto, deleteProducto };
