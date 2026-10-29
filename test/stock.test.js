const { request, app } = require("./helpers/request");
const {
  Cliente,
  Direccion,
  Sucursal,
  Producto,
  MateriaPrima,
  ProductoMateriaPrima,
  MateriaPrimaSucursal,
} = require("../models");
const { resetDb, closeDb } = require("./db_utils");

let cliente;
let direccion;
let sucursal;
let pan;
let carne;
let gaseosa; // sin fila de stock
let hamburguesa; // receta: pan x1, carne x2 -> stock derivado 5
let papas; // sin receta -> no disponible

const stockDe = (id_materia_prima, id_sucursal) =>
  MateriaPrimaSucursal.findOne({ where: { id_materia_prima, id_sucursal } }).then((f) => (f ? f.stock : null));

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

  pan = await MateriaPrima.create({ nombre: "Pan" });
  carne = await MateriaPrima.create({ nombre: "Carne" });
  gaseosa = await MateriaPrima.create({ nombre: "Gaseosa" });

  hamburguesa = await Producto.create({ nombre: "Hamburguesa Clásica", precio: 5500.00 });
  papas = await Producto.create({ nombre: "Papas Fritas", precio: 3200.00 });
  await ProductoMateriaPrima.bulkCreate([
    { id_producto: hamburguesa.id_producto, id_materia_prima: pan.id_materia_prima, cantidad: 1 },
    { id_producto: hamburguesa.id_producto, id_materia_prima: carne.id_materia_prima, cantidad: 2 },
  ]);
  await MateriaPrimaSucursal.bulkCreate([
    { id_materia_prima: pan.id_materia_prima, id_sucursal: sucursal.id_sucursal, stock: 10 },
    { id_materia_prima: carne.id_materia_prima, id_sucursal: sucursal.id_sucursal, stock: 10 },
  ]);
});

afterAll(async () => {
  await closeDb();
});

describe("GET /api/stock", () => {
  test("lista materias primas con su stock en la sucursal", async () => {
    const res = await request(app).get(`/api/stock?sucursal=${sucursal.id_sucursal}`);

    expect(res.status).toBe(200);
    const filaPan = res.body.find((m) => m.id_materia_prima === pan.id_materia_prima);
    expect(filaPan).toMatchObject({ nombre: "Pan", stock: 10 });
  });

  test("materia prima sin fila se informa con stock 0", async () => {
    const res = await request(app).get(`/api/stock?sucursal=${sucursal.id_sucursal}`);

    expect(res.status).toBe(200);
    const fila = res.body.find((m) => m.id_materia_prima === gaseosa.id_materia_prima);
    expect(fila.stock).toBe(0);
  });

  test("incluye stock_minimo y marca bajo_stock", async () => {
    await pan.update({ stock_minimo: 20 });

    const res = await request(app).get(`/api/stock?sucursal=${sucursal.id_sucursal}`);
    const filaPan = res.body.find((m) => m.id_materia_prima === pan.id_materia_prima);
    const filaCarne = res.body.find((m) => m.id_materia_prima === carne.id_materia_prima);

    expect(filaPan).toMatchObject({ stock: 10, stock_minimo: 20, bajo_stock: true });
    expect(filaCarne).toMatchObject({ stock: 10, stock_minimo: 0, bajo_stock: false });

    await pan.update({ stock_minimo: 0 });
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

describe("GET /api/productos/:id/stock (derivado de la receta)", () => {
  test("calcula min(stock_materia / cantidad_receta)", async () => {
    const res = await request(app)
      .get(`/api/productos/${hamburguesa.id_producto}/stock?sucursal=${sucursal.id_sucursal}`);

    expect(res.status).toBe(200);
    // pan: 10/1 = 10, carne: 10/2 = 5 -> 5
    expect(res.body.stock).toBe(5);
  });

  test("producto sin receta devuelve stock 0", async () => {
    const res = await request(app)
      .get(`/api/productos/${papas.id_producto}/stock?sucursal=${sucursal.id_sucursal}`);

    expect(res.status).toBe(200);
    expect(res.body.stock).toBe(0);
  });

  test("sin query sucursal devuelve 400", async () => {
    const res = await request(app).get(`/api/productos/${hamburguesa.id_producto}/stock`);

    expect(res.status).toBe(400);
  });

  test("producto inexistente devuelve 404", async () => {
    const res = await request(app).get(`/api/productos/9999/stock?sucursal=${sucursal.id_sucursal}`);

    expect(res.status).toBe(404);
  });

  test("GET /api/productos?sucursal= incluye stock derivado por producto", async () => {
    const res = await request(app).get(`/api/productos?sucursal=${sucursal.id_sucursal}`);

    expect(res.status).toBe(200);
    const hamb = res.body.find((p) => p.id_producto === hamburguesa.id_producto);
    const pap = res.body.find((p) => p.id_producto === papas.id_producto);
    expect(hamb.stock).toBe(5);
    expect(pap.stock).toBe(0);
  });

  test("sucursal inexistente en ?sucursal devuelve 404", async () => {
    const res = await request(app).get("/api/productos?sucursal=9999");

    expect(res.status).toBe(404);
  });
});

describe("POST /api/stock (agregar)", () => {
  test("suma a una fila existente y devuelve el nuevo stock", async () => {
    const res = await request(app).post("/api/stock").send({
      id_sucursal: sucursal.id_sucursal, id_materia_prima: pan.id_materia_prima, cantidad: 5,
    });

    expect(res.status).toBe(200);
    expect(res.body.stock).toBe(15);
    expect(await stockDe(pan.id_materia_prima, sucursal.id_sucursal)).toBe(15);
  });

  test("crea la fila si no existe", async () => {
    expect(await stockDe(gaseosa.id_materia_prima, sucursal.id_sucursal)).toBeNull();

    const res = await request(app).post("/api/stock").send({
      id_sucursal: sucursal.id_sucursal, id_materia_prima: gaseosa.id_materia_prima, cantidad: 7,
    });

    expect(res.status).toBe(200);
    expect(res.body.stock).toBe(7);
  });

  test("rechaza cantidad 0 o negativa con 400", async () => {
    const cero = await request(app).post("/api/stock").send({
      id_sucursal: sucursal.id_sucursal, id_materia_prima: pan.id_materia_prima, cantidad: 0,
    });
    const negativa = await request(app).post("/api/stock").send({
      id_sucursal: sucursal.id_sucursal, id_materia_prima: pan.id_materia_prima, cantidad: -3,
    });

    expect(cero.status).toBe(400);
    expect(negativa.status).toBe(400);
  });

  test("rechaza cantidad no entera con 400", async () => {
    const res = await request(app).post("/api/stock").send({
      id_sucursal: sucursal.id_sucursal, id_materia_prima: pan.id_materia_prima, cantidad: 2.5,
    });

    expect(res.status).toBe(400);
  });

  test("rechaza campos faltantes con 400", async () => {
    const res = await request(app).post("/api/stock").send({
      id_sucursal: sucursal.id_sucursal, id_materia_prima: pan.id_materia_prima,
    });

    expect(res.status).toBe(400);
  });

  test("sucursal inexistente devuelve 404", async () => {
    const res = await request(app).post("/api/stock").send({
      id_sucursal: 9999, id_materia_prima: pan.id_materia_prima, cantidad: 1,
    });

    expect(res.status).toBe(404);
  });

  test("materia prima inexistente devuelve 404", async () => {
    const res = await request(app).post("/api/stock").send({
      id_sucursal: sucursal.id_sucursal, id_materia_prima: 9999, cantidad: 1,
    });

    expect(res.status).toBe(404);
  });
});

describe("Descuento de stock al crear pedidos (vía receta)", () => {
  const crearPedido = (detalles, extras = {}) =>
    request(app).post("/api/pedidos").send({
      id_cliente: cliente.id_cliente,
      id_direccion: direccion.id_direccion,
      id_sucursal: sucursal.id_sucursal,
      detalles,
      ...extras,
    });

  test("descuenta la receta completa al pedir un producto", async () => {
    const antesPan = await stockDe(pan.id_materia_prima, sucursal.id_sucursal);
    const antesCarne = await stockDe(carne.id_materia_prima, sucursal.id_sucursal);

    const res = await crearPedido([{ id_producto: hamburguesa.id_producto, cantidad: 2 }]);

    expect(res.status).toBe(201);
    // pan: 2 x1, carne: 2 x2
    expect(await stockDe(pan.id_materia_prima, sucursal.id_sucursal)).toBe(antesPan - 2);
    expect(await stockDe(carne.id_materia_prima, sucursal.id_sucursal)).toBe(antesCarne - 4);
  });

  test("descuenta la suma agregada cuando hay varias líneas del mismo producto", async () => {
    const antesCarne = await stockDe(carne.id_materia_prima, sucursal.id_sucursal);

    const res = await crearPedido([
      { id_producto: hamburguesa.id_producto, cantidad: 1 },
      { id_producto: hamburguesa.id_producto, cantidad: 1, observaciones: "doble" },
    ]);

    expect(res.status).toBe(201);
    // 2 unidades x2 carne = 4
    expect(await stockDe(carne.id_materia_prima, sucursal.id_sucursal)).toBe(antesCarne - 4);
  });

  test("pedido rechazado por falta de stock no modifica el stock", async () => {
    const antesPan = await stockDe(pan.id_materia_prima, sucursal.id_sucursal);

    const res = await crearPedido([{ id_producto: hamburguesa.id_producto, cantidad: 9999 }]);

    expect(res.status).toBe(409);
    expect(await stockDe(pan.id_materia_prima, sucursal.id_sucursal)).toBe(antesPan);
  });

  test("producto sin receta no puede pedirse (409)", async () => {
    const res = await crearPedido([{ id_producto: papas.id_producto, cantidad: 1 }]);

    expect(res.status).toBe(409);
  });
});
