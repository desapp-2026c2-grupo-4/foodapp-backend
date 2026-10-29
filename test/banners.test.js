const { request, requestAs, app } = require("./helpers/request");
const { crearCliente, crearEmpleado } = require("./helpers/users");
const { resetDb, closeDb } = require("./db_utils");
const { Banner } = require("../models");

let tokenCliente;
let tokenEmpleado;

const nuevoBanner = (extras = {}) => ({
  titulo: `Banner ${Date.now()}`,
  descripcion: "Descripción",
  imagen: "https://example.com/banner.jpg",
  activo: true,
  orden: 0,
  ...extras,
});

beforeAll(async () => {
  await resetDb();
  tokenCliente = (await crearCliente()).token;
  tokenEmpleado = (await crearEmpleado()).token;
});

afterAll(async () => {
  await closeDb();
});

describe("CRUD /api/banners", () => {
  test("crea un banner", async () => {
    const datos = nuevoBanner({ titulo: "Banner principal" });
    const res = await request(app).post("/api/banners").send(datos);

    expect(res.status).toBe(201);
    expect(res.body.id_banner).toBeDefined();
    expect(res.body.titulo).toBe("Banner principal");
    expect(res.body.activo).toBe(true);
  });

  test("lista públicamente y ordena por orden", async () => {
    const segundo = await request(app).post("/api/banners").send(nuevoBanner({ titulo: "Orden 20", orden: 20 }));
    const primero = await request(app).post("/api/banners").send(nuevoBanner({ titulo: "Orden 1", orden: 1 }));

    const res = await requestAs(null).get("/api/banners");
    expect(res.status).toBe(200);
    const posPrimero = res.body.findIndex((b) => b.id_banner === primero.body.id_banner);
    const posSegundo = res.body.findIndex((b) => b.id_banner === segundo.body.id_banner);
    expect(posPrimero).toBeGreaterThanOrEqual(0);
    expect(posPrimero).toBeLessThan(posSegundo);
  });

  test("filtra banners activos e inactivos", async () => {
    const activo = await request(app).post("/api/banners").send(nuevoBanner({ titulo: "Activo" }));
    const inactivo = await request(app).post("/api/banners").send(nuevoBanner({ titulo: "Inactivo", activo: false }));

    const soloActivos = await requestAs(null).get("/api/banners?activo=true");
    expect(soloActivos.status).toBe(200);
    expect(soloActivos.body.some((b) => b.id_banner === activo.body.id_banner)).toBe(true);
    expect(soloActivos.body.some((b) => b.id_banner === inactivo.body.id_banner)).toBe(false);

    const soloInactivos = await requestAs(null).get("/api/banners?activo=false");
    expect(soloInactivos.status).toBe(200);
    expect(soloInactivos.body.some((b) => b.id_banner === inactivo.body.id_banner)).toBe(true);
    expect(soloInactivos.body.some((b) => b.id_banner === activo.body.id_banner)).toBe(false);
  });

  test("obtiene un banner por id", async () => {
    const creado = await request(app).post("/api/banners").send(nuevoBanner({ titulo: "Detalle" }));

    const res = await requestAs(null).get(`/api/banners/${creado.body.id_banner}`);
    expect(res.status).toBe(200);
    expect(res.body.titulo).toBe("Detalle");
  });

  test("actualiza los campos del banner", async () => {
    const creado = await request(app).post("/api/banners").send(nuevoBanner());

    const res = await request(app).put(`/api/banners/${creado.body.id_banner}`).send({
      titulo: "Actualizado",
      descripcion: "Nueva",
      imagen: "https://example.com/nueva.jpg",
      orden: 5,
    });

    expect(res.status).toBe(200);
    expect(res.body.titulo).toBe("Actualizado");
    expect(res.body.descripcion).toBe("Nueva");
    expect(res.body.orden).toBe(5);
  });

  test("activa y desactiva un banner", async () => {
    const creado = await request(app).post("/api/banners").send(nuevoBanner());

    const desactivado = await request(app)
      .put(`/api/banners/${creado.body.id_banner}`)
      .send({ activo: false });
    expect(desactivado.status).toBe(200);
    expect(desactivado.body.activo).toBe(false);

    const activado = await request(app)
      .put(`/api/banners/${creado.body.id_banner}`)
      .send({ activo: true });
    expect(activado.status).toBe(200);
    expect(activado.body.activo).toBe(true);
  });

  test("rechaza banners inválidos", async () => {
    expect((await request(app).post("/api/banners").send({ titulo: "Sin imagen" })).status).toBe(400);
    expect((await request(app).post("/api/banners").send(nuevoBanner({ imagen: "" }))).status).toBe(400);
    expect((await request(app).post("/api/banners").send(nuevoBanner({ orden: -1 }))).status).toBe(400);
  });

  test("elimina lógicamente el banner", async () => {
    const creado = await request(app).post("/api/banners").send(nuevoBanner());

    const res = await request(app).delete(`/api/banners/${creado.body.id_banner}`);
    expect(res.status).toBe(200);
    expect(res.body.mensaje).toBeDefined();

    expect((await requestAs(null).get(`/api/banners/${creado.body.id_banner}`)).status).toBe(404);
    expect(await Banner.findByPk(creado.body.id_banner)).toBeNull();
  });

  test("devuelve 404 para operaciones sobre un banner inexistente", async () => {
    expect((await requestAs(null).get("/api/banners/999999")).status).toBe(404);
    expect((await request(app).put("/api/banners/999999").send({ titulo: "X" })).status).toBe(404);
    expect((await request(app).delete("/api/banners/999999")).status).toBe(404);
  });

  test("protege las mutaciones para ADMIN", async () => {
    const creado = await request(app).post("/api/banners").send(nuevoBanner());
    const payload = nuevoBanner();

    expect((await requestAs(null).post("/api/banners").send(payload)).status).toBe(401);
    expect((await requestAs(tokenCliente).post("/api/banners").send(payload)).status).toBe(403);
    expect((await requestAs(tokenEmpleado).post("/api/banners").send(payload)).status).toBe(403);
    expect(
      (await requestAs(tokenCliente).put(`/api/banners/${creado.body.id_banner}`).send({ activo: false })).status
    ).toBe(403);
    expect(
      (await requestAs(tokenEmpleado).delete(`/api/banners/${creado.body.id_banner}`)).status
    ).toBe(403);
  });
});
