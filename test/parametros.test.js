const { request, requestAs } = require("./helpers/request");
const { crearCliente, crearEmpleado } = require("./helpers/users");
const { resetDb, closeDb } = require("./db_utils");
const { Parametro, Sucursal, MateriaPrima, ReduccionStock } = require("../models");
const { getAdmin } = require("./helpers/auth");
const parametroService = require("../services/parametroService");
const { serializarPedido } = require("../services/pedidoService");
const { resolverRangoConParametros } = require("../services/reporteService");

let tokenEmpleado;
let tokenCliente;

beforeAll(async () => {
  await resetDb();
  const { token: empleado } = await crearEmpleado({ rol: "EMPLEADO" });
  const { token: cliente } = await crearCliente();
  tokenEmpleado = empleado;
  tokenCliente = cliente;
});

beforeEach(async () => {
  await Parametro.destroy({ where: {} });
  parametroService.resetCache();
});

afterAll(async () => {
  await closeDb();
});

describe("API de parámetros", () => {
  test("requiere autenticación", async () => {
    const res = await requestAs(null).get("/api/parametros");
    expect(res.status).toBe(401);
  });

  test("permite consultar a staff y administradores", async () => {
    const admin = await request().get("/api/parametros");
    expect(admin.status).toBe(200);
    expect(admin.body).toHaveLength(Object.keys(parametroService.DEFAULTS).length);
    expect(admin.body.find((p) => p.clave === "tiempo_base_entrega_min")).toMatchObject({
      valor: 20,
      valor_defecto: 20,
      grupo: "operacion",
    });

    const staff = await requestAs(tokenEmpleado).get("/api/parametros");
    expect(staff.status).toBe(200);
  });

  test("rechaza clientes y empleados al modificar", async () => {
    const cliente = await requestAs(tokenCliente)
      .put("/api/parametros")
      .send({ tiempo_base_entrega_min: 10 });
    expect(cliente.status).toBe(403);

    const empleado = await requestAs(tokenEmpleado)
      .put("/api/parametros")
      .send({ tiempo_base_entrega_min: 10 });
    expect(empleado.status).toBe(403);
  });

  test("actualiza parámetros y los persiste", async () => {
    const res = await request()
      .put("/api/parametros")
      .send({ tiempo_base_entrega_min: 12, radio_cobertura_default_km: 4.5 });

    expect(res.status).toBe(200);
    const porClave = Object.fromEntries(res.body.map((p) => [p.clave, p.valor]));
    expect(porClave.tiempo_base_entrega_min).toBe(12);
    expect(porClave.radio_cobertura_default_km).toBe(4.5);

    const get = await request().get("/api/parametros");
    const actualizado = get.body.find((p) => p.clave === "tiempo_base_entrega_min");
    expect(actualizado.valor).toBe(12);
    expect(actualizado.actualizado_en).not.toBeNull();
    expect(actualizado.actualizado_por).not.toBeNull();
  });

  test("valida valores y claves desconocidas", async () => {
    const fueraDeRango = await request()
      .put("/api/parametros")
      .send({ tiempo_base_entrega_min: 0 });
    expect(fueraDeRango.status).toBe(400);

    const desconocido = await request()
      .put("/api/parametros")
      .send({ parametro_inventado: 1 });
    expect(desconocido.status).toBe(400);
  });

  test("valida relaciones entre valores por defecto y máximos", async () => {
    const res = await request()
      .put("/api/parametros")
      .send({ reporte_dias_default: 60, reporte_dias_max: 30 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no pueden superar/);
  });

  test("el ETA usa el tiempo base configurado", async () => {
    await request().put("/api/parametros").send({ tiempo_base_entrega_min: 7 });

    const pedido = {
      toJSON: () => ({
        id_pedido: 1,
        direccion: { latitud: -34.6, longitud: -58.38 },
        sucursal: { latitud: -34.6, longitud: -58.38 },
      }),
    };
    const serializado = await serializarPedido(pedido);
    expect(serializado.tiempo_estimado_min).toBe(7);
  });


  test("aplica los defaults configurados al crear sucursales y materias primas", async () => {
    await request().put("/api/parametros").send({
      radio_cobertura_default_km: 4.2,
      stock_minimo_default: 7,
    });

    const sufijo = Date.now();
    const sucursal = await request().post("/api/sucursales").send({
      nombre: `Sucursal default ${sufijo}`,
      calle: "Av. Test",
      altura: "123",
      ciudad: "CABA",
      provincia: "Buenos Aires",
    });
    expect(sucursal.status).toBe(201);
    expect(parseFloat(sucursal.body.radio_km)).toBe(4.2);

    const materia = await request().post("/api/materias-primas").send({
      nombre: `Materia default ${sufijo}`,
    });
    expect(materia.status).toBe(201);
    expect(materia.body.stock_minimo).toBe(7);
  });

  test("el historial de reducciones respeta el límite configurado", async () => {
    const admin = getAdmin();
    const sufijo = Date.now();
    const sucursal = await Sucursal.create({
      nombre: `Sucursal reducciones ${sufijo}`,
      calle: "Av. Test",
      altura: "456",
      ciudad: "CABA",
      provincia: "Buenos Aires",
    });
    const materia = await MateriaPrima.create({ nombre: `Materia reducciones ${sufijo}` });
    await ReduccionStock.bulkCreate([1, 2, 3].map((n) => ({
      id_sucursal: sucursal.id_sucursal,
      id_materia_prima: materia.id_materia_prima,
      id_empleado: admin.id_empleado,
      cantidad: 1,
      stock_anterior: n,
      stock_nuevo: n - 1,
      motivo: `Reducción ${n}`,
    })));

    await request().put("/api/parametros").send({ historial_reducciones_limit: 2 });
    const res = await request().get(`/api/stock/reducciones?sucursal=${sucursal.id_sucursal}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test("los reportes usan el rango por defecto y el máximo configurados", async () => {
    await request().put("/api/parametros").send({
      reporte_dias_default: 7,
      reporte_dias_max: 30,
    });

    const rango = await resolverRangoConParametros(undefined, "2026-09-30");
    expect(rango.desde).toBe("2026-09-24");
    expect(rango.hasta).toBe("2026-09-30");

    await expect(
      resolverRangoConParametros("2026-01-01", "2026-12-31")
    ).rejects.toThrow(/no puede superar 30 días/);
  });
});
