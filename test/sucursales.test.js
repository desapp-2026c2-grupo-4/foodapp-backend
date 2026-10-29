const { request, app } = require("./helpers/request");
const { resetDb, closeDb } = require("./db_utils");

const BASE = {
  calle: "Av. Rivadavia",
  altura: "1000",
  ciudad: "CABA",
  provincia: "Buenos Aires",
  latitud: -34.6083,
  longitud: -58.3712,
};

beforeAll(async () => {
  await resetDb();
});

afterAll(async () => {
  await closeDb();
});

describe("API de sucursales con horarios", () => {
  test("crea una sucursal con horarios y los devuelve ordenados", async () => {
    const res = await request(app).post("/api/sucursales").send({
      ...BASE,
      nombre: "Centro",
      horarios: [
        { dia_semana: 2, hora_apertura: "09:00", hora_cierre: "18:00" },
        { dia_semana: 1, hora_apertura: "10:00", hora_cierre: "23:00" },
      ],
    });
    expect(res.status).toBe(201);
    expect(res.body.horarios).toHaveLength(2);
    expect(res.body.horarios.map((h) => h.dia_semana)).toEqual([1, 2]);
    expect(parseFloat(res.body.radio_km)).toBe(2);
    expect(typeof res.body.abierta_ahora).toBe("boolean");
  });

  test("permite configurar y actualizar el radio de cobertura", async () => {
    const creada = await request(app).post("/api/sucursales").send({
      ...BASE,
      nombre: "Radio custom",
      radio_km: 3.5,
    });
    expect(creada.status).toBe(201);
    expect(parseFloat(creada.body.radio_km)).toBe(3.5);

    const res = await request(app)
      .put(`/api/sucursales/${creada.body.id_sucursal}`)
      .send({ radio_km: 5 });
    expect(res.status).toBe(200);
    expect(parseFloat(res.body.radio_km)).toBe(5);
  });

  test("rechaza radios de cobertura fuera de rango", async () => {
    for (const radio_km of [0, -1, 101]) {
      const res = await request(app).post("/api/sucursales").send({
        ...BASE,
        nombre: `Radio inválido ${radio_km}`,
        radio_km,
      });
      expect(res.status).toBe(400);
    }
  });

  test("rechaza días duplicados", async () => {
    const res = await request(app).post("/api/sucursales").send({
      ...BASE,
      nombre: "Duplicada",
      horarios: [
        { dia_semana: 1, hora_apertura: "10:00", hora_cierre: "23:00" },
        { dia_semana: 1, hora_apertura: "09:00", hora_cierre: "18:00" },
      ],
    });
    expect(res.status).toBe(400);
  });

  test("rechaza apertura y cierre iguales", async () => {
    const res = await request(app).post("/api/sucursales").send({
      ...BASE,
      nombre: "Iguales",
      horarios: [{ dia_semana: 1, hora_apertura: "10:00", hora_cierre: "10:00" }],
    });
    expect(res.status).toBe(400);
  });

  test("sin horarios se considera abierta siempre", async () => {
    const res = await request(app).post("/api/sucursales").send({ ...BASE, nombre: "Sin horario" });
    expect(res.status).toBe(201);
    expect(res.body.horarios).toEqual([]);
    expect(res.body.abierta_ahora).toBe(true);
  });

  test("una sucursal inactiva nunca está abierta", async () => {
    const res = await request(app).post("/api/sucursales").send({ ...BASE, nombre: "Inactiva", estado: "inactiva" });
    expect(res.status).toBe(201);
    expect(res.body.abierta_ahora).toBe(false);
  });

  test("PUT reemplaza los horarios", async () => {
    const creada = await request(app).post("/api/sucursales").send({
      ...BASE,
      nombre: "Actualizable",
      horarios: [{ dia_semana: 1, hora_apertura: "10:00", hora_cierre: "23:00" }],
    });
    const res = await request(app).put(`/api/sucursales/${creada.body.id_sucursal}`).send({
      horarios: [{ dia_semana: 3, hora_apertura: "12:00", hora_cierre: "20:00" }],
    });
    expect(res.status).toBe(200);
    expect(res.body.horarios).toHaveLength(1);
    expect(res.body.horarios[0].dia_semana).toBe(3);
  });

  test("GET lista incluye horarios y estado operativo", async () => {
    const res = await request(app).get("/api/sucursales");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    for (const sucursal of res.body) {
      expect(Array.isArray(sucursal.horarios)).toBe(true);
      expect(typeof sucursal.abierta_ahora).toBe("boolean");
    }
  });
});
