const { request, app } = require("./helpers/request");
const { Cliente } = require("../models");
const { resetDb, closeDb } = require("./db_utils");
const { hashPassword } = require("../utils/password");

const CLIENTE = {
  nombre: "Juan",
  apellido: "Pérez",
  tipo_doc: "DNI",
  dni: "30111222",
  email: "juan.perez@example.com",
  password: "secreto123",
};

const RECUPERACION = {
  nombre: "Recupera",
  apellido: "Clave",
  tipo_doc: "DNI",
  dni: "33444555",
  email: "recupera@example.com",
  password: "vieja123",
};

beforeAll(async () => {
  await resetDb();
  await Cliente.create({
    ...RECUPERACION,
    password: await hashPassword(RECUPERACION.password),
  });
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

  test("rechaza el registro sin DNI", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...CLIENTE, email: "sin.dni@example.com", dni: undefined });

    expect(res.status).toBe(400);
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

describe("Recuperación de contraseña", () => {
  const recuperar = (email, dni) =>
    request(app).post("/api/auth/password/recuperar").send({ email, dni });

  test("verifica email + DNI y devuelve un token temporal", async () => {
    const res = await recuperar(RECUPERACION.email, "33.444.555");

    expect(res.status).toBe(200);
    expect(res.body.resetToken).toBeDefined();
    expect(res.body.expiresIn).toBe(900);

    const guardado = await Cliente.findOne({ where: { email: RECUPERACION.email } });
    expect(guardado.password).toMatch(/^\$2[aby]\$/);
  });

  test("no revela si el email existe cuando el DNI no coincide", async () => {
    const dniIncorrecto = await recuperar(RECUPERACION.email, "00000000");
    const emailInexistente = await recuperar("nadie@example.com", RECUPERACION.dni);

    expect(dniIncorrecto.status).toBe(400);
    expect(emailInexistente.status).toBe(400);
    expect(dniIncorrecto.body.resetToken).toBeUndefined();
    expect(emailInexistente.body.resetToken).toBeUndefined();
    expect(dniIncorrecto.body.error).toBe("No se pudieron verificar los datos");
    expect(emailInexistente.body.error).toBe(dniIncorrecto.body.error);
  });

  test("restablece la contraseña con el token y permite login con la nueva", async () => {
    const recuperacion = await recuperar(RECUPERACION.email, RECUPERACION.dni);
    const res = await request(app)
      .post("/api/auth/password/restablecer")
      .send({ resetToken: recuperacion.body.resetToken, passwordNueva: "nueva789" });

    expect(res.status).toBe(200);
    expect(res.body.mensaje).toBe("Contraseña actualizada correctamente");

    const guardado = await Cliente.findOne({ where: { email: RECUPERACION.email } });
    expect(guardado.password).not.toBe("nueva789");
    expect(guardado.password).toMatch(/^\$2[aby]\$/);

    const loginNuevo = await request(app)
      .post("/api/auth/login")
      .send({ email: RECUPERACION.email, password: "nueva789" });
    expect(loginNuevo.status).toBe(200);

    const loginViejo = await request(app)
      .post("/api/auth/login")
      .send({ email: RECUPERACION.email, password: RECUPERACION.password });
    expect(loginViejo.status).toBe(401);
  });

  test("rechaza un token inválido con 400", async () => {
    const res = await request(app)
      .post("/api/auth/password/restablecer")
      .send({ resetToken: "token-invalido", passwordNueva: "nueva789" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/inválido|expiró/);
  });

  test("rechaza una contraseña nueva corta con 400", async () => {
    const recuperacion = await recuperar(RECUPERACION.email, RECUPERACION.dni);
    const res = await request(app)
      .post("/api/auth/password/restablecer")
      .send({ resetToken: recuperacion.body.resetToken, passwordNueva: "123" });

    expect(res.status).toBe(400);
  });

  test("un token de sesión normal no sirve para restablecer contraseña", async () => {
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: CLIENTE.email, password: CLIENTE.password });
    const res = await request(app)
      .post("/api/auth/password/restablecer")
      .send({ resetToken: login.body.token, passwordNueva: "nueva789" });

    expect(res.status).toBe(400);
  });
});
