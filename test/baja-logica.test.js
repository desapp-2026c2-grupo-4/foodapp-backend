const { request, app } = require("./helpers/request");
const {
  Cliente,
  Direccion,
  Sucursal,
  Producto,
  Opcional,
  Categoria,
  Empleado,
  MateriaPrima,
  ProductoMateriaPrima,
  MateriaPrimaSucursal,
} = require("../models");
const { resetDb, closeDb } = require("./db_utils");

beforeAll(async () => {
  await resetDb();
});

afterAll(async () => {
  await closeDb();
});

describe("Baja lógica de categorías (/api/categorias)", () => {
  let id;

  test("se oculta del listado pero la fila sigue en la base", async () => {
    const creada = await request(app).post("/api/categorias").send({ nombre: "Bebidas" });
    expect(creada.status).toBe(201);
    id = creada.body.id_categoria;

    const lista = await request(app).get("/api/categorias");
    expect(lista.body.some((c) => c.id_categoria === id)).toBe(true);

    const baja = await request(app).delete(`/api/categorias/${id}`);
    expect(baja.status).toBe(200);

    const listaTras = await request(app).get("/api/categorias");
    expect(listaTras.body.some((c) => c.id_categoria === id)).toBe(false);

    const detalle = await request(app).get(`/api/categorias/${id}`);
    expect(detalle.status).toBe(404);

    const enDb = await Categoria.findByPk(id, { paranoid: false });
    expect(enDb).not.toBeNull();
    expect(enDb.deletedAt).not.toBeNull();
  });

  test("reutiliza el nombre si se vuelve a crear la categoría", async () => {
    const recreada = await request(app).post("/api/categorias").send({ nombre: "Bebidas" });
    expect(recreada.status).toBe(201);
    expect(recreada.body.id_categoria).toBe(id);

    const lista = await request(app).get("/api/categorias");
    expect(lista.body.some((c) => c.nombre === "Bebidas")).toBe(true);
  });
});

describe("Baja lógica de productos (/api/productos)", () => {
  let id;

  test("se oculta del catálogo pero permanece en la base", async () => {
    const creado = await request(app).post("/api/productos").send({ nombre: "Pancho", precio: 1500 });
    expect(creado.status).toBe(201);
    id = creado.body.id_producto;

    const antes = await request(app).get("/api/productos");
    expect(antes.body.some((p) => p.id_producto === id)).toBe(true);

    const baja = await request(app).delete(`/api/productos/${id}`);
    expect(baja.status).toBe(200);

    const despues = await request(app).get("/api/productos");
    expect(despues.body.some((p) => p.id_producto === id)).toBe(false);
    expect((await request(app).get(`/api/productos/${id}`)).status).toBe(404);

    const enDb = await Producto.findByPk(id, { paranoid: false });
    expect(enDb).not.toBeNull();
    expect(enDb.deletedAt).not.toBeNull();
  });
});

describe("El historial conserva las referencias dadas de baja", () => {
  let cliente;
  let direccion;
  let sucursal;
  let producto;
  let opcional;
  let idPedido;

  beforeAll(async () => {
    const reg = await request(app).post("/api/auth/register").send({
      nombre: "Ana",
      apellido: "Gómez",
      email: "ana@example.com",
      password: "secreto123",
    });
    cliente = reg.body.user;

    direccion = await Direccion.create({
      calle: "Av. Rivadavia", altura: "1000", ciudad: "CABA", provincia: "Buenos Aires",
      latitud: -34.6083, longitud: -58.3712, id_cliente: cliente.id_cliente,
    });
    sucursal = await Sucursal.create({
      nombre: "Centro", estado: "activa", calle: "Av. Rivadavia", altura: "1000",
      ciudad: "CABA", provincia: "Buenos Aires", latitud: -34.6083, longitud: -58.3712,
    });
    producto = await Producto.create({ nombre: "Milanesa", precio: 4000 });
    opcional = await Opcional.create({ nombre: "Extra queso", precio: 300, id_producto: producto.id_producto });
    const materia = await MateriaPrima.create({ nombre: "Carne" });
    await ProductoMateriaPrima.create({
      id_producto: producto.id_producto, id_materia_prima: materia.id_materia_prima, cantidad: 1,
    });
    await MateriaPrimaSucursal.create({
      id_materia_prima: materia.id_materia_prima, id_sucursal: sucursal.id_sucursal, stock: 10,
    });

    const pedido = await request(app).post("/api/pedidos").send({
      id_cliente: cliente.id_cliente,
      id_direccion: direccion.id_direccion,
      id_sucursal: sucursal.id_sucursal,
      detalles: [{ id_producto: producto.id_producto, cantidad: 1, opcionales: [opcional.id_opcional] }],
    });
    expect(pedido.status).toBe(201);
    idPedido = pedido.body.id_pedido;

    // Se dan de baja las referencias usadas por el pedido
    await request(app).delete(`/api/opcionales/${opcional.id_opcional}`);
    await request(app).delete(`/api/productos/${producto.id_producto}`);
    await request(app).delete(`/api/clientes/${cliente.id_cliente}/direcciones/${direccion.id_direccion}`);
  });

  test("el pedido sigue mostrando producto, opcional y dirección", async () => {
    const res = await request(app).get(`/api/pedidos/${idPedido}`);
    expect(res.status).toBe(200);
    expect(res.body.detalles[0].producto.nombre).toBe("Milanesa");
    expect(res.body.detalles[0].opciones[0].opcional.nombre).toBe("Extra queso");
    expect(res.body.direccion.calle).toBe("Av. Rivadavia");
  });

  test("pero ya no aparecen en los listados", async () => {
    const productos = await request(app).get("/api/productos");
    expect(productos.body.some((p) => p.id_producto === producto.id_producto)).toBe(false);

    const perfil = await request(app).get(`/api/clientes/${cliente.id_cliente}`);
    expect(perfil.body.direcciones.some((d) => d.id_direccion === direccion.id_direccion)).toBe(false);
  });
});

describe("Baja lógica de empleados (/api/empleados)", () => {
  let id;

  test("no puede loguearse, se oculta y libera el email", async () => {
    const creado = await request(app).post("/api/empleados").send({
      nombre: "Emilio", apellido: "Pérez", rol: "ADMIN", email: "emilio@example.com", password: "secreto123",
    });
    expect(creado.status).toBe(201);
    id = creado.body.id_empleado;

    const loginOk = await request(app).post("/api/auth/login")
      .send({ email: "emilio@example.com", password: "secreto123" });
    expect(loginOk.status).toBe(200);

    const baja = await request(app).delete(`/api/empleados/${id}`);
    expect(baja.status).toBe(200);

    const lista = await request(app).get("/api/empleados");
    expect(lista.body.some((e) => e.id_empleado === id)).toBe(false);

    const loginBaja = await request(app).post("/api/auth/login")
      .send({ email: "emilio@example.com", password: "secreto123" });
    expect(loginBaja.status).toBe(401);

    const enDb = await Empleado.findByPk(id, { paranoid: false });
    expect(enDb).not.toBeNull();
    expect(enDb.deletedAt).not.toBeNull();

    // El email quedó libre para un nuevo empleado
    const nuevo = await request(app).post("/api/empleados").send({
      nombre: "Ema", apellido: "López", rol: "EMPLEADO", email: "emilio@example.com", password: "secreto123",
    });
    expect(nuevo.status).toBe(201);
  });
});
