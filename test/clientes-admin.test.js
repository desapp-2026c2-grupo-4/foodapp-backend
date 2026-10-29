const { request, requestAs, app } = require("./helpers/request");
const { crearCliente, crearEmpleado, emailUnico } = require("./helpers/users");
const { resetDb, closeDb } = require("./db_utils");

let tokenCliente;
let tokenEmpleado;

const nuevoCliente = (extras = {}) => ({
  nombre: "Cliente",
  apellido: "Admin",
  tipo_doc: "DNI",
  dni: "30111222",
  email: emailUnico("cliente.admin"),
  password: "secreto123",
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

describe("Gestión administrativa de clientes", () => {
  test("ADMIN crea un cliente sin devolver la contraseña", async () => {
    const datos = nuevoCliente({ nombre: "Lucía" });
    const res = await request(app).post("/api/clientes").send(datos);

    expect(res.status).toBe(201);
    expect(res.body.id_cliente).toBeDefined();
    expect(res.body.nombre).toBe("Lucía");
    expect(res.body.email).toBe(datos.email);
    expect(res.body.password).toBeUndefined();
  });

  test("ADMIN lista clientes sin contraseñas", async () => {
    const creado = await request(app).post("/api/clientes").send(nuevoCliente());

    const res = await request(app).get("/api/clientes");
    expect(res.status).toBe(200);
    const encontrado = res.body.find((c) => c.id_cliente === creado.body.id_cliente);
    expect(encontrado).toBeDefined();
    expect(encontrado.password).toBeUndefined();
    expect(Array.isArray(encontrado.direcciones)).toBe(true);
  });

  test("ADMIN obtiene un cliente por id", async () => {
    const creado = await request(app).post("/api/clientes").send(nuevoCliente({ nombre: "Pedro" }));

    const res = await request(app).get(`/api/clientes/${creado.body.id_cliente}`);
    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe("Pedro");
    expect(res.body.password).toBeUndefined();
    expect(Array.isArray(res.body.direcciones)).toBe(true);
  });

  test("ADMIN puede actualizar los datos de otro cliente", async () => {
    const creado = await request(app).post("/api/clientes").send(nuevoCliente());

    const res = await request(app).put(`/api/clientes/${creado.body.id_cliente}`).send({
      nombre: "Nombre actualizado",
      apellido: "Apellido actualizado",
      dni: "30999888",
    });

    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe("Nombre actualizado");
    expect(res.body.apellido).toBe("Apellido actualizado");
    expect(res.body.dni).toBe("30999888");
    expect(res.body.password).toBeUndefined();
  });

  test("rechaza un email de cliente duplicado", async () => {
    const primero = await request(app).post("/api/clientes").send(nuevoCliente());

    const res = await request(app).post("/api/clientes").send(
      nuevoCliente({ email: primero.body.email })
    );
    expect(res.status).toBe(409);
  });

  test("valida los datos obligatorios al crear un cliente", async () => {
    const res = await request(app).post("/api/clientes").send({
      nombre: "Sin apellido",
      email: emailUnico("invalido"),
      password: "secreto123",
    });
    expect(res.status).toBe(400);
  });

  test("devuelve 404 al consultar un cliente inexistente", async () => {
    const res = await request(app).get("/api/clientes/999999");
    expect(res.status).toBe(404);
  });

  test("protege la gestión de clientes para ADMIN", async () => {
    const creado = await request(app).post("/api/clientes").send(nuevoCliente());

    expect((await requestAs(null).get("/api/clientes")).status).toBe(401);
    expect((await requestAs(tokenCliente).get("/api/clientes")).status).toBe(403);
    expect((await requestAs(tokenEmpleado).get("/api/clientes")).status).toBe(403);
    expect(
      (await requestAs(tokenCliente).post("/api/clientes").send(nuevoCliente())).status
    ).toBe(403);
    expect(
      (await requestAs(tokenCliente).get(`/api/clientes/${creado.body.id_cliente}`)).status
    ).toBe(403);
  });
});
