const request = require("supertest");
const app = require("../index");
const { Cliente, Direccion, Sucursal, Producto, ProductoSucursal } = require("../models");
const { resetDb, closeDb } = require("./db_utils");

let cliente;
let direccion;
let sucursal;
let producto; // precio 5500.00, stock inicial 10
let otroProducto; // sin fila de stock

const stockDe = (id_producto, id_sucursal) =>
  ProductoSucursal.findOne({ where: { id_producto, id_sucursal } }).then((f) => (f ? f.stock : null));

beforeAll(async () => {
  await resetDb();

  const reg = await request(app).post("/api/auth/register").send({
    nombre: "Juan",
    apellido: "Pérez",
    email: "juan.perez@example.com",
    password: "secreto123",
  });
  cliente = reg.body.user;

  direccion = await Direccion.create({
    calle: "Av. Rivadavia", altura: "1000", ciudad: "CABA", provincia: "Buenos Aires",
    latitud: -34.6083, longitud: -58.3712, id_cliente: cliente.id_cliente,
  });
  sucursal = await Sucursal.create({
    nombre: "Centro", calle: "Av. Rivadavia", altura: "1000",
    ciudad: "CABA", provincia: "Buenos Aires",
    latitud: -34.6083, longitud: -58.3712, estado: "activa",
  });
  producto = await Producto.create({ nombre: "Hamburguesa Clásica", precio: 5500.00 });
  otroProducto = await Producto.create({ nombre: "Papas Fritas", precio: 3200.00 });
  await ProductoSucursal.create({
    id_producto: producto.id_producto, id_sucursal: sucursal.id_sucursal, stock: 10,
  });
});

afterAll(async () => {
  await closeDb();
});

describe("GET /api/stock", () => {
  test("lista productos con su stock en la sucursal", async () => {
    const res = await request(app).get(`/api/stock?sucursal=${sucursal.id_sucursal}`);

    expect(res.status).toBe(200);
    const fila = res.body.find((p) => p.id_producto === producto.id_producto);
    expect(fila).toMatchObject({ nombre: "Hamburguesa Clásica", stock: 10 });
  });

  test("producto sin fila se informa con stock 0", async () => {
    const res = await request(app).get(`/api/stock?sucursal=${sucursal.id_sucursal}`);

    expect(res.status).toBe(200);
    const fila = res.body.find((p) => p.id_producto === otroProducto.id_producto);
    expect(fila.stock).toBe(0);
  });

  test("sucursal inexistente devuelve 404", async () => {
    const res = await request(app).get("/api/stock?sucursal=9999");

    expect(res.status).toBe(404);
  });

  test("sin query devuelve 404", async () => {
    const res = await request(app).get("/api/stock");

    expect(res.status).toBe(404);
  });
});

describe("POST /api/stock (agregar)", () => {
  test("suma a una fila existente y devuelve el nuevo stock", async () => {
    const res = await request(app).post("/api/stock").send({
      id_sucursal: sucursal.id_sucursal, id_producto: producto.id_producto, cantidad: 5,
    });

    expect(res.status).toBe(200);
    expect(res.body.stock).toBe(15);
    expect(await stockDe(producto.id_producto, sucursal.id_sucursal)).toBe(15);
  });

  test("crea la fila si no existe", async () => {
    expect(await stockDe(otroProducto.id_producto, sucursal.id_sucursal)).toBeNull();

    const res = await request(app).post("/api/stock").send({
      id_sucursal: sucursal.id_sucursal, id_producto: otroProducto.id_producto, cantidad: 7,
    });

    expect(res.status).toBe(200);
    expect(res.body.stock).toBe(7);
  });

  test("rechaza cantidad 0 o negativa con 400", async () => {
    const cero = await request(app).post("/api/stock").send({
      id_sucursal: sucursal.id_sucursal, id_producto: producto.id_producto, cantidad: 0,
    });
    const negativa = await request(app).post("/api/stock").send({
      id_sucursal: sucursal.id_sucursal, id_producto: producto.id_producto, cantidad: -3,
    });

    expect(cero.status).toBe(400);
    expect(negativa.status).toBe(400);
  });

  test("rechaza cantidad no entera con 400", async () => {
    const res = await request(app).post("/api/stock").send({
      id_sucursal: sucursal.id_sucursal, id_producto: producto.id_producto, cantidad: 2.5,
    });

    expect(res.status).toBe(400);
  });

  test("rechaza campos faltantes con 400", async () => {
    const res = await request(app).post("/api/stock").send({
      id_sucursal: sucursal.id_sucursal, id_producto: producto.id_producto,
    });

    expect(res.status).toBe(400);
  });

  test("sucursal inexistente devuelve 404", async () => {
    const res = await request(app).post("/api/stock").send({
      id_sucursal: 9999, id_producto: producto.id_producto, cantidad: 1,
    });

    expect(res.status).toBe(404);
  });

  test("producto inexistente devuelve 404", async () => {
    const res = await request(app).post("/api/stock").send({
      id_sucursal: sucursal.id_sucursal, id_producto: 9999, cantidad: 1,
    });

    expect(res.status).toBe(404);
  });
});

describe("Descuento de stock al crear pedidos", () => {
  const crearPedido = (detalles, extras = {}) =>
    request(app).post("/api/pedidos").send({
      id_cliente: cliente.id_cliente,
      id_direccion: direccion.id_direccion,
      id_sucursal: sucursal.id_sucursal,
      detalles,
      ...extras,
    });

  test("descuenta la suma agregada cuando hay varias líneas del mismo producto", async () => {
    const antes = await stockDe(producto.id_producto, sucursal.id_sucursal);

    const res = await crearPedido([
      { id_producto: producto.id_producto, cantidad: 2 },
      { id_producto: producto.id_producto, cantidad: 3, observaciones: "doble" },
    ]);

    expect(res.status).toBe(201);
    expect(await stockDe(producto.id_producto, sucursal.id_sucursal)).toBe(antes - 5);
  });

  test("pedido rechazado por falta de stock no modifica el stock", async () => {
    const antes = await stockDe(producto.id_producto, sucursal.id_sucursal);

    const res = await crearPedido([{ id_producto: producto.id_producto, cantidad: antes + 100 }]);

    expect(res.status).toBe(409);
    expect(await stockDe(producto.id_producto, sucursal.id_sucursal)).toBe(antes);
  });
});
