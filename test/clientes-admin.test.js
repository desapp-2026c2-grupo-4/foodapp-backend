const { request, requestAs, app } = require("./helpers/request");
const { crearCliente, crearEmpleado, emailUnico } = require("./helpers/users");
const { resetDb, closeDb } = require("./db_utils");
const { Direccion, Sucursal, Pedido } = require("../models");

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
    expect(res.body.created_at).toBeDefined();
    expect(Array.isArray(res.body.direcciones)).toBe(true);
  });

  test("ADMIN obtiene el resumen de clientes con métricas de compra", async () => {
    const { cliente } = await crearCliente({ nombre: "Resumen", apellido: "Test" });
    const direccion = await Direccion.create({
      calle: "Calle Resumen",
      altura: "123",
      ciudad: "CABA",
      provincia: "Buenos Aires",
      latitud: -34.6,
      longitud: -58.4,
      id_cliente: cliente.id_cliente,
    });
    const sucursalA = await Sucursal.create({
      nombre: "Sucursal Resumen A",
      calle: "Calle A",
      altura: "1",
      ciudad: "CABA",
      provincia: "Buenos Aires",
    });
    const sucursalB = await Sucursal.create({
      nombre: "Sucursal Resumen B",
      calle: "Calle B",
      altura: "2",
      ciudad: "CABA",
      provincia: "Buenos Aires",
    });
    const base = {
      id_cliente: cliente.id_cliente,
      id_direccion: direccion.id_direccion,
    };

    await Pedido.bulkCreate([
      { ...base, id_sucursal: sucursalA.id_sucursal, estado: "Entregado", importe: 100, fecha_hora: "2026-01-01T10:00:00Z" },
      { ...base, id_sucursal: sucursalA.id_sucursal, estado: "Entregado", importe: 200, fecha_hora: "2026-01-02T10:00:00Z" },
      { ...base, id_sucursal: sucursalB.id_sucursal, estado: "Cancelado", importe: 50, fecha_hora: "2026-01-03T10:00:00Z" },
      { ...base, id_sucursal: sucursalB.id_sucursal, estado: "Pendiente", importe: 80, fecha_hora: "2026-01-04T10:00:00Z" },
    ]);

    const res = await request(app).get("/api/clientes/resumen");

    expect(res.status).toBe(200);
    const resumen = res.body.find((c) => c.id_cliente === cliente.id_cliente);
    expect(resumen).toMatchObject({
      direcciones_count: 1,
      pedidos_count: 4,
      pedidos_entregados: 2,
      pedidos_activos: 1,
      pedidos_cancelados: 1,
      total_gastado: 300,
      ticket_promedio: 150,
      ultimo_estado: "Pendiente",
      sucursal_favorita: "Sucursal Resumen A",
    });
    expect(resumen.created_at).toBeDefined();
    expect(resumen.password).toBeUndefined();
  });

  test("el resumen devuelve ceros para un cliente sin pedidos", async () => {
    const { cliente } = await crearCliente({ nombre: "Sin", apellido: "Pedidos" });

    const res = await request(app).get("/api/clientes/resumen");

    expect(res.status).toBe(200);
    const resumen = res.body.find((c) => c.id_cliente === cliente.id_cliente);
    expect(resumen).toMatchObject({
      direcciones_count: 0,
      pedidos_count: 0,
      pedidos_entregados: 0,
      pedidos_activos: 0,
      pedidos_cancelados: 0,
      total_gastado: 0,
      ticket_promedio: 0,
      sucursal_favorita: null,
      ultimo_estado: null,
    });
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

  test("no permite dejar el DNI vacío al actualizar", async () => {
    const creado = await request(app).post("/api/clientes").send(nuevoCliente());

    const res = await request(app)
      .put(`/api/clientes/${creado.body.id_cliente}`)
      .send({ dni: "" });

    expect(res.status).toBe(400);
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

  test("requiere DNI al crear un cliente", async () => {
    const { dni: _omit, ...sinDni } = nuevoCliente({ email: emailUnico("sin.dni") });
    const res = await request(app).post("/api/clientes").send(sinDni);

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

  test("protege el resumen de clientes para ADMIN", async () => {
    expect((await requestAs(null).get("/api/clientes/resumen")).status).toBe(401);
    expect((await requestAs(tokenCliente).get("/api/clientes/resumen")).status).toBe(403);
    expect((await requestAs(tokenEmpleado).get("/api/clientes/resumen")).status).toBe(403);
  });
});
