const { request, app } = require("./helpers/request");
const { MateriaPrima } = require("../models");
const { resetDb, closeDb } = require("./db_utils");

beforeAll(async () => {
  await resetDb();
});

afterAll(async () => {
  await closeDb();
});

describe("CRUD /api/materias-primas", () => {
  let id;

  test("crea una materia prima", async () => {
    const res = await request(app).post("/api/materias-primas").send({ nombre: "Pan" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ nombre: "Pan", estado: "disponible", stock_minimo: 0 });
    id = res.body.id_materia_prima;
  });

  test("crea una materia prima con stock mínimo", async () => {
    const res = await request(app).post("/api/materias-primas").send({ nombre: "Tomate", stock_minimo: 15 });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ nombre: "Tomate", stock_minimo: 15 });
  });

  test("lista las materias primas", async () => {
    const res = await request(app).get("/api/materias-primas");

    expect(res.status).toBe(200);
    expect(res.body.some((m) => m.id_materia_prima === id)).toBe(true);
  });

  test("obtiene una materia prima por id", async () => {
    const res = await request(app).get(`/api/materias-primas/${id}`);

    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe("Pan");
  });

  test("actualiza estado, nombre y stock mínimo", async () => {
    const res = await request(app).put(`/api/materias-primas/${id}`).send({ nombre: "Pan integral", estado: "no_disponible", stock_minimo: 5 });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ nombre: "Pan integral", estado: "no_disponible", stock_minimo: 5 });
  });

  test("rechaza nombre duplicado con 409", async () => {
    await request(app).post("/api/materias-primas").send({ nombre: "Carne" });

    const res = await request(app).post("/api/materias-primas").send({ nombre: "Carne" });

    expect(res.status).toBe(409);
  });

  test("rechaza nombre faltante con 400", async () => {
    const res = await request(app).post("/api/materias-primas").send({});

    expect(res.status).toBe(400);
  });

  test("rechaza estado inválido con 400", async () => {
    const res = await request(app).post("/api/materias-primas").send({ nombre: "Queso", estado: "volando" });

    expect(res.status).toBe(400);
  });

  test("rechaza stock_minimo negativo con 400", async () => {
    const res = await request(app).post("/api/materias-primas").send({ nombre: "Cebolla", stock_minimo: -1 });

    expect(res.status).toBe(400);
  });
});

describe("Baja lógica de materias primas", () => {
  let id;

  test("se oculta pero permanece en la base", async () => {
    const creada = await request(app).post("/api/materias-primas").send({ nombre: "Lechuga" });
    id = creada.body.id_materia_prima;

    const baja = await request(app).delete(`/api/materias-primas/${id}`);
    expect(baja.status).toBe(200);

    const lista = await request(app).get("/api/materias-primas");
    expect(lista.body.some((m) => m.id_materia_prima === id)).toBe(false);
    expect((await request(app).get(`/api/materias-primas/${id}`)).status).toBe(404);

    const enDb = await MateriaPrima.findByPk(id, { paranoid: false });
    expect(enDb).not.toBeNull();
    expect(enDb.deletedAt).not.toBeNull();
  });

  test("reutiliza el nombre si se vuelve a crear", async () => {
    const recreada = await request(app).post("/api/materias-primas").send({ nombre: "Lechuga" });

    expect(recreada.status).toBe(201);
    expect(recreada.body.id_materia_prima).toBe(id);
  });
});
