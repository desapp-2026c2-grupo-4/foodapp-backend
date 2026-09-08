const { Pedido, DetallePedido, HistorialPedido, Cliente, Sucursal, Direccion, Producto, sequelize } = require("../models");
const pedidoService = require("../services/pedidoService");

const getPedidos = async (req, res, next) => {
  try {
    const pedidos = await Pedido.findAll({
      include: [
        { model: Cliente, as: "cliente", attributes: ["id_cliente", "nombre", "apellido", "email"] },
        { model: Sucursal, as: "sucursal" },
        { model: Direccion, as: "direccion" },
        { model: DetallePedido, as: "detalles", include: [{ model: Producto, as: "producto" }] },
        { model: HistorialPedido, as: "historial" },
      ],
      order: [["id_pedido", "ASC"]],
    });
    res.json(pedidos);
  } catch (err) {
    next(err);
  }
};

const getPedidoById = async (req, res, next) => {
  try {
    const pedido = await Pedido.findByPk(req.params.id, {
      include: [
        { model: Cliente, as: "cliente", attributes: ["id_cliente", "nombre", "apellido", "email"] },
        { model: Sucursal, as: "sucursal" },
        { model: Direccion, as: "direccion" },
        { model: DetallePedido, as: "detalles", include: [{ model: Producto, as: "producto" }] },
        { model: HistorialPedido, as: "historial" },
      ],
    });
    if (!pedido) return res.status(404).json({ error: "Pedido no encontrado" });
    res.json(pedido);
  } catch (err) {
    next(err);
  }
};

const updatePedido = async (req, res, next) => {
  try {
    const pedido = await Pedido.findByPk(req.params.id);
    if (!pedido) return res.status(404).json({ error: "Pedido no encontrado" });

    const permitidos = ["estado", "id_sucursal", "importe"];
    const datos = {};
    for (const key of permitidos) {
      if (req.body[key] !== undefined) datos[key] = req.body[key];
    }
    if (Object.keys(datos).length === 0) {
      return res.status(400).json({ error: "No se enviaron campos para actualizar" });
    }

    // Si cambia estado, registrar en historial
    const estadoAnterior = pedido.estado;
    await pedido.update(datos);

    if (datos.estado && datos.estado !== estadoAnterior) {
      await HistorialPedido.create({
        id_pedido: pedido.id_pedido,
        estado: datos.estado,
        fecha_hora: new Date(),
      });
    }

    // Garantizar consistencia de importe = SUM(cantidad*precio) de DetallePedido
    // Si el cliente envió importe manual, se valida contra el cálculo; si difiere se corrige.
    const importeCalculado = await pedidoService.calcularImporte(pedido.id_pedido);
    const importeActual = parseFloat(pedido.importe);
    if (importeCalculado !== importeActual) {
      // No se considera error fatal, pero se autocorrige para mantener Pedido.importe consistente
      // según AGENTS.md §5.14 y §5.6 (precio histórico * cantidad)
      await pedido.update({ importe: importeCalculado });
    }

    const actualizado = await Pedido.findByPk(pedido.id_pedido, {
      include: [
        { model: Cliente, as: "cliente", attributes: ["id_cliente", "nombre", "apellido", "email"] },
        { model: Sucursal, as: "sucursal" },
        { model: Direccion, as: "direccion" },
        { model: DetallePedido, as: "detalles", include: [{ model: Producto, as: "producto" }] },
        { model: HistorialPedido, as: "historial" },
      ],
    });
    res.json(actualizado);
  } catch (err) {
    next(err);
  }
};

const createPedido = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id_cliente, id_direccion, id_sucursal, detalles, estado } = req.body;
    if (!id_cliente || !id_direccion || !Array.isArray(detalles) || detalles.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: "id_cliente, id_direccion y detalles (array no vacío) son obligatorios" });
    }
    // Validar cliente y direccion
    const cliente = await Cliente.findByPk(id_cliente, { transaction: t });
    if (!cliente) { await t.rollback(); return res.status(404).json({ error: "Cliente no encontrado" }); }
    const direccion = await Direccion.findByPk(id_direccion, { transaction: t });
    if (!direccion) { await t.rollback(); return res.status(404).json({ error: "Direccion no encontrada" }); }
    if (direccion.id_cliente !== id_cliente) {
      await t.rollback();
      return res.status(400).json({ error: "La dirección no pertenece al cliente" });
    }
    if (id_sucursal) {
      const suc = await Sucursal.findByPk(id_sucursal, { transaction: t });
      if (!suc) { await t.rollback(); return res.status(404).json({ error: "Sucursal no encontrada" }); }
    }
    // Crear pedido con importe 0 temporal
    const pedido = await Pedido.create({
      id_cliente,
      id_direccion,
      id_sucursal: id_sucursal || null,
      estado: estado || "Pendiente",
      importe: 0,
    }, { transaction: t });

    // Crear detalles + Producto_Pedido
    const { ProductoPedido } = require("../models");
    let importe = 0;
    for (const item of detalles) {
      const { id_producto, cantidad, observaciones } = item;
      if (!id_producto || !cantidad || cantidad < 1) {
        await t.rollback();
        return res.status(400).json({ error: "Cada detalle requiere id_producto y cantidad >=1" });
      }
      const producto = await Producto.findByPk(id_producto, { transaction: t });
      if (!producto) { await t.rollback(); return res.status(404).json({ error: `Producto ${id_producto} no encontrado` }); }
      const precio = parseFloat(producto.precio); // snapshot histórico
      await DetallePedido.create({
        id_pedido: pedido.id_pedido,
        id_producto,
        cantidad,
        precio,
        observaciones: observaciones || null,
      }, { transaction: t });
      // Producto_Pedido N:M simple (§5.15) - si ya existe, ignorar conflicto
      await ProductoPedido.findOrCreate({
        where: { id_pedido: pedido.id_pedido, id_producto },
        defaults: { id_pedido: pedido.id_pedido, id_producto },
        transaction: t,
      });
      importe += cantidad * precio;
    }
    await pedido.update({ importe }, { transaction: t });
    await HistorialPedido.create({
      id_pedido: pedido.id_pedido,
      estado: pedido.estado,
      fecha_hora: new Date(),
    }, { transaction: t });

    await t.commit();
    const creado = await Pedido.findByPk(pedido.id_pedido, {
      include: [
        { model: Cliente, as: "cliente", attributes: ["id_cliente", "nombre", "apellido", "email"] },
        { model: Sucursal, as: "sucursal" },
        { model: Direccion, as: "direccion" },
        { model: DetallePedido, as: "detalles", include: [{ model: Producto, as: "producto" }] },
        { model: HistorialPedido, as: "historial" },
      ],
    });
    res.status(201).json(creado);
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

const deletePedido = async (req, res, next) => {
  try {
    const pedido = await Pedido.findByPk(req.params.id);
    if (!pedido) return res.status(404).json({ error: "Pedido no encontrado" });
    await pedido.destroy(); // CASCADE borra detalles, historial y producto_pedido
    res.json({ mensaje: "Pedido eliminado" });
  } catch (err) {
    next(err);
  }
};

// GET /api/pedidos/:id/detalles - detalle de un pedido por id_pedido
const getDetallesByPedidoId = async (req, res, next) => {
  try {
    const pedido = await Pedido.findByPk(req.params.id);
    if (!pedido) return res.status(404).json({ error: "Pedido no encontrado" });
    const detalles = await DetallePedido.findAll({
      where: { id_pedido: req.params.id },
      include: [{ model: Producto, as: "producto" }],
      order: [["id_detalle", "ASC"]],
    });
    // También devolver importe calculado para verificación: sum(cantidad*precio)
    const importeCalculado = detalles.reduce((sum, d) => sum + d.cantidad * parseFloat(d.precio), 0);
    res.json({ id_pedido: pedido.id_pedido, importe: pedido.importe, importeCalculado, detalles });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPedidos, getPedidoById, updatePedido, createPedido, deletePedido, getDetallesByPedidoId };
