const { request, requestAs, app } = require("./helpers/request");
const { crearCliente, crearEmpleado, emailUnico } = require("./helpers/users");
const { resetDb, closeDb } = require("./db_utils");
const { Sucursal, Empleado } = require("../models");

let sucursal;
let tokenCliente;
let tokenEmpleado;

const nuevoEmpleado = (extras = {}) => ({
  nombre: "Ana",
  apellido: "Pérez",
  rol: "EMPLEADO",
  email: emailUnico("ana"),
  password: "secreto123",
  id_sucursal: sucursal.id_sucursal,
  ...extras,
});

beforeAll(async () => {
  await resetDb();
  sucursal = await Sucursal.create({
    nombre: "Centro",
    calle: "Av. Rivadavia",
    altura: "1000",
    ciudad: "CABA",
    provincia: "Buenos Aires",
    latitud: -34.6083,
    longitud: -58.3712,
    estado: "activa",
  });
  tokenCliente = (await crearCliente()).token;
  tokenEmpleado = (await crearEmpleado({ id_sucursal: sucursal.id_sucursal })).token;
});

afterAll(async () => {
  await closeDb();
});

describe("CRUD /api/empleados", () => {
  test("crea un empleado con sucursal sin devolver la contraseña", async () => {
    const datos = nuevoEmpleado();
    const res = await request(app).post("/api/empleados").send(datos);

    expect(res.status).toBe(201);
    expect(res.body.id_empleado).toBeDefined();
    expect(res.body.email).toBe(datos.email);
    expect(res.body.rol).toBe("EMPLEADO");
    expect(res.body.id_sucursal).toBe(sucursal.id_sucursal);
    expect(res.body.password).toBeUndefined();
  });

  test("lista y obtiene empleados sin exponer la contraseña", async () => {
    const creado = await request(app).post("/api/empleados").send(nuevoEmpleado());

    const lista = await request(app).get("/api/empleados");
    expect(lista.status).toBe(200);
    const encontrado = lista.body.find((e) => e.id_empleado === creado.body.id_empleado);
    expect(encontrado).toBeDefined();
    expect(encontrado.password).toBeUndefined();
    expect(encontrado.sucursal.id_sucursal).toBe(sucursal.id_sucursal);

    const detalle = await request(app).get(`/api/empleados/${creado.body.id_empleado}`);
    expect(detalle.status).toBe(200);
    expect(detalle.body.password).toBeUndefined();
  });

  test("actualiza datos y contraseña, y permite login con la nueva", async () => {
    const creado = await request(app).post("/api/empleados").send(nuevoEmpleado());

    const res = await request(app).put(`/api/empleados/${creado.body.id_empleado}`).send({
      nombre: "Ana María",
      password: "nueva456",
    });
    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe("Ana María");
    expect(res.body.password).toBeUndefined();

    const loginNuevo = await requestAs(null).post("/api/auth/login").send({
      email: creado.body.email,
      password: "nueva456",
    });
    expect(loginNuevo.status).toBe(200);

    const loginViejo = await requestAs(null).post("/api/auth/login").send({
      email: creado.body.email,
      password: "secreto123",
    });
    expect(loginViejo.status).toBe(401);
  });

  test("rechaza un email duplicado de empleado", async () => {
    const primero = await request(app).post("/api/empleados").send(nuevoEmpleado());

    const res = await request(app).post("/api/empleados").send(
      nuevoEmpleado({ email: primero.body.email })
    );
    expect(res.status).toBe(409);
  });

  test("rechaza un email que ya usa un cliente", async () => {
    const { cliente } = await crearCliente({ email: emailUnico("cliente.duplicado") });

    const res = await request(app).post("/api/empleados").send(
      nuevoEmpleado({ email: cliente.email })
    );
    expect(res.status).toBe(409);
  });

  test("rechaza un rol inválido", async () => {
    const res = await request(app).post("/api/empleados").send(nuevoEmpleado({ rol: "GERENTE" }));
    expect(res.status).toBe(400);
  });

  test("rechaza una sucursal inexistente", async () => {
    const res = await request(app).post("/api/empleados").send(
      nuevoEmpleado({ id_sucursal: 999999 })
    );
    expect(res.status).toBe(404);
  });

  test("rechaza un email inválido", async () => {
    const res = await request(app).post("/api/empleados").send(
      nuevoEmpleado({ email: "no-es-email" })
    );
    expect(res.status).toBe(400);
  });

  test("hace baja lógica y bloquea el login", async () => {
    const datos = nuevoEmpleado();
    const creado = await request(app).post("/api/empleados").send(datos);

    const res = await request(app).delete(`/api/empleados/${creado.body.id_empleado}`);
    expect(res.status).toBe(200);

    const lista = await request(app).get("/api/empleados");
    expect(lista.body.some((e) => e.id_empleado === creado.body.id_empleado)).toBe(false);

    const login = await requestAs(null).post("/api/auth/login").send({
      email: datos.email,
      password: datos.password,
    });
    expect(login.status).toBe(401);
    expect(await Empleado.findByPk(creado.body.id_empleado)).toBeNull();
  });

  test("permite reutilizar el email después de la baja", async () => {
    const datos = nuevoEmpleado();
    const creado = await request(app).post("/api/empleados").send(datos);
    await request(app).delete(`/api/empleados/${creado.body.id_empleado}`);

    const res = await request(app).post("/api/empleados").send(
      nuevoEmpleado({ email: datos.email })
    );
    expect(res.status).toBe(201);
  });

  test("devuelve 404 al actualizar un empleado inexistente", async () => {
    const res = await request(app).put("/api/empleados/999999").send({ nombre: "Nadie" });
    expect(res.status).toBe(404);
  });

  test("protege todas las rutas para ADMIN", async () => {
    const creado = await request(app).post("/api/empleados").send(nuevoEmpleado());
    const payload = nuevoEmpleado();

    expect((await requestAs(null).get("/api/empleados")).status).toBe(401);
    expect((await requestAs(tokenCliente).get("/api/empleados")).status).toBe(403);
    expect((await requestAs(tokenEmpleado).get("/api/empleados")).status).toBe(403);
    expect((await requestAs(tokenCliente).post("/api/empleados").send(payload)).status).toBe(403);
    expect(
      (await requestAs(tokenEmpleado).put(`/api/empleados/${creado.body.id_empleado}`).send({ nombre: "X" })).status
    ).toBe(403);
    expect(
      (await requestAs(tokenCliente).delete(`/api/empleados/${creado.body.id_empleado}`)).status
    ).toBe(403);
  });
});
