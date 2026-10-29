const { request, requestAs, app } = require("./helpers/request");
const { crearCliente, crearEmpleado } = require("./helpers/users");
const { resetDb, closeDb } = require("./db_utils");
const { Producto, Promocion, PromocionProducto } = require("../models");
const { estaVigente } = require("../services/promocionService");

const VIGENCIA = { fecha_inicio: "2024-01-01", fecha_fin: "2035-12-31" };

let productoA;
let productoB;
let tokenCliente;
let tokenEmpleado;

const crearPromocion = (extras = {}) =>
  request(app).post("/api/promociones").send({
    nombre: "Combo de prueba",
    descripcion: "Combo",
    tipo: "PRECIO_FIJO",
    valor: 2500,
    ...VIGENCIA,
    productos: [{ id_producto: productoA.id_producto, cantidad: 2 }],
    ...extras,
  });

beforeAll(async () => {
  await resetDb();
  productoA = await Producto.create({ nombre: "Hamburguesa", precio: 1000 });
  productoB = await Producto.create({ nombre: "Papas", precio: 2000 });
  tokenCliente = (await crearCliente()).token;
  tokenEmpleado = (await crearEmpleado()).token;
});

afterAll(async () => {
  await closeDb();
});

describe("CRUD /api/promociones", () => {
  test("crea una promoción PRECIO_FIJO con productos y cantidades", async () => {
    const res = await crearPromocion({
      nombre: "Combo Bajón",
      productos: [
        { id_producto: productoA.id_producto, cantidad: 2 },
        { id_producto: productoB.id_producto, cantidad: 1 },
      ],
    });

    expect(res.status).toBe(201);
    expect(res.body.id_promocion).toBeDefined();
    expect(res.body.tipo).toBe("PRECIO_FIJO");
    expect(res.body.productos).toHaveLength(2);
    const hamburguesa = res.body.productos.find((p) => p.id_producto === productoA.id_producto);
    expect(hamburguesa.PromocionProducto.cantidad).toBe(2);
  });

  test("conserva las fechas exactas al crear y actualizar", async () => {
    const creada = await crearPromocion({
      fecha_inicio: "2026-09-20",
      fecha_fin: "2026-10-20",
    });

    expect(creada.status).toBe(201);
    expect(creada.body.fecha_inicio).toBe("2026-09-20");
    expect(creada.body.fecha_fin).toBe("2026-10-20");

    const actualizada = await request(app).put(`/api/promociones/${creada.body.id_promocion}`).send({
      fecha_inicio: "2026-11-01",
      fecha_fin: "2026-11-30",
    });

    expect(actualizada.status).toBe(200);
    expect(actualizada.body.fecha_inicio).toBe("2026-11-01");
    expect(actualizada.body.fecha_fin).toBe("2026-11-30");
  });

  test("rechaza fechas con hora o inválidas", async () => {
    const conHora = await crearPromocion({ fecha_inicio: "2026-09-20T00:00:00.000Z" });
    expect(conHora.status).toBe(400);

    const invalida = await crearPromocion({ fecha_inicio: "2026-02-31" });
    expect(invalida.status).toBe(400);
  });

  test("estaVigente usa el día local de Argentina", () => {
    const promocion = { activa: true, fecha_inicio: "2026-10-28", fecha_fin: "2026-10-28" };

    expect(estaVigente(promocion, new Date("2026-10-29T02:30:00.000Z"), "America/Argentina/Buenos_Aires")).toBe(true);
    expect(estaVigente(promocion, new Date("2026-10-29T03:30:00.000Z"), "America/Argentina/Buenos_Aires")).toBe(false);
  });

  test("crea una promoción PORCENTAJE", async () => {
    const res = await crearPromocion({
      nombre: "20% off",
      tipo: "PORCENTAJE",
      valor: 20,
    });

    expect(res.status).toBe(201);
    expect(res.body.tipo).toBe("PORCENTAJE");
    expect(Number(res.body.valor)).toBe(20);
  });

  test("lista y obtiene promociones públicamente", async () => {
    const creada = await crearPromocion({ nombre: "Pública" });

    const lista = await requestAs(null).get("/api/promociones");
    expect(lista.status).toBe(200);
    expect(lista.body.some((p) => p.id_promocion === creada.body.id_promocion)).toBe(true);
    expect(typeof lista.body[0].vigente).toBe("boolean");

    const detalle = await requestAs(null).get(`/api/promociones/${creada.body.id_promocion}`);
    expect(detalle.status).toBe(200);
    expect(detalle.body.nombre).toBe("Pública");
    expect(typeof detalle.body.vigente).toBe("boolean");
  });

  test("actualiza datos y reemplaza los productos", async () => {
    const creada = await crearPromocion();

    const res = await request(app).put(`/api/promociones/${creada.body.id_promocion}`).send({
      nombre: "Combo actualizado",
      valor: 3000,
      productos: [{ id_producto: productoB.id_producto, cantidad: 3 }],
    });

    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe("Combo actualizado");
    expect(Number(res.body.valor)).toBe(3000);
    expect(res.body.productos).toHaveLength(1);
    expect(res.body.productos[0].id_producto).toBe(productoB.id_producto);
    expect(res.body.productos[0].PromocionProducto.cantidad).toBe(3);
  });

  test("activa y desactiva una promoción", async () => {
    const creada = await crearPromocion();

    const desactivada = await request(app)
      .put(`/api/promociones/${creada.body.id_promocion}`)
      .send({ activa: false });
    expect(desactivada.status).toBe(200);
    expect(desactivada.body.activa).toBe(false);

    const detalle = await requestAs(null).get(`/api/promociones/${creada.body.id_promocion}`);
    expect(detalle.body.vigente).toBe(false);

    const activada = await request(app)
      .put(`/api/promociones/${creada.body.id_promocion}`)
      .send({ activa: true });
    expect(activada.status).toBe(200);
    expect(activada.body.activa).toBe(true);
  });

  test("rechaza un porcentaje fuera de rango", async () => {
    const res = await crearPromocion({ tipo: "PORCENTAJE", valor: 150 });
    expect(res.status).toBe(400);
  });

  test("rechaza una fecha de fin anterior al inicio", async () => {
    const res = await crearPromocion({
      fecha_inicio: "2030-01-01",
      fecha_fin: "2029-01-01",
    });
    expect(res.status).toBe(400);
  });

  test("rechaza una promoción sin productos", async () => {
    const res = await crearPromocion({ productos: [] });
    expect(res.status).toBe(400);
  });

  test("no crea la promoción si un producto no existe", async () => {
    const antes = await Promocion.count();

    const res = await crearPromocion({
      productos: [{ id_producto: 999999, cantidad: 1 }],
    });

    expect(res.status).toBe(404);
    expect(await Promocion.count()).toBe(antes);
  });

  test("no modifica la promoción si un producto nuevo no existe", async () => {
    const creada = await crearPromocion({ nombre: "Original" });

    const res = await request(app).put(`/api/promociones/${creada.body.id_promocion}`).send({
      nombre: "No debería guardarse",
      productos: [{ id_producto: 999999, cantidad: 1 }],
    });

    expect(res.status).toBe(404);
    const actual = await Promocion.findByPk(creada.body.id_promocion);
    expect(actual.nombre).toBe("Original");
    const relaciones = await PromocionProducto.findAll({
      where: { id_promocion: creada.body.id_promocion },
    });
    expect(relaciones).toHaveLength(1);
    expect(relaciones[0].id_producto).toBe(productoA.id_producto);
  });

  test("hace rollback si falla el reemplazo de productos", async () => {
    const creada = await crearPromocion({ nombre: "Rollback" });

    const res = await request(app).put(`/api/promociones/${creada.body.id_promocion}`).send({
      nombre: "Cambio que debe revertirse",
      productos: [
        { id_producto: productoA.id_producto, cantidad: 1 },
        { id_producto: productoA.id_producto, cantidad: 2 },
      ],
    });

    expect(res.status).toBe(400);
    const actual = await Promocion.findByPk(creada.body.id_promocion);
    expect(actual.nombre).toBe("Rollback");
    const relaciones = await PromocionProducto.findAll({
      where: { id_promocion: creada.body.id_promocion },
    });
    expect(relaciones).toHaveLength(1);
    expect(relaciones[0].cantidad).toBe(2);
  });

  test("elimina lógicamente la promoción", async () => {
    const creada = await crearPromocion();

    const res = await request(app).delete(`/api/promociones/${creada.body.id_promocion}`);
    expect(res.status).toBe(200);
    expect(res.body.mensaje).toBeDefined();

    const detalle = await requestAs(null).get(`/api/promociones/${creada.body.id_promocion}`);
    expect(detalle.status).toBe(404);
    expect(await Promocion.findByPk(creada.body.id_promocion)).toBeNull();
  });

  test("protege las mutaciones para ADMIN", async () => {
    const creada = await crearPromocion();
    const payload = { ...VIGENCIA, nombre: "No permitido", tipo: "PRECIO_FIJO", valor: 1, productos: [{ id_producto: productoA.id_producto, cantidad: 1 }] };

    expect((await requestAs(null).post("/api/promociones").send(payload)).status).toBe(401);
    expect((await requestAs(tokenCliente).post("/api/promociones").send(payload)).status).toBe(403);
    expect((await requestAs(tokenEmpleado).post("/api/promociones").send(payload)).status).toBe(403);
    expect(
      (await requestAs(tokenCliente).put(`/api/promociones/${creada.body.id_promocion}`).send({ activa: false })).status
    ).toBe(403);
    expect(
      (await requestAs(tokenEmpleado).delete(`/api/promociones/${creada.body.id_promocion}`)).status
    ).toBe(403);
  });
});
