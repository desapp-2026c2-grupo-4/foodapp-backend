const { Cliente, Direccion, sequelize } = require("../models");
const { hashPassword, verificarPassword } = require("../utils/password");

const getClientes = async (req, res, next) => {
  try {
    const clientes = await Cliente.findAll({
      attributes: ["id_cliente", "nombre", "apellido", "tipo_doc", "dni", "email"],
      include: [{ model: Direccion, as: "direcciones" }],
      order: [["id_cliente", "ASC"]],
    });
    res.json(clientes);
  } catch (err) { next(err); }
};

// Resumen de clientes para administración: datos de contacto, direcciones y métricas de compra.
// "total_gastado" y "ticket_promedio" consideran únicamente pedidos Entregado.
const getResumenClientes = async (req, res, next) => {
  try {
    const [rows] = await sequelize.query(`
      SELECT
        c.id_cliente,
        c.nombre,
        c.apellido,
        c.tipo_doc,
        c.dni,
        c.email,
        c.created_at,
        COALESCE(d.direcciones_count, 0)::int AS direcciones_count,
        COALESCE(p.pedidos_count, 0)::int AS pedidos_count,
        COALESCE(p.pedidos_entregados, 0)::int AS pedidos_entregados,
        COALESCE(p.pedidos_activos, 0)::int AS pedidos_activos,
        COALESCE(p.pedidos_cancelados, 0)::int AS pedidos_cancelados,
        COALESCE(p.total_gastado, 0)::numeric AS total_gastado,
        CASE
          WHEN COALESCE(p.pedidos_entregados, 0) = 0 THEN 0
          ELSE ROUND(COALESCE(p.total_gastado, 0) / p.pedidos_entregados, 2)
        END::numeric AS ticket_promedio,
        p.primera_compra,
        p.ultimo_pedido,
        p.ultimo_estado,
        (
          SELECT s.nombre
          FROM pedidos pp
          JOIN sucursales s ON s.id_sucursal = pp.id_sucursal
          WHERE pp.id_cliente = c.id_cliente
            AND pp.deleted_at IS NULL
            AND pp.estado <> 'Cancelado'
          GROUP BY s.id_sucursal, s.nombre
          ORDER BY COUNT(*) DESC, MAX(pp.fecha_hora) DESC
          LIMIT 1
        ) AS sucursal_favorita
      FROM clientes c
      LEFT JOIN (
        SELECT id_cliente, COUNT(*)::int AS direcciones_count
        FROM direcciones
        WHERE deleted_at IS NULL
        GROUP BY id_cliente
      ) d ON d.id_cliente = c.id_cliente
      LEFT JOIN (
        SELECT
          id_cliente,
          COUNT(*)::int AS pedidos_count,
          CAST(COUNT(*) FILTER (WHERE estado = 'Entregado') AS INTEGER) AS pedidos_entregados,
          CAST(COUNT(*) FILTER (WHERE estado NOT IN ('Entregado', 'Cancelado')) AS INTEGER) AS pedidos_activos,
          CAST(COUNT(*) FILTER (WHERE estado = 'Cancelado') AS INTEGER) AS pedidos_cancelados,
          COALESCE(SUM(importe) FILTER (WHERE estado = 'Entregado'), 0)::numeric AS total_gastado,
          MIN(fecha_hora) AS primera_compra,
          MAX(fecha_hora) AS ultimo_pedido,
          (ARRAY_AGG(estado ORDER BY fecha_hora DESC, id_pedido DESC))[1] AS ultimo_estado
        FROM pedidos
        WHERE deleted_at IS NULL
        GROUP BY id_cliente
      ) p ON p.id_cliente = c.id_cliente
      ORDER BY c.id_cliente ASC
    `);

    res.json(rows.map((r) => ({
      ...r,
      direcciones_count: parseInt(r.direcciones_count, 10),
      pedidos_count: parseInt(r.pedidos_count, 10),
      pedidos_entregados: parseInt(r.pedidos_entregados, 10),
      pedidos_activos: parseInt(r.pedidos_activos, 10),
      pedidos_cancelados: parseInt(r.pedidos_cancelados, 10),
      total_gastado: parseFloat(r.total_gastado),
      ticket_promedio: parseFloat(r.ticket_promedio),
    })));
  } catch (err) { next(err); }
};

const getClienteById = async (req, res, next) => {
  try {
    const cliente = await Cliente.findByPk(req.params.id, {
      attributes: ["id_cliente", "nombre", "apellido", "tipo_doc", "dni", "email", "created_at"],
      include: [{ model: Direccion, as: "direcciones" }],
    });
    if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });
    res.json(cliente);
  } catch (err) { next(err); }
};

const createCliente = async (req, res, next) => {
  try {
    const { nombre, apellido, tipo_doc, dni, email, password } = req.body;
    const existente = await Cliente.findOne({ where: { email } });
    if (existente) return res.status(409).json({ error: "El email ya está registrado" });
    const cliente = await Cliente.create({ nombre, apellido, tipo_doc, dni, email, password: await hashPassword(password) });
    const creado = await Cliente.findByPk(cliente.id_cliente, {
      attributes: ["id_cliente", "nombre", "apellido", "tipo_doc", "dni", "email"],
      include: [{ model: Direccion, as: "direcciones" }],
    });
    res.status(201).json(creado);
  } catch (err) { next(err); }
};

const updateCliente = async (req, res, next) => {
  try {
    const cliente = await Cliente.findByPk(req.params.id);
    if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });
    // El email es la credencial de login y no se puede modificar
    const permitidos = ["nombre", "apellido", "tipo_doc", "dni"];
    const datos = {};
    for (const k of permitidos) if (req.body[k] !== undefined) datos[k] = req.body[k];
    if (Object.keys(datos).length === 0) return res.status(400).json({ error: "No se enviaron campos para actualizar" });
    await cliente.update(datos);
    const actualizado = await Cliente.findByPk(cliente.id_cliente, {
      attributes: ["id_cliente", "nombre", "apellido", "tipo_doc", "dni", "email"],
      include: [{ model: Direccion, as: "direcciones" }],
    });
    res.json(actualizado);
  } catch (err) { next(err); }
};

const cambiarPassword = async (req, res, next) => {
  try {
    const cliente = await Cliente.findByPk(req.params.id);
    if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });
    const { passwordActual, passwordNueva } = req.body;
    const ok = await verificarPassword(passwordActual, cliente.password);
    if (!ok) return res.status(401).json({ error: "La contraseña actual es incorrecta" });
    await cliente.update({ password: await hashPassword(passwordNueva) });
    res.json({ mensaje: "Contraseña actualizada correctamente" });
  } catch (err) { next(err); }
};

module.exports = { getClientes, getResumenClientes, getClienteById, createCliente, updateCliente, cambiarPassword };
