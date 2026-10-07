const request = require("supertest");
const app = require("../index");
const { Cliente } = require("../models");
const { resetDb, closeDb } = require("./db_utils");

const EMAIL = "juan.perez@example.com";
const PASSWORD = "secreto123";
let idCliente;

beforeAll(async () => {
  await resetDb();
  const reg = await request(app).post("/api/auth/register").send({
    nombre: "Juan",
    apellido: "Pérez",
    email: EMAIL,
    password: PASSWORD,
  });
  idCliente = reg.body.user.id_cliente;
});

afterAll(async () => {
  await closeDb();
});

describe("PUT /api/clientes/:id (email inmutable)", () => {
  test("rechaza cambiar el email con 400", async () => {
    const res = await request(app)
      .put(`/api/clientes/${idCliente}`)
      .send({ email: "nuevo@example.com" });

    expect(res.status).toBe(400);
    const guardado = await Cliente.findByPk(idCliente);
    expect(guardado.email).toBe(EMAIL);
  });

  test("sigue permitiendo modificar los demás datos", async () => {
    const res = await request(app)
      .put(`/api/clientes/${idCliente}`)
      .send({ nombre: "Juancito" });

    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe("Juancito");
    expect(res.body.email).toBe(EMAIL);
  });
});

describe("PUT /api/clientes/:id/password", () => {
  test("cambia la contraseña con la actual correcta y permite login con la nueva", async () => {
    const res = await request(app)
      .put(`/api/clientes/${idCliente}/password`)
      .send({ passwordActual: PASSWORD, passwordNueva: "nueva456" });

    expect(res.status).toBe(200);

    const guardado = await Cliente.findByPk(idCliente);
    expect(guardado.password).not.toBe("nueva456");
    expect(guardado.password).toMatch(/^\$2[aby]\$/);

    const loginNuevo = await request(app)
      .post("/api/auth/login")
      .send({ email: EMAIL, password: "nueva456" });
    expect(loginNuevo.status).toBe(200);

    const loginViejo = await request(app)
      .post("/api/auth/login")
      .send({ email: EMAIL, password: PASSWORD });
    expect(loginViejo.status).toBe(401);
  });

  test("rechaza contraseña actual incorrecta con 401", async () => {
    const res = await request(app)
      .put(`/api/clientes/${idCliente}/password`)
      .send({ passwordActual: "equivocada", passwordNueva: "otra7890" });

    expect(res.status).toBe(401);
  });

  test("rechaza contraseña nueva corta con 400", async () => {
    const res = await request(app)
      .put(`/api/clientes/${idCliente}/password`)
      .send({ passwordActual: "nueva456", passwordNueva: "123" });

    expect(res.status).toBe(400);
  });

  test("rechaza campos faltantes con 400", async () => {
    const res = await request(app)
      .put(`/api/clientes/${idCliente}/password`)
      .send({ passwordActual: "nueva456" });

    expect(res.status).toBe(400);
  });

  test("cliente inexistente devuelve 404", async () => {
    const res = await request(app)
      .put("/api/clientes/9999/password")
      .send({ passwordActual: "x", passwordNueva: "nueva456" });

    expect(res.status).toBe(404);
  });
});
