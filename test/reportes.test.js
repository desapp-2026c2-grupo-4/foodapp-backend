const { request, requestAs, app } = require("./helpers/request");
const { crearCliente, crearEmpleado } = require("./helpers/users");
const { resetDb, closeDb } = require("./db_utils");
const { resolverRango } = require("../services/reporteService");
const {
  Cliente,
  Direccion,
  Sucursal,
  Producto,
  Promocion,
  PromocionProducto,
  Pedido,
  DetallePedido,
  HistorialPedido,
} = require("../models");

const RANGO = { desde: "2026-09-01", hasta: "2026-09-30" };
const fecha = (iso) => new Date(iso);

let sucA;
let sucB;
let sucC;
let prodHamburguesa;
let prodPapas;
let promoCombo;
let promoVacia;
let clientes = {};
let tokens = {};

const crearPersona = async (nombre, email) => {
  const { cliente, token } = await crearCliente({
    nombre,
    apellido: "Reporte",
    email,
  });
  const direccion = await Direccion.create({
    calle: `Calle ${nombre}`,
    altura: "100",
    ciudad: "CABA",
    provincia: "Buenos Aires",
    latitud: -34.60,
    longitud: -58.38,
    id_cliente: cliente.id_cliente,
  });
  clientes[nombre] = { cliente, direccion, token };
  tokens[nombre] = token;
  return clientes[nombre];
};

const crearPedido = async ({
  cliente,
  sucursal,
  estado = "Entregado",
  importe,
  fechaHora,
  detalles = [],
  entregadoEn,
}) => {
  const pedido = await Pedido.create({
    id_cliente: cliente.cliente.id_cliente,
    id_direccion: cliente.direccion.id_direccion,
    id_sucursal: sucursal.id_sucursal,
    estado,
    importe,
    fecha_hora: fecha(fechaHora),
  });

  if (detalles.length) {
    await DetallePedido.bulkCreate(
      detalles.map((d) => ({ ...d, id_pedido: pedido.id_pedido }))
    );
  }

  await HistorialPedido.create({
    id_pedido: pedido.id_pedido,
    estado: "Pendiente",
    fecha_hora: fecha(fechaHora),
  });
  if (entregadoEn) {
    await HistorialPedido.create({
      id_pedido: pedido.id_pedido,
      estado: "Entregado",
      fecha_hora: fecha(entregadoEn),
    });
  }

  return pedido;
};

beforeAll(async () => {
  await resetDb();

  sucA = await Sucursal.create({
    nombre: "A Centro",
    estado: "activa",
    calle: "Av. A",
    altura: "1",
    ciudad: "CABA",
    provincia: "Buenos Aires",
    latitud: -34.60,
    longitud: -58.38,
  });
  sucB = await Sucursal.create({
    nombre: "B Norte",
    estado: "activa",
    calle: "Av. B",
    altura: "2",
    ciudad: "CABA",
    provincia: "Buenos Aires",
    latitud: -34.61,
    longitud: -58.39,
  });
  sucC = await Sucursal.create({
    nombre: "C Sin pedidos",
    estado: "activa",
    calle: "Av. C",
    altura: "3",
    ciudad: "CABA",
    provincia: "Buenos Aires",
    latitud: -34.62,
    longitud: -58.40,
  });

  prodHamburguesa = await Producto.create({ nombre: "Hamburguesa", precio: 1000 });
  prodPapas = await Producto.create({ nombre: "Papas", precio: 500 });

  promoCombo = await Promocion.create({
    nombre: "Combo 2 hamburguesas",
    tipo: "PRECIO_FIJO",
    valor: 1500,
    fecha_inicio: "2026-01-01",
    fecha_fin: "2030-12-31",
    activa: true,
  });
  await PromocionProducto.create({
    id_promocion: promoCombo.id_promocion,
    id_producto: prodHamburguesa.id_producto,
    cantidad: 2,
  });
  promoVacia = await Promocion.create({
    nombre: "Promo sin ventas",
    tipo: "PORCENTAJE",
    valor: 10,
    fecha_inicio: "2026-01-01",
    fecha_fin: "2030-12-31",
    activa: true,
  });
  await PromocionProducto.create({
    id_promocion: promoVacia.id_promocion,
    id_producto: prodPapas.id_producto,
    cantidad: 1,
  });

  await crearPersona("Uno", "reporte.uno@example.com");
  await crearPersona("Dos", "reporte.dos@example.com");
  await crearPersona("Tres", "reporte.tres@example.com");
  await crearPersona("Cinco", "reporte.cinco@example.com");
  await crearPersona("Seis", "reporte.seis@example.com");
  await crearPersona("Siete", "reporte.siete@example.com");

  const uno = clientes.Uno;
  const dos = clientes.Dos;
  const tres = clientes.Tres;

  // Pedidos de la sucursal A dentro del rango.
  await crearPedido({
    cliente: uno,
    sucursal: sucA,
    importe: 1000,
    fechaHora: "2026-09-10T12:00:00Z",
    entregadoEn: "2026-09-10T12:30:00Z",
    detalles: [
      { id_producto: prodHamburguesa.id_producto, cantidad: 1, precio: 1000 },
    ],
  });
  await crearPedido({
    cliente: dos,
    sucursal: sucA,
    importe: 3000,
    fechaHora: "2026-09-11T02:30:00Z",
    entregadoEn: "2026-09-11T03:10:00Z",
    detalles: [
      {
        id_producto: prodHamburguesa.id_producto,
        cantidad: 2,
        precio: 1500,
        id_promocion: promoCombo.id_promocion,
      },
    ],
  });
  await crearPedido({
    cliente: uno,
    sucursal: sucA,
    estado: "Cancelado",
    importe: 5000,
    fechaHora: "2026-09-12T12:00:00Z",
    detalles: [
      { id_producto: prodPapas.id_producto, cantidad: 10, precio: 500 },
    ],
  });
  await crearPedido({
    cliente: uno,
    sucursal: sucA,
    estado: "Pendiente",
    importe: 500,
    fechaHora: "2026-09-13T12:00:00Z",
    detalles: [
      { id_producto: prodPapas.id_producto, cantidad: 1, precio: 500 },
    ],
  });
  await crearPedido({
    cliente: uno,
    sucursal: sucA,
    importe: 2000,
    fechaHora: "2026-09-15T12:00:00Z",
    entregadoEn: "2026-09-15T12:20:00Z",
    detalles: [
      { id_producto: prodHamburguesa.id_producto, cantidad: 2, precio: 1000 },
    ],
  });

  // Pedido de la sucursal B dentro del rango.
  await crearPedido({
    cliente: uno,
    sucursal: sucB,
    importe: 4000,
    fechaHora: "2026-09-12T15:00:00Z",
    entregadoEn: "2026-09-12T16:00:00Z",
    detalles: [
      { id_producto: prodHamburguesa.id_producto, cantidad: 4, precio: 1000 },
    ],
  });

  // Pedido viejo de Tres, fuera del rango. No debe sumar en reportes por período.
  await crearPedido({
    cliente: tres,
    sucursal: sucA,
    importe: 7000,
    fechaHora: "2026-08-01T12:00:00Z",
    entregadoEn: "2026-08-01T12:30:00Z",
    detalles: [
      { id_producto: prodHamburguesa.id_producto, cantidad: 7, precio: 1000 },
    ],
  });

  // Clientes con pedidos recientes para validar inactividad respecto de now().
  const ahora = Date.now();
  const dias = (n) => new Date(ahora - n * 24 * 60 * 60 * 1000).toISOString();
  await crearPedido({
    cliente: clientes.Cinco,
    sucursal: sucA,
    importe: 100,
    fechaHora: dias(1),
    entregadoEn: dias(1),
    detalles: [{ id_producto: prodPapas.id_producto, cantidad: 1, precio: 100 }],
  });
  await crearPedido({
    cliente: clientes.Seis,
    sucursal: sucA,
    importe: 100,
    fechaHora: dias(10),
    entregadoEn: dias(10),
    detalles: [{ id_producto: prodPapas.id_producto, cantidad: 1, precio: 100 }],
  });
  await crearPedido({
    cliente: clientes.Siete,
    sucursal: sucA,
    importe: 100,
    fechaHora: dias(90),
    entregadoEn: dias(90),
    detalles: [{ id_producto: prodPapas.id_producto, cantidad: 1, precio: 100 }],
  });
});

afterAll(async () => {
  await closeDb();
});

describe("Reportes: rango y autenticación", () => {
  test("resolverRango usa últimos 30 días inclusive y valida orden", () => {
    expect(resolverRango(undefined, "2026-09-30")).toEqual({
      desde: "2026-09-01",
      hasta: "2026-09-30",
      hastaExclusivo: "2026-10-01",
    });
    expect(() => resolverRango("2026-09-30", "2026-09-01")).toThrow(/posterior/);
  });

  test("sin token devuelve 401", async () => {
    const res = await requestAs(null).get("/api/reportes/pedidos/dia");
    expect(res.status).toBe(401);
  });

  test("un cliente no puede consultar reportes", async () => {
    const res = await requestAs(tokens.Uno).get("/api/reportes/pedidos/dia");
    expect(res.status).toBe(403);
  });

  test("rechaza fechas inválidas y rango invertido", async () => {
    const invalida = await request().get("/api/reportes/pedidos/dia?desde=2026-02-31");
    expect(invalida.status).toBe(400);

    const invertida = await request().get(
      "/api/reportes/pedidos/dia?desde=2026-09-30&hasta=2026-09-01"
    );
    expect(invertida.status).toBe(400);
    expect(invertida.body.error).toMatch(/posterior/);
  });

  test("sucursal inexistente devuelve 404", async () => {
    const res = await request().get("/api/reportes/pedidos/dia?id_sucursal=99999");
    expect(res.status).toBe(404);
  });
});

describe("Reportes: pedidos", () => {
  test("pedidos por día agrupa por fecha local y separa entregados/cancelados", async () => {
    const res = await request().get(
      `/api/reportes/pedidos/dia?desde=${RANGO.desde}&hasta=${RANGO.hasta}&id_sucursal=${sucA.id_sucursal}`
    );

    expect(res.status).toBe(200);
    const porFecha = Object.fromEntries(res.body.map((r) => [r.fecha, r]));
    expect(porFecha["2026-09-10"]).toMatchObject({
      total: 2,
      entregados: 2,
      cancelados: 0,
      ventas: 4000,
    });
    expect(porFecha["2026-09-12"]).toMatchObject({
      total: 1,
      entregados: 0,
      cancelados: 1,
      ventas: 0,
    });
    expect(porFecha["2026-09-15"]).toMatchObject({ total: 1, entregados: 1, ventas: 2000 });
  });

  test("pedidos por estado incluye todos los estados y porcentajes", async () => {
    const res = await request().get(
      `/api/reportes/pedidos/estado?desde=${RANGO.desde}&hasta=${RANGO.hasta}&id_sucursal=${sucA.id_sucursal}`
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(7);
    const porEstado = Object.fromEntries(res.body.map((r) => [r.estado, r]));
    expect(porEstado.Entregado).toMatchObject({ cantidad: 3, porcentaje: 60 });
    expect(porEstado.Cancelado).toMatchObject({ cantidad: 1, porcentaje: 20 });
    expect(porEstado.Pendiente).toMatchObject({ cantidad: 1, porcentaje: 20 });
  });

  test("tiempo promedio de entrega usa el historial Entregado", async () => {
    const res = await request().get(
      `/api/reportes/pedidos/tiempo-entrega?desde=${RANGO.desde}&hasta=${RANGO.hasta}&id_sucursal=${sucA.id_sucursal}`
    );

    expect(res.status).toBe(200);
    expect(res.body.promedio_minutos).toBe(30);
    expect(res.body.pedidos_considerados).toBe(3);
  });

  test("pedidos cancelados devuelve total, porcentaje, serie y detalle", async () => {
    const res = await request().get(
      `/api/reportes/pedidos/cancelados?desde=${RANGO.desde}&hasta=${RANGO.hasta}&id_sucursal=${sucA.id_sucursal}`
    );

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.porcentaje).toBe(20);
    expect(res.body.por_dia).toEqual([{ fecha: "2026-09-12", cantidad: 1 }]);
    expect(res.body.pedidos).toHaveLength(1);
    expect(res.body.pedidos[0]).toMatchObject({ cliente: "Uno Reporte", sucursal: "A Centro" });
  });
});

describe("Reportes: sucursales y productos", () => {
  test("resumen de sucursales incluye sucursales sin pedidos con ceros", async () => {
    const res = await request().get(
      `/api/reportes/sucursales?desde=${RANGO.desde}&hasta=${RANGO.hasta}`
    );

    expect(res.status).toBe(200);
    const porNombre = Object.fromEntries(res.body.map((r) => [r.nombre, r]));
    expect(porNombre["A Centro"]).toMatchObject({
      total_pedidos: 5,
      entregados: 3,
      cancelados: 1,
      ventas: 6000,
      ticket_promedio: 2000,
    });
    expect(porNombre["B Norte"]).toMatchObject({ total_pedidos: 1, entregados: 1, ventas: 4000 });
    expect(porNombre["C Sin pedidos"]).toMatchObject({
      total_pedidos: 0,
      entregados: 0,
      cancelados: 0,
      ventas: 0,
      ticket_promedio: 0,
    });
  });

  test("productos por sucursal solo cuenta pedidos entregados", async () => {
    const res = await request().get(
      `/api/reportes/sucursales/productos?desde=${RANGO.desde}&hasta=${RANGO.hasta}&id_sucursal=${sucA.id_sucursal}`
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      expect.objectContaining({
        id_sucursal: sucA.id_sucursal,
        producto: "Hamburguesa",
        unidades_vendidas: 5,
        facturacion: 6000,
      }),
    ]);
  });

  test("reporte de productos incluye productos sin ventas y excluye no entregados", async () => {
    const res = await request().get(
      `/api/reportes/productos?desde=${RANGO.desde}&hasta=${RANGO.hasta}&id_sucursal=${sucA.id_sucursal}`
    );

    expect(res.status).toBe(200);
    const porProducto = Object.fromEntries(res.body.map((r) => [r.nombre, r]));
    expect(porProducto.Hamburguesa).toMatchObject({
      unidades_vendidas: 5,
      facturacion: 6000,
      cantidad_pedidos: 3,
    });
    expect(porProducto.Papas).toMatchObject({
      unidades_vendidas: 0,
      facturacion: 0,
      cantidad_pedidos: 0,
    });
  });
});

describe("Reportes: clientes", () => {
  test("clientes top ordena por pedidos entregados y gasto", async () => {
    const res = await request().get(
      `/api/reportes/clientes/top?desde=${RANGO.desde}&hasta=${RANGO.hasta}&id_sucursal=${sucA.id_sucursal}`
    );

    expect(res.status).toBe(200);
    expect(res.body.map((c) => c.nombre)).toEqual(["Uno", "Dos"]);
    expect(res.body[0]).toMatchObject({
      pedidos_entregados: 2,
      pedidos_totales: 4,
      total_gastado: 3000,
    });
    expect(res.body[1]).toMatchObject({ pedidos_entregados: 1, total_gastado: 3000 });
  });

  test("clientes nuevos se calculan por primer pedido entregado en el rango y sucursal", async () => {
    const res = await request().get(
      `/api/reportes/clientes/nuevos?desde=${RANGO.desde}&hasta=${RANGO.hasta}&id_sucursal=${sucA.id_sucursal}`
    );

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.clientes.map((c) => c.nombre).sort()).toEqual(["Dos", "Uno"]);
    // El pedido del 2026-09-11T02:30Z pertenece al 2026-09-10 en Argentina.
    expect(res.body.serie).toEqual([{ periodo: "2026-09-10", cantidad: 2 }]);
  });

  test("clientes inactivos respeta la cantidad de días configurada", async () => {
    const res = await request().get(
      `/api/reportes/clientes/inactivos?id_sucursal=${sucA.id_sucursal}&dias=5`
    );

    expect(res.status).toBe(200);
    const nombres = res.body.map((c) => c.nombre);
    expect(nombres).toContain("Seis");
    expect(nombres).toContain("Siete");
    expect(nombres).not.toContain("Cinco");
    const seis = res.body.find((c) => c.nombre === "Seis");
    expect(seis.dias_inactivo).toBeGreaterThanOrEqual(10);
  });
});

describe("Reportes: promociones", () => {
  test("reporte de promociones calcula combos vendidos y excluye pedidos no entregados", async () => {
    const res = await request().get(
      `/api/reportes/promociones?desde=${RANGO.desde}&hasta=${RANGO.hasta}&id_sucursal=${sucA.id_sucursal}`
    );

    expect(res.status).toBe(200);
    const porNombre = Object.fromEntries(res.body.map((p) => [p.nombre, p]));
    expect(porNombre["Combo 2 hamburguesas"]).toMatchObject({
      unidades_vendidas: 1,
      facturacion: 3000,
      cantidad_pedidos: 1,
      ticket_promedio: 3000,
    });
    expect(porNombre["Promo sin ventas"]).toMatchObject({
      unidades_vendidas: 0,
      facturacion: 0,
      cantidad_pedidos: 0,
    });
  });

  test("impacto de promociones calcula participación sobre ventas entregadas", async () => {
    const res = await request().get(
      `/api/reportes/promociones/impacto?desde=${RANGO.desde}&hasta=${RANGO.hasta}&id_sucursal=${sucA.id_sucursal}`
    );

    expect(res.status).toBe(200);
    const combo = res.body.find((p) => p.nombre === "Combo 2 hamburguesas");
    expect(combo).toMatchObject({
      pedidos: 1,
      unidades_vendidas: 2,
      facturacion_promocion: 3000,
      facturacion_total: 6000,
      participacion_ventas_pct: 50,
    });
  });
});

describe("Reportes: permisos por sucursal", () => {
  let empleadoA;
  let empleadoB;
  let empleadoSinSucursal;

  beforeAll(async () => {
    empleadoA = await crearEmpleado({ id_sucursal: sucA.id_sucursal });
    empleadoB = await crearEmpleado({ id_sucursal: sucB.id_sucursal });
    empleadoSinSucursal = await crearEmpleado({ id_sucursal: null });
  });

  test("un empleado solo consulta su sucursal aunque no envíe id_sucursal", async () => {
    const res = await requestAs(empleadoA.token).get(
      `/api/reportes/sucursales?desde=${RANGO.desde}&hasta=${RANGO.hasta}`
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      expect.objectContaining({ id_sucursal: sucA.id_sucursal, ventas: 6000 }),
    ]);
  });

  test("un empleado no puede consultar otra sucursal", async () => {
    const res = await requestAs(empleadoA.token).get(
      `/api/reportes/sucursales?desde=${RANGO.desde}&hasta=${RANGO.hasta}&id_sucursal=${sucB.id_sucursal}`
    );

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/otra sucursal/);
  });

  test("un empleado sin sucursal no puede consultar reportes", async () => {
    const res = await requestAs(empleadoSinSucursal.token).get(
      `/api/reportes/pedidos/dia?desde=${RANGO.desde}&hasta=${RANGO.hasta}`
    );

    expect(res.status).toBe(403);
  });

  test("un admin puede filtrar cualquier sucursal", async () => {
    const res = await request().get(
      `/api/reportes/sucursales?desde=${RANGO.desde}&hasta=${RANGO.hasta}&id_sucursal=${sucB.id_sucursal}`
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      expect.objectContaining({ id_sucursal: sucB.id_sucursal, ventas: 4000 }),
    ]);
  });

  test("un empleado de otra sucursal no puede consultar la sucursal A", async () => {
    const res = await requestAs(empleadoB.token).get(
      `/api/reportes/pedidos/estado?desde=${RANGO.desde}&hasta=${RANGO.hasta}&id_sucursal=${sucA.id_sucursal}`
    );

    expect(res.status).toBe(403);
  });
});
