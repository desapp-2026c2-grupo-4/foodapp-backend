const { Pedido, DetallePedido, DetallePedidoOpcional, HistorialPedido, Cliente, Sucursal, Direccion, Producto, Opcional, Promocion, sequelize } = require("../models");
const stockService = require("../services/stockService");
const pedidoService = require("../services/pedidoService");

// Flujo de estados en un solo sentido: Pendiente -> Confirmado -> Preparando -> En camino -> Entregado
// No se permite volver a un estado anterior.
const FLUJO_ESTADOS = ["Pendiente", "Confirmado", "Preparando", "En camino", "Entregado"];

const getPedidos = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.id_cliente) where.id_cliente = req.query.id_cliente;
    if (req.query.id_sucursal) where.id_sucursal = req.query.id_sucursal;
    const pedidos = await Pedido.findAll({
      where,
      include: [
        { model: Cliente, as: "cliente", attributes: ["id_cliente", "nombre", "apellido", "email"] },
        { model: Sucursal, as: "sucursal" },
        { model: Direccion, as: "direccion" },
        {
          model: DetallePedido,
          as: "detalles",
          include: [
            { model: Producto, as: "producto" },
            { model: DetallePedidoOpcional, as: "opciones", include: [{ model: Opcional, as: "opcional" }] },
            { model: Promocion, as: "promocion", attributes: ["id_promocion", "nombre", "tipo", "valor"] },
          ],
        },
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
        {
          model: DetallePedido,
          as: "detalles",
          include: [
            { model: Producto, as: "producto" },
            { model: DetallePedidoOpcional, as: "opciones", include: [{ model: Opcional, as: "opcional" }] },
            { model: Promocion, as: "promocion", attributes: ["id_promocion", "nombre", "tipo", "valor"] },
          ],
        },
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

    // Si cambia estado, validar que la transición sea solo hacia adelante
    const estadoAnterior = pedido.estado;
    if (datos.estado && datos.estado !== estadoAnterior) {
      // Cancelado es terminal: un pedido cancelado no puede cambiar de estado
      if (estadoAnterior === "Cancelado") {
        return res.status(400).json({ error: 'No se puede cambiar el estado de un pedido cancelado' });
      }
      // Un pedido entregado no se puede cancelar
      if (datos.estado === "Cancelado" && estadoAnterior === "Entregado") {
        return res.status(400).json({ error: 'No se puede cancelar un pedido ya entregado' });
      }
      const idxAnterior = FLUJO_ESTADOS.indexOf(estadoAnterior);
      const idxNuevo = FLUJO_ESTADOS.indexOf(datos.estado);
      // Solo se valida cuando ambos estados pertenecen al flujo (Listo queda fuera del flujo lineal;
      // Cancelado se maneja con las reglas de arriba)
      if (idxAnterior !== -1 && idxNuevo !== -1 && idxNuevo !== idxAnterior + 1) {
        return res.status(400).json({ error: `Transición no permitida: de "${estadoAnterior}" solo se puede avanzar a "${FLUJO_ESTADOS[idxAnterior + 1] || "—"}"` });
      }
    }
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
        {
          model: DetallePedido,
          as: "detalles",
          include: [
            { model: Producto, as: "producto" },
            { model: DetallePedidoOpcional, as: "opciones", include: [{ model: Opcional, as: "opcional" }] },
            { model: Promocion, as: "promocion", attributes: ["id_promocion", "nombre", "tipo", "valor"] },
          ],
        },
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
    let idSucursalFinal = id_sucursal || null;
    if (idSucursalFinal) {
      const suc = await Sucursal.findByPk(idSucursalFinal, { transaction: t });
      if (!suc) { await t.rollback(); return res.status(404).json({ error: "Sucursal no encontrada" }); }
    } else {
      // Sin sucursal explícita: asignar la más cercana a la dirección con stock suficiente
      const sucursalService = require("../services/sucursalService");
      try {
        idSucursalFinal = await sucursalService.seleccionarSucursal({ direccion, detalles }, t);
      } catch (err) {
        await t.rollback();
        return res.status(err.status || 500).json({ error: err.message });
      }
    }
    // Crear pedido con importe 0 temporal
    const pedido = await Pedido.create({
      id_cliente,
      id_direccion,
      id_sucursal: idSucursalFinal,
      estado: estado || "Pendiente",
      importe: 0,
    }, { transaction: t });

    // Crear detalles + Producto_Pedido + opcionales (+ promociones expandidas)
    const { ProductoPedido } = require("../models");
    const promocionService = require("../services/promocionService");
    let importe = 0;

    // Un item puede ser producto suelto {id_producto, ...} o promoción {id_promocion, cantidad, observaciones}
    const crearLinea = async (id_producto, cantidad, precio, observaciones, id_promocion, opcionalesValidados) => {
      const detalle = await DetallePedido.create({
        id_pedido: pedido.id_pedido,
        id_producto,
        cantidad,
        precio,
        observaciones: observaciones || null,
        id_promocion: id_promocion || null,
      }, { transaction: t });
      for (const opc of opcionalesValidados) {
        await DetallePedidoOpcional.create({
          id_detalle: detalle.id_detalle,
          id_opcional: opc.id_opcional,
          precio: opc.precio,
        }, { transaction: t });
      }
      await ProductoPedido.findOrCreate({
        where: { id_pedido: pedido.id_pedido, id_producto },
        defaults: { id_pedido: pedido.id_pedido, id_producto },
        transaction: t,
      });
      importe += cantidad * parseFloat(precio);
    };

    for (const item of detalles) {
      const { id_producto, id_promocion, cantidad, observaciones, opcionales } = item;
      if (!cantidad || cantidad < 1) {
        await t.rollback();
        return res.status(400).json({ error: "Cada detalle requiere cantidad >=1" });
      }
      // Item de promoción: se expande en líneas con precio promocional distribuido
      if (id_promocion) {
        let lineas;
        try {
          lineas = await promocionService.expandirPromocion(id_promocion, cantidad, t);
        } catch (err) {
          await t.rollback();
          return res.status(err.status || 500).json({ error: err.message });
        }
        for (const l of lineas) {
          await crearLinea(l.id_producto, l.cantidad, l.precio, observaciones, l.id_promocion, []);
        }
        continue;
      }
      if (!id_producto) {
        await t.rollback();
        return res.status(400).json({ error: "Cada detalle requiere id_producto o id_promocion" });
      }
      const producto = await Producto.findByPk(id_producto, { transaction: t });
      if (!producto) { await t.rollback(); return res.status(404).json({ error: `Producto ${id_producto} no encontrado` }); }
      let precioBase = parseFloat(producto.precio); // snapshot histórico base
      let precioOpcionales = 0;
      // Validar opcionales si vienen (array de id_opcional)
      let opcionalesValidados = [];
      if (Array.isArray(opcionales) && opcionales.length > 0) {
        for (const id_opc of opcionales) {
          const opc = await Opcional.findByPk(id_opc, { transaction: t });
          if (!opc) { await t.rollback(); return res.status(404).json({ error: `Opcional ${id_opc} no encontrado` }); }
          if (opc.id_producto !== id_producto) {
            await t.rollback();
            return res.status(400).json({ error: `Opcional ${opc.nombre} no pertenece al producto ${producto.nombre}` });
          }
          opcionalesValidados.push(opc);
          precioOpcionales += parseFloat(opc.precio);
        }
      }
      const precioUnitario = precioBase + precioOpcionales; // incluye extras
      await crearLinea(id_producto, cantidad, precioUnitario, observaciones, null, opcionalesValidados);
    }
    // Descontar stock de la sucursal según las líneas creadas (falla con 409 si no alcanza)
    if (pedido.id_sucursal) {
      const lineas = await DetallePedido.findAll({
        where: { id_pedido: pedido.id_pedido },
        attributes: ["id_producto", "cantidad"],
        transaction: t,
      });
      try {
        await stockService.descontarStock(lineas, pedido.id_sucursal, t);
      } catch (err) {
        await t.rollback();
        return res.status(err.status || 500).json({ error: err.message });
      }
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
        {
          model: DetallePedido,
          as: "detalles",
          include: [
            { model: Producto, as: "producto" },
            { model: DetallePedidoOpcional, as: "opciones", include: [{ model: Opcional, as: "opcional" }] },
            { model: Promocion, as: "promocion", attributes: ["id_promocion", "nombre", "tipo", "valor"] },
          ],
        },
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
      include: [
        { model: Producto, as: "producto" },
        { model: DetallePedidoOpcional, as: "opciones", include: [{ model: Opcional, as: "opcional" }] },
        { model: Promocion, as: "promocion", attributes: ["id_promocion", "nombre", "tipo", "valor"] },
      ],
      order: [["id_detalle", "ASC"]],
    });
    // También devolver importe calculado para verificación: sum(cantidad*precio) ya incluye opcionales en precio
    const importeCalculado = detalles.reduce((sum, d) => sum + d.cantidad * parseFloat(d.precio), 0);
    res.json({ id_pedido: pedido.id_pedido, importe: pedido.importe, importeCalculado, detalles });
  } catch (err) {
    next(err);
  }
};

// PUT /api/pedidos/:id/detalles/:idDetalle - confirmar item en preparación
// Si todos los items quedan preparados, el pedido avanza a "En camino"
const updateDetallePreparado = async (req, res, next) => {
  try {
    const pedido = await Pedido.findByPk(req.params.id);
    if (!pedido) return res.status(404).json({ error: "Pedido no encontrado" });
    if (pedido.estado !== "Preparando") {
      return res.status(400).json({ error: "Solo se pueden confirmar items de un pedido en preparación" });
    }
    const detalle = await DetallePedido.findOne({
      where: { id_detalle: req.params.idDetalle, id_pedido: pedido.id_pedido },
    });
    if (!detalle) return res.status(404).json({ error: "Detalle no encontrado en el pedido" });
    await detalle.update({ preparado: req.body.preparado });

    let pedidoAvanzadoA = null;
    const total = await DetallePedido.count({ where: { id_pedido: pedido.id_pedido } });
    const pendientes = await DetallePedido.count({ where: { id_pedido: pedido.id_pedido, preparado: false } });
    if (total > 0 && pendientes === 0) {
      await pedido.update({ estado: "En camino" });
      await HistorialPedido.create({
        id_pedido: pedido.id_pedido,
        estado: "En camino",
        fecha_hora: new Date(),
      });
      pedidoAvanzadoA = "En camino";
    }
    res.json({ id_detalle: detalle.id_detalle, preparado: detalle.preparado, pedidoAvanzadoA });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPedidos, getPedidoById, updatePedido, createPedido, deletePedido, getDetallesByPedidoId, updateDetallePreparado };
