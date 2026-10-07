const request = require("supertest");
const app = require("../index");
const { Cliente } = require("../models");
const { resetDb, closeDb } = require("./db_utils");

const CLIENTE = {
  nombre: "Juan",
  apellido: "Pérez",
  tipo_doc: "DNI",
  dni: "30111222",
  email: "juan.perez@example.com",
  password: "secreto123",
};

beforeAll(async () => {
  await resetDb();
});

afterAll(async () => {
  await closeDb();
});

describe("POST /api/auth/register", () => {
  test("registra un cliente y devuelve token + usuario con rol CLIENTE", async () => {
    const res = await request(app).post("/api/auth/register").send(CLIENTE);

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toMatchObject({
      nombre: "Juan",
      apellido: "Pérez",
      email: "juan.perez@example.com",
      rol: "CLIENTE",
    });
    expect(res.body.user.password).toBeUndefined();
  });

  test("guarda la contraseña hasheada, no en texto plano", async () => {
    const guardado = await Cliente.findOne({ where: { email: CLIENTE.email } });

    expect(guardado.password).not.toBe(CLIENTE.password);
    expect(guardado.password).toMatch(/^\$2[aby]\$/);
  });

  test("rechaza email duplicado con 409", async () => {
    const res = await request(app).post("/api/auth/register").send(CLIENTE);

    expect(res.status).toBe(409);
  });

  test("rechaza intento de inyectar rol ADMIN", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...CLIENTE, email: "otro@example.com", rol: "ADMIN" });

    // Joi no permite claves desconocidas: el rol nunca llega al servicio
    expect(res.status).toBe(400);
  });

  test("valida campos obligatorios y password mínima", async () => {
    const sinEmail = await request(app)
      .post("/api/auth/register")
      .send({ ...CLIENTE, email: undefined });

    const corta = await request(app)
      .post("/api/auth/register")
      .send({ ...CLIENTE, email: "corta@example.com", password: "123" });

    expect(sinEmail.status).toBe(400);
    expect(corta.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  test("login correcto de cliente devuelve token + usuario", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: CLIENTE.email, password: CLIENTE.password });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toMatchObject({ email: CLIENTE.email, rol: "CLIENTE" });
    expect(res.body.user.password).toBeUndefined();
  });

  test("contraseña incorrecta devuelve 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: CLIENTE.email, password: "otra-clave" });

    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
  });

  test("email inexistente devuelve 401 sin distinguir el motivo", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nadie@example.com", password: "secreto123" });

    expect(res.status).toBe(401);
  });

  test("faltan credenciales devuelve 400", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: CLIENTE.email });

    expect(res.status).toBe(400);
  });

  test("login de empleado devuelve su rol", async () => {
    await request(app).post("/api/empleados").send({
      nombre: "Ana",
      apellido: "Prueba",
      rol: "EMPLEADO",
      email: "ana.test@example.com",
      password: "secreto123",
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ana.test@example.com", password: "secreto123" });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: "ana.test@example.com", rol: "EMPLEADO" });
  });

  test("migra a hash la contraseña guardada en texto plano", async () => {
    await Cliente.create({
      nombre: "Viejo",
      apellido: "Plano",
      email: "viejo.plano@example.com",
      password: "clave-vieja",
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "viejo.plano@example.com", password: "clave-vieja" });

    expect(res.status).toBe(200);

    const guardado = await Cliente.findOne({ where: { email: "viejo.plano@example.com" } });
    expect(guardado.password).toMatch(/^\$2[aby]\$/);
  });
});
