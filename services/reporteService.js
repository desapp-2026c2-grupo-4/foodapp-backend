const { sequelize, Sucursal } = require("../models");
const { TIMEZONE, fechaLocalISO, normalizarFechaISO } = require("../utils/dates");
const parametroService = require("./parametroService");

const ESTADOS_PEDIDO = [
  "Pendiente",
  "Confirmado",
  "Preparando",
  "Listo",
  "En camino",
  "Entregado",
  "Cancelado",
];

const errorConStatus = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const sumarDiasISO = (fecha, dias) => {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const fechaUTC = new Date(Date.UTC(anio, mes - 1, dia));
  fechaUTC.setUTCDate(fechaUTC.getUTCDate() + dias);
  return fechaUTC.toISOString().slice(0, 10);
};

const resolverRango = (desde, hasta, diasDefault = 30) => {
  const fechaHasta = hasta ? normalizarFechaISO(hasta) : fechaLocalISO();
  const fechaDesde = desde ? normalizarFechaISO(desde) : sumarDiasISO(fechaHasta, -(diasDefault - 1));
  if (fechaDesde > fechaHasta) {
    throw errorConStatus(400, "La fecha desde no puede ser posterior a la fecha hasta");
  }
  return {
    desde: fechaDesde,
    hasta: fechaHasta,
    hastaExclusivo: sumarDiasISO(fechaHasta, 1),
  };
};

const diasEntreISO = (desde, hasta) => {
  const inicio = Date.parse(`${desde}T00:00:00Z`);
  const fin = Date.parse(`${hasta}T00:00:00Z`);
  return Math.floor((fin - inicio) / 86400000) + 1;
};

const resolverRangoConParametros = async (desde, hasta) => {
  const [diasDefault, diasMax] = await Promise.all([
    parametroService.obtenerNumero("reporte_dias_default", 30),
    parametroService.obtenerNumero("reporte_dias_max", 365),
  ]);
  const rango = resolverRango(desde, hasta, diasDefault);
  if (diasEntreISO(rango.desde, rango.hasta) > diasMax) {
    throw errorConStatus(400, `El rango de reportes no puede superar ${diasMax} días`);
  }
  return rango;
};

const reemplazosBase = (rango, id_sucursal) => {
  const replacements = {
    desde: rango.desde,
    hasta_exclusivo: rango.hastaExclusivo,
    tz: TIMEZONE,
  };
  if (id_sucursal) replacements.id_sucursal = id_sucursal;
  return replacements;
};

const filtroRango = (alias = "p") => `
  AND ${alias}.fecha_hora >= ((:desde)::date::timestamp AT TIME ZONE :tz)
  AND ${alias}.fecha_hora < ((:hasta_exclusivo)::date::timestamp AT TIME ZONE :tz)
`;

const filtroSucursal = (id_sucursal, alias = "p") =>
  id_sucursal ? ` AND ${alias}.id_sucursal = :id_sucursal` : "";

const aFechaISO = (valor) => {
  if (!valor) return null;
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  return String(valor).slice(0, 10);
};

const numero = (valor, decimales = 2) => {
  const n = Number.parseFloat(valor);
  if (!Number.isFinite(n)) return 0;
  return Number(n.toFixed(decimales));
};

const validarSucursal = async (id_sucursal) => {
  if (!id_sucursal) return;
  const sucursal = await Sucursal.findByPk(id_sucursal);
  if (!sucursal) throw errorConStatus(404, "Sucursal no encontrada");
};

const pedidosPorDia = async ({ id_sucursal, desde, hasta }) => {
  const rango = await resolverRangoConParametros(desde, hasta);
  const [rows] = await sequelize.query(
    `
    SELECT
      (p.fecha_hora AT TIME ZONE :tz)::date AS fecha,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE p.estado = 'Entregado')::int AS entregados,
      COUNT(*) FILTER (WHERE p.estado = 'Cancelado')::int AS cancelados,
      COALESCE(SUM(p.importe) FILTER (WHERE p.estado = 'Entregado'), 0)::numeric AS ventas
    FROM pedidos p
    WHERE p.deleted_at IS NULL
      ${filtroRango("p")}
      ${filtroSucursal(id_sucursal, "p")}
    GROUP BY 1
    ORDER BY 1
    `,
    { replacements: reemplazosBase(rango, id_sucursal) }
  );

  return rows.map((r) => ({
    fecha: aFechaISO(r.fecha),
    total: Number(r.total),
    entregados: Number(r.entregados),
    cancelados: Number(r.cancelados),
    ventas: numero(r.ventas),
  }));
};

const pedidosPorEstado = async ({ id_sucursal, desde, hasta }) => {
  const rango = await resolverRangoConParametros(desde, hasta);
  const [rows] = await sequelize.query(
    `
    SELECT p.estado, COUNT(*)::int AS cantidad
    FROM pedidos p
    WHERE p.deleted_at IS NULL
      ${filtroRango("p")}
      ${filtroSucursal(id_sucursal, "p")}
    GROUP BY p.estado
    `,
    { replacements: reemplazosBase(rango, id_sucursal) }
  );

  const porEstado = new Map(rows.map((r) => [r.estado, Number(r.cantidad)]));
  const total = rows.reduce((acc, r) => acc + Number(r.cantidad), 0);

  return ESTADOS_PEDIDO.map((estado) => {
    const cantidad = porEstado.get(estado) || 0;
    return {
      estado,
      cantidad,
      porcentaje: total ? numero((cantidad / total) * 100) : 0,
    };
  });
};

const tiempoPromedioEntrega = async ({ id_sucursal, desde, hasta }) => {
  const rango = await resolverRangoConParametros(desde, hasta);
  const [rows] = await sequelize.query(
    `
    SELECT
      AVG(EXTRACT(EPOCH FROM (h.fecha_entrega - p.fecha_hora)) / 60)::numeric AS promedio_minutos,
      COUNT(*)::int AS pedidos_considerados
    FROM pedidos p
    JOIN (
      SELECT id_pedido, MIN(fecha_hora) AS fecha_entrega
      FROM historial_pedidos
      WHERE estado = 'Entregado'
      GROUP BY id_pedido
    ) h ON h.id_pedido = p.id_pedido
    WHERE p.estado = 'Entregado'
      AND p.deleted_at IS NULL
      ${filtroRango("p")}
      ${filtroSucursal(id_sucursal, "p")}
    `,
    { replacements: reemplazosBase(rango, id_sucursal) }
  );

  const row = rows[0] || {};
  const promedioMinutos = numero(row.promedio_minutos);
  return {
    promedio_minutos: promedioMinutos,
    promedio_horas: numero(promedioMinutos / 60),
    pedidos_considerados: Number(row.pedidos_considerados) || 0,
  };
};

const pedidosCancelados = async ({ id_sucursal, desde, hasta }) => {
  const rango = await resolverRangoConParametros(desde, hasta);
  const replacements = reemplazosBase(rango, id_sucursal);
  replacements.limite = await parametroService.obtenerNumero("reporte_cancelados_limit", 100);

  const [[[resumen]], [porDia], [pedidos]] = await Promise.all([
    sequelize.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE p.estado = 'Cancelado')::int AS total,
        COUNT(*)::int AS total_pedidos
      FROM pedidos p
      WHERE p.deleted_at IS NULL
        ${filtroRango("p")}
        ${filtroSucursal(id_sucursal, "p")}
      `,
      { replacements }
    ),
    sequelize.query(
      `
      SELECT
        (p.fecha_hora AT TIME ZONE :tz)::date AS fecha,
        COUNT(*)::int AS cantidad
      FROM pedidos p
      WHERE p.deleted_at IS NULL
        AND p.estado = 'Cancelado'
        ${filtroRango("p")}
        ${filtroSucursal(id_sucursal, "p")}
      GROUP BY 1
      ORDER BY 1
      `,
      { replacements }
    ),
    sequelize.query(
      `
      SELECT
        p.id_pedido,
        p.fecha_hora,
        p.importe,
        c.id_cliente,
        c.nombre || ' ' || c.apellido AS cliente,
        s.id_sucursal,
        s.nombre AS sucursal
      FROM pedidos p
      JOIN clientes c ON c.id_cliente = p.id_cliente
      LEFT JOIN sucursales s ON s.id_sucursal = p.id_sucursal
      WHERE p.deleted_at IS NULL
        AND p.estado = 'Cancelado'
        ${filtroRango("p")}
        ${filtroSucursal(id_sucursal, "p")}
      ORDER BY p.fecha_hora DESC, p.id_pedido DESC
      LIMIT :limite
      `,
      { replacements }
    ),
  ]);

  const total = Number(resumen?.total) || 0;
  const totalPedidos = Number(resumen?.total_pedidos) || 0;

  return {
    total,
    porcentaje: totalPedidos ? numero((total / totalPedidos) * 100) : 0,
    por_dia: porDia.map((r) => ({ fecha: aFechaISO(r.fecha), cantidad: Number(r.cantidad) })),
    pedidos: pedidos.map((r) => ({
      id_pedido: r.id_pedido,
      fecha_hora: r.fecha_hora,
      importe: numero(r.importe),
      id_cliente: r.id_cliente,
      cliente: r.cliente,
      id_sucursal: r.id_sucursal,
      sucursal: r.sucursal,
    })),
  };
};

const sucursalesResumen = async ({ desde, hasta, id_sucursal }) => {
  const rango = await resolverRangoConParametros(desde, hasta);
  const [rows] = await sequelize.query(
    `
    SELECT
      s.id_sucursal,
      s.nombre,
      COUNT(p.id_pedido)::int AS total_pedidos,
      COUNT(*) FILTER (WHERE p.estado = 'Entregado')::int AS entregados,
      COUNT(*) FILTER (WHERE p.estado = 'Cancelado')::int AS cancelados,
      COALESCE(SUM(p.importe) FILTER (WHERE p.estado = 'Entregado'), 0)::numeric AS ventas,
      CASE
        WHEN COUNT(*) FILTER (WHERE p.estado = 'Entregado') = 0 THEN 0
        ELSE (
          COALESCE(SUM(p.importe) FILTER (WHERE p.estado = 'Entregado'), 0)
          / COUNT(*) FILTER (WHERE p.estado = 'Entregado')
        )
      END::numeric AS ticket_promedio
    FROM sucursales s
    LEFT JOIN pedidos p ON p.id_sucursal = s.id_sucursal
      AND p.deleted_at IS NULL
      ${filtroRango("p")}
    ${id_sucursal ? "WHERE s.id_sucursal = :id_sucursal" : ""}
    GROUP BY s.id_sucursal, s.nombre
    ORDER BY s.nombre
    `,
    { replacements: reemplazosBase(rango, id_sucursal) }
  );

  return rows.map((r) => ({
    id_sucursal: r.id_sucursal,
    nombre: r.nombre,
    total_pedidos: Number(r.total_pedidos),
    entregados: Number(r.entregados),
    cancelados: Number(r.cancelados),
    ventas: numero(r.ventas),
    ticket_promedio: numero(r.ticket_promedio),
  }));
};

const productosPorSucursal = async ({ id_sucursal, desde, hasta }) => {
  const rango = await resolverRangoConParametros(desde, hasta);
  const [rows] = await sequelize.query(
    `
    SELECT
      s.id_sucursal,
      s.nombre AS sucursal,
      pr.id_producto,
      pr.nombre AS producto,
      SUM(d.cantidad)::int AS unidades_vendidas,
      SUM(d.cantidad * d.precio)::numeric AS facturacion
    FROM detalle_pedidos d
    JOIN pedidos p ON p.id_pedido = d.id_pedido
    JOIN productos pr ON pr.id_producto = d.id_producto
    JOIN sucursales s ON s.id_sucursal = p.id_sucursal
    WHERE p.estado = 'Entregado'
      AND p.deleted_at IS NULL
      AND pr.deleted_at IS NULL
      ${filtroRango("p")}
      ${filtroSucursal(id_sucursal, "p")}
    GROUP BY s.id_sucursal, s.nombre, pr.id_producto, pr.nombre
    ORDER BY s.nombre, unidades_vendidas DESC, pr.nombre
    `,
    { replacements: reemplazosBase(rango, id_sucursal) }
  );

  return rows.map((r) => ({
    id_sucursal: r.id_sucursal,
    sucursal: r.sucursal,
    id_producto: r.id_producto,
    producto: r.producto,
    unidades_vendidas: Number(r.unidades_vendidas),
    facturacion: numero(r.facturacion),
  }));
};

const clientesTop = async ({ id_sucursal, desde, hasta, limite }) => {
  const rango = await resolverRangoConParametros(desde, hasta);
  const [limiteDefault, limiteMax] = await Promise.all([
    parametroService.obtenerNumero("reporte_limite_default", 10),
    parametroService.obtenerNumero("reporte_limite_max", 50),
  ]);
  const limiteFinal = limite === undefined ? limiteDefault : Number(limite);
  if (limiteFinal > limiteMax) {
    throw errorConStatus(400, `El límite del ranking no puede superar ${limiteMax}`);
  }
  const [rows] = await sequelize.query(
    `
    SELECT
      c.id_cliente,
      c.nombre,
      c.apellido,
      c.email,
      COUNT(p.id_pedido) FILTER (WHERE p.estado = 'Entregado')::int AS pedidos_entregados,
      COUNT(p.id_pedido)::int AS pedidos_totales,
      COALESCE(SUM(p.importe) FILTER (WHERE p.estado = 'Entregado'), 0)::numeric AS total_gastado,
      MAX(p.fecha_hora) FILTER (WHERE p.estado = 'Entregado') AS ultimo_pedido
    FROM clientes c
    JOIN pedidos p ON p.id_cliente = c.id_cliente
      AND p.deleted_at IS NULL
      ${filtroRango("p")}
      ${filtroSucursal(id_sucursal, "p")}
    GROUP BY c.id_cliente, c.nombre, c.apellido, c.email
    HAVING COUNT(p.id_pedido) FILTER (WHERE p.estado = 'Entregado') > 0
    ORDER BY pedidos_entregados DESC, total_gastado DESC, c.id_cliente
    LIMIT :limite
    `,
    { replacements: { ...reemplazosBase(rango, id_sucursal), limite: limiteFinal } }
  );

  return rows.map((r) => ({
    id_cliente: r.id_cliente,
    nombre: r.nombre,
    apellido: r.apellido,
    email: r.email,
    pedidos_entregados: Number(r.pedidos_entregados),
    pedidos_totales: Number(r.pedidos_totales),
    total_gastado: numero(r.total_gastado),
    ultimo_pedido: r.ultimo_pedido,
  }));
};

const clientesNuevos = async ({ id_sucursal, desde, hasta, agrupacion }) => {
  const rango = await resolverRangoConParametros(desde, hasta);
  const trunc = { dia: "day", semana: "week", mes: "month" }[agrupacion] || "day";
  const replacements = reemplazosBase(rango, id_sucursal);

  const primerosSql = `
    SELECT p.id_cliente, MIN(p.fecha_hora) AS primer_pedido
    FROM pedidos p
    WHERE p.estado = 'Entregado'
      AND p.deleted_at IS NULL
      ${filtroRango("p")}
      ${filtroSucursal(id_sucursal, "p")}
    GROUP BY p.id_cliente
  `;

  const [[serie], [clientes]] = await Promise.all([
    sequelize.query(
      `
      WITH primeros AS (${primerosSql})
      SELECT
        date_trunc('${trunc}', (primer_pedido AT TIME ZONE :tz))::date AS periodo,
        COUNT(*)::int AS cantidad
      FROM primeros
      GROUP BY 1
      ORDER BY 1
      `,
      { replacements }
    ),
    sequelize.query(
      `
      WITH primeros AS (${primerosSql})
      SELECT
        c.id_cliente,
        c.nombre,
        c.apellido,
        c.email,
        pr.primer_pedido
      FROM primeros pr
      JOIN clientes c ON c.id_cliente = pr.id_cliente
      ORDER BY pr.primer_pedido DESC, c.id_cliente
      `,
      { replacements }
    ),
  ]);

  return {
    total: clientes.length,
    serie: serie.map((r) => ({ periodo: aFechaISO(r.periodo), cantidad: Number(r.cantidad) })),
    clientes: clientes.map((r) => ({
      id_cliente: r.id_cliente,
      nombre: r.nombre,
      apellido: r.apellido,
      email: r.email,
      primer_pedido: r.primer_pedido,
    })),
  };
};

const clientesInactivos = async ({ id_sucursal, dias }) => {
  const diasFinal = dias === undefined
    ? await parametroService.obtenerNumero("dias_cliente_inactivo", 30)
    : Number(dias);
  const [rows] = await sequelize.query(
    `
    SELECT
      c.id_cliente,
      c.nombre,
      c.apellido,
      c.email,
      MAX(p.fecha_hora) AS ultimo_pedido,
      FLOOR(EXTRACT(EPOCH FROM (now() - MAX(p.fecha_hora))) / 86400)::int AS dias_inactivo,
      COUNT(p.id_pedido)::int AS pedidos_entregados
    FROM clientes c
    JOIN pedidos p ON p.id_cliente = c.id_cliente
      AND p.estado = 'Entregado'
      AND p.deleted_at IS NULL
      ${filtroSucursal(id_sucursal, "p")}
    GROUP BY c.id_cliente, c.nombre, c.apellido, c.email
    HAVING MAX(p.fecha_hora) < now() - ((:dias)::int * INTERVAL '1 day')
    ORDER BY ultimo_pedido ASC, c.id_cliente
    `,
    { replacements: { dias: diasFinal, ...(id_sucursal ? { id_sucursal } : {}) } }
  );

  return rows.map((r) => ({
    id_cliente: r.id_cliente,
    nombre: r.nombre,
    apellido: r.apellido,
    email: r.email,
    ultimo_pedido: r.ultimo_pedido,
    dias_inactivo: Number(r.dias_inactivo),
    pedidos_entregados: Number(r.pedidos_entregados),
  }));
};

const reporteProductos = async ({ id_sucursal, desde, hasta }) => {
  const rango = await resolverRangoConParametros(desde, hasta);
  const [rows] = await sequelize.query(
    `
    SELECT
      p.id_producto,
      p.nombre,
      p.precio AS precio_actual,
      p.estado,
      COALESCE(SUM(d.cantidad), 0)::int AS unidades_vendidas,
      COALESCE(SUM(d.cantidad * d.precio), 0)::numeric AS facturacion,
      COUNT(DISTINCT d.id_pedido)::int AS cantidad_pedidos
    FROM productos p
    LEFT JOIN detalle_pedidos d ON d.id_producto = p.id_producto
      AND d.id_pedido IN (
        SELECT p2.id_pedido
        FROM pedidos p2
        WHERE p2.estado = 'Entregado'
          AND p2.deleted_at IS NULL
          ${filtroRango("p2")}
          ${filtroSucursal(id_sucursal, "p2")}
      )
    WHERE p.deleted_at IS NULL
    GROUP BY p.id_producto, p.nombre, p.precio, p.estado
    ORDER BY p.id_producto ASC
    `,
    { replacements: reemplazosBase(rango, id_sucursal) }
  );

  return rows.map((r) => ({
    ...r,
    precio_actual: numero(r.precio_actual),
    unidades_vendidas: Number(r.unidades_vendidas),
    facturacion: numero(r.facturacion),
    cantidad_pedidos: Number(r.cantidad_pedidos),
  }));
};

const reportePromociones = async ({ id_sucursal, desde, hasta }) => {
  const rango = await resolverRangoConParametros(desde, hasta);
  const [rows] = await sequelize.query(
    `
    SELECT
      pr.id_promocion,
      pr.nombre,
      pr.tipo,
      pr.valor,
      pr.activa,
      COALESCE(SUM(d.cantidad * d.precio), 0)::numeric AS facturacion,
      COUNT(DISTINCT d.id_pedido)::int AS cantidad_pedidos,
      CASE
        WHEN COALESCE(b.bundle_qty, 0) = 0 THEN 0
        ELSE ROUND(COALESCE(SUM(d.cantidad), 0)::numeric / b.bundle_qty)::int
      END AS unidades_vendidas
    FROM promociones pr
    LEFT JOIN (
      SELECT id_promocion, SUM(cantidad) AS bundle_qty
      FROM promocion_producto
      WHERE deleted_at IS NULL
      GROUP BY id_promocion
    ) b ON b.id_promocion = pr.id_promocion
    LEFT JOIN detalle_pedidos d ON d.id_promocion = pr.id_promocion
      AND d.id_pedido IN (
        SELECT p2.id_pedido
        FROM pedidos p2
        WHERE p2.estado = 'Entregado'
          AND p2.deleted_at IS NULL
          ${filtroRango("p2")}
          ${filtroSucursal(id_sucursal, "p2")}
      )
    WHERE pr.deleted_at IS NULL
    GROUP BY pr.id_promocion, pr.nombre, pr.tipo, pr.valor, pr.activa, b.bundle_qty
    ORDER BY pr.id_promocion ASC
    `,
    { replacements: reemplazosBase(rango, id_sucursal) }
  );

  return rows.map((r) => {
    const facturacion = numero(r.facturacion);
    const cantidadPedidos = Number(r.cantidad_pedidos);
    return {
      id_promocion: r.id_promocion,
      nombre: r.nombre,
      tipo: r.tipo,
      valor: numero(r.valor),
      activa: r.activa,
      unidades_vendidas: Number(r.unidades_vendidas),
      facturacion,
      cantidad_pedidos: cantidadPedidos,
      ticket_promedio: cantidadPedidos ? numero(facturacion / cantidadPedidos) : 0,
    };
  });
};

const impactoPromociones = async ({ id_sucursal, desde, hasta }) => {
  const rango = await resolverRangoConParametros(desde, hasta);
  const [rows] = await sequelize.query(
    `
    WITH ventas AS (
      SELECT COALESCE(SUM(p.importe), 0)::numeric AS total
      FROM pedidos p
      WHERE p.estado = 'Entregado'
        AND p.deleted_at IS NULL
        ${filtroRango("p")}
        ${filtroSucursal(id_sucursal, "p")}
    ),
    detalles AS (
      SELECT d.id_promocion, d.id_pedido, d.cantidad, d.precio
      FROM detalle_pedidos d
      JOIN pedidos p ON p.id_pedido = d.id_pedido
      WHERE p.estado = 'Entregado'
        AND p.deleted_at IS NULL
        ${filtroRango("p")}
        ${filtroSucursal(id_sucursal, "p")}
    )
    SELECT
      pr.id_promocion,
      pr.nombre,
      pr.tipo,
      pr.valor,
      COUNT(DISTINCT d.id_pedido)::int AS pedidos,
      COALESCE(SUM(d.cantidad), 0)::int AS unidades_vendidas,
      COALESCE(SUM(d.cantidad * d.precio), 0)::numeric AS facturacion_promocion,
      v.total AS facturacion_total,
      CASE
        WHEN v.total = 0 THEN 0
        ELSE ROUND((COALESCE(SUM(d.cantidad * d.precio), 0) / v.total) * 100, 2)
      END AS participacion_ventas_pct
    FROM promociones pr
    CROSS JOIN ventas v
    LEFT JOIN detalles d ON d.id_promocion = pr.id_promocion
    WHERE pr.deleted_at IS NULL
    GROUP BY pr.id_promocion, pr.nombre, pr.tipo, pr.valor, v.total
    ORDER BY participacion_ventas_pct DESC, facturacion_promocion DESC, pr.id_promocion
    `,
    { replacements: reemplazosBase(rango, id_sucursal) }
  );

  return rows.map((r) => ({
    id_promocion: r.id_promocion,
    nombre: r.nombre,
    tipo: r.tipo,
    valor: numero(r.valor),
    pedidos: Number(r.pedidos),
    unidades_vendidas: Number(r.unidades_vendidas),
    facturacion_promocion: numero(r.facturacion_promocion),
    facturacion_total: numero(r.facturacion_total),
    participacion_ventas_pct: numero(r.participacion_ventas_pct),
  }));
};

module.exports = {
  resolverRango,
  resolverRangoConParametros,
  validarSucursal,
  pedidosPorDia,
  pedidosPorEstado,
  tiempoPromedioEntrega,
  pedidosCancelados,
  sucursalesResumen,
  productosPorSucursal,
  clientesTop,
  clientesNuevos,
  clientesInactivos,
  reporteProductos,
  reportePromociones,
  impactoPromociones,
};
