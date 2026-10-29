const { request, requestAs } = require("./helpers/request");
const { resetDb, closeDb } = require("./db_utils");
const { getAdminToken } = require("./helpers/auth");
const {
  Cliente,
  Empleado,
  Sucursal,
  Direccion,
  MateriaPrima,
  Producto,
  ProductoMateriaPrima,
  MateriaPrimaSucursal,
  Pedido,
  Categoria,
} = require("../models");
const { firmarToken } = require("../utils/jwt");

let sucA;
let sucB;
let clienteA;
let clienteB;
let empleadoA;
let empleadoB;
let empleadoSinSucursal;
let tokenClienteA;
let tokenClienteB;
let tokenEmpleadoA;
let tokenEmpleadoB;
let tokenEmpleadoSinSucursal;
let tokenAdmin;
let producto;
let materia;
let pedidoA;
let pedidoB;
let direccionA;
let direccionB;

const tokenDeCliente = (c) => firmarToken({ id_cliente: c.id_cliente, rol: "CLIENTE" });
const tokenDeEmpleado = (e) => firmarToken({ id_empleado: e.id_empleado, rol: e.rol });

beforeAll(async () => {
  await resetDb();

  sucA = await Sucursal.create({
    nombre: "Sucursal A", estado: "activa", calle: "Calle A", altura: "1",
    ciudad: "CABA", provincia: "Buenos Aires", latitud: -34.60, longitud: -58.38,
  });
  sucB = await Sucursal.create({
    nombre: "Sucursal B", estado: "activa", calle: "Calle B", altura: "2",
    ciudad: "CABA", provincia: "Buenos Aires", latitud: -34.61, longitud: -58.39,
  });

  clienteA = await Cliente.create({
    nombre: "Cliente", apellido: "A", email: "cliente.a@example.com", password: "x",
  });
  clienteB = await Cliente.create({
    nombre: "Cliente", apellido: "B", email: "cliente.b@example.com", password: "x",
  });
  empleadoA = await Empleado.create({
    nombre: "Empleado", apellido: "A", rol: "EMPLEADO", email: "empleado.a@example.com",
    password: "x", id_sucursal: sucA.id_sucursal,
  });
  empleadoB = await Empleado.create({
    nombre: "Empleado", apellido: "B", rol: "EMPLEADO", email: "empleado.b@example.com",
    password: "x", id_sucursal: sucB.id_sucursal,
  });
  empleadoSinSucursal = await Empleado.create({
    nombre: "Empleado", apellido: "Sin Sucursal", rol: "EMPLEADO",
    email: "empleado.sin.sucursal@example.com", password: "x", id_sucursal: null,
  });

  tokenClienteA = tokenDeCliente(clienteA);
  tokenClienteB = tokenDeCliente(clienteB);
  tokenEmpleadoA = tokenDeEmpleado(empleadoA);
  tokenEmpleadoB = tokenDeEmpleado(empleadoB);
  tokenEmpleadoSinSucursal = tokenDeEmpleado(empleadoSinSucursal);
  tokenAdmin = getAdminToken();

  direccionA = await Direccion.create({
    calle: "Calle A", altura: "1", ciudad: "CABA", provincia: "Buenos Aires",
    latitud: -34.60, longitud: -58.38, id_cliente: clienteA.id_cliente,
  });
  direccionB = await Direccion.create({
    calle: "Calle B", altura: "2", ciudad: "CABA", provincia: "Buenos Aires",
    latitud: -34.61, longitud: -58.39, id_cliente: clienteB.id_cliente,
  });

  materia = await MateriaPrima.create({ nombre: "Insumo" });
  producto = await Producto.create({ nombre: "Producto", precio: 1000 });
  await ProductoMateriaPrima.create({
    id_producto: producto.id_producto,
    id_materia_prima: materia.id_materia_prima,
    cantidad: 1,
  });
  await MateriaPrimaSucursal.bulkCreate([
    { id_materia_prima: materia.id_materia_prima, id_sucursal: sucA.id_sucursal, stock: 10 },
    { id_materia_prima: materia.id_materia_prima, id_sucursal: sucB.id_sucursal, stock: 20 },
  ]);

  pedidoA = await Pedido.create({
    id_cliente: clienteA.id_cliente, id_direccion: direccionA.id_direccion,
    id_sucursal: sucA.id_sucursal, estado: "Pendiente", importe: 1000,
  });
  pedidoB = await Pedido.create({
    id_cliente: clienteB.id_cliente, id_direccion: direccionB.id_direccion,
    id_sucursal: sucB.id_sucursal, estado: "Pendiente", importe: 1000,
  });
});

afterAll(async () => {
  await closeDb();
});

describe("Catálogo público y stock privado", () => {
  test("productos, categorías, promociones y banners son públicos", async () => {
    for (const url of ["/api/productos", "/api/categorias", "/api/promociones", "/api/banners"]) {
      const res = await requestAs(null).get(url);
      expect(res.status).toBe(200);
    }
  });

  test("las sucursales son públicas pero no exponen stock ni materias primas", async () => {
    const lista = await requestAs(null).get("/api/sucursales");
    expect(lista.status).toBe(200);
    expect(lista.body.length).toBeGreaterThan(0);
    for (const s of lista.body) {
      expect(s.materiasPrimas).toBeUndefined();
      expect(s.stock).toBeUndefined();
    }

    const detalle = await requestAs(null).get(`/api/sucursales/${sucA.id_sucursal}`);
    expect(detalle.status).toBe(200);
    expect(detalle.body.materiasPrimas).toBeUndefined();
  });

  test("el stock exige token y rol staff", async () => {
    const sinToken = await requestAs(null).get(`/api/stock?sucursal=${sucA.id_sucursal}`);
    expect(sinToken.status).toBe(401);

    const cliente = await requestAs(tokenClienteA).get(`/api/stock?sucursal=${sucA.id_sucursal}`);
    expect(cliente.status).toBe(403);

    const empleado = await requestAs(tokenEmpleadoA).get(`/api/stock?sucursal=${sucA.id_sucursal}`);
    expect(empleado.status).toBe(200);
  });

  test("el stock derivado en productos no es público", async () => {
    const sinToken = await requestAs(null).get(`/api/productos?sucursal=${sucA.id_sucursal}`);
    expect(sinToken.status).toBe(401);

    const cliente = await requestAs(tokenClienteA).get(`/api/productos?sucursal=${sucA.id_sucursal}`);
    expect(cliente.status).toBe(403);

    const stockProducto = await requestAs(tokenClienteA).get(
      `/api/productos/${producto.id_producto}/stock?sucursal=${sucA.id_sucursal}`
    );
    expect(stockProducto.status).toBe(403);
  });

  test("el empleado consulta stock derivado solo de su sucursal", async () => {
    const propio = await requestAs(tokenEmpleadoA).get(
      `/api/productos/${producto.id_producto}/stock?sucursal=${sucA.id_sucursal}`
    );
    expect(propio.status).toBe(200);
    expect(propio.body.stock).toBe(10);

    const ajeno = await requestAs(tokenEmpleadoA).get(
      `/api/productos/${producto.id_producto}/stock?sucursal=${sucB.id_sucursal}`
    );
    expect(ajeno.status).toBe(403);

    const listaPropia = await requestAs(tokenEmpleadoA).get(`/api/productos?sucursal=${sucA.id_sucursal}`);
    expect(listaPropia.status).toBe(200);
    expect(listaPropia.body.find((p) => p.id_producto === producto.id_producto).stock).toBe(10);
  });
});

describe("Alcance por sucursal del empleado", () => {
  test("solo ve pedidos de su sucursal", async () => {
    const res = await requestAs(tokenEmpleadoA).get("/api/pedidos");
    expect(res.status).toBe(200);
    expect(res.body.some((p) => p.id_pedido === pedidoA.id_pedido)).toBe(true);
    expect(res.body.some((p) => p.id_pedido === pedidoB.id_pedido)).toBe(false);
  });

  test("no puede consultar ni modificar pedidos de otra sucursal", async () => {
    const get = await requestAs(tokenEmpleadoA).get(`/api/pedidos/${pedidoB.id_pedido}`);
    expect(get.status).toBe(403);

    const put = await requestAs(tokenEmpleadoA)
      .put(`/api/pedidos/${pedidoB.id_pedido}`)
      .send({ estado: "Confirmado" });
    expect(put.status).toBe(403);
  });

  test("puede modificar pedidos de su sucursal", async () => {
    const res = await requestAs(tokenEmpleadoA)
      .put(`/api/pedidos/${pedidoA.id_pedido}`)
      .send({ estado: "Confirmado" });
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe("Confirmado");
  });

  test("no puede operar stock de otra sucursal, pero sí de la propia", async () => {
    const get = await requestAs(tokenEmpleadoA).get(`/api/stock?sucursal=${sucB.id_sucursal}`);
    expect(get.status).toBe(403);

    const postAjeno = await requestAs(tokenEmpleadoA).post("/api/stock").send({
      id_sucursal: sucB.id_sucursal,
      id_materia_prima: materia.id_materia_prima,
      cantidad: 1,
    });
    expect(postAjeno.status).toBe(403);

    const postPropio = await requestAs(tokenEmpleadoA).post("/api/stock").send({
      id_sucursal: sucA.id_sucursal,
      id_materia_prima: materia.id_materia_prima,
      cantidad: 1,
    });
    expect(postPropio.status).toBe(200);
    expect(postPropio.body.stock).toBe(11);
  });

  test("no puede consultar reportes de otra sucursal", async () => {
    const propio = await requestAs(tokenEmpleadoA).get("/api/reportes/productos");
    expect(propio.status).toBe(200);

    const ajeno = await requestAs(tokenEmpleadoA).get(
      `/api/reportes/productos?id_sucursal=${sucB.id_sucursal}`
    );
    expect(ajeno.status).toBe(403);
  });

  test("sin sucursal asignada no puede operar stock ni pedidos", async () => {
    const stock = await requestAs(tokenEmpleadoSinSucursal).get(
      `/api/stock?sucursal=${sucA.id_sucursal}`
    );
    expect(stock.status).toBe(403);

    const pedidos = await requestAs(tokenEmpleadoSinSucursal).get("/api/pedidos");
    expect(pedidos.status).toBe(403);
  });
});

describe("Ownership de clientes y pedidos", () => {
  test("un cliente solo ve sus pedidos", async () => {
    const res = await requestAs(tokenClienteA).get("/api/pedidos");
    expect(res.status).toBe(200);
    expect(res.body.every((p) => p.id_cliente === clienteA.id_cliente)).toBe(true);
  });

  test("no puede ver ni modificar pedidos ajenos", async () => {
    expect((await requestAs(tokenClienteA).get(`/api/pedidos/${pedidoB.id_pedido}`)).status).toBe(403);
    expect((await requestAs(tokenClienteA).get(`/api/pedidos/${pedidoB.id_pedido}/detalles`)).status).toBe(403);
  });

  test("puede crear un pedido propio pero no para otro cliente", async () => {
    const propio = await requestAs(tokenClienteA).post("/api/pedidos").send({
      id_cliente: clienteA.id_cliente,
      id_direccion: direccionA.id_direccion,
      id_sucursal: sucA.id_sucursal,
      detalles: [{ id_producto: producto.id_producto, cantidad: 1 }],
    });
    expect(propio.status).toBe(201);
    expect(propio.body.id_cliente).toBe(clienteA.id_cliente);

    const estadoForzado = await requestAs(tokenClienteA).post("/api/pedidos").send({
      id_cliente: clienteA.id_cliente,
      id_direccion: direccionA.id_direccion,
      id_sucursal: sucA.id_sucursal,
      estado: "Entregado",
      detalles: [{ id_producto: producto.id_producto, cantidad: 1 }],
    });
    expect(estadoForzado.status).toBe(400);

    const ajeno = await requestAs(tokenClienteA).post("/api/pedidos").send({
      id_cliente: clienteB.id_cliente,
      id_direccion: direccionB.id_direccion,
      id_sucursal: sucB.id_sucursal,
      detalles: [{ id_producto: producto.id_producto, cantidad: 1 }],
    });
    expect(ajeno.status).toBe(403);
  });

  test("no puede acceder al perfil ni direcciones de otro cliente", async () => {
    expect((await requestAs(tokenClienteA).get(`/api/clientes/${clienteB.id_cliente}`)).status).toBe(403);
    expect((await requestAs(tokenClienteA).get(`/api/clientes/${clienteB.id_cliente}/direcciones`)).status).toBe(403);

    expect((await requestAs(tokenClienteA).get(`/api/clientes/${clienteA.id_cliente}`)).status).toBe(200);
    expect((await requestAs(tokenClienteA).get(`/api/clientes/${clienteA.id_cliente}/direcciones`)).status).toBe(200);
  });
});

describe("Rutas administrativas", () => {
  test("cliente y empleado no pueden crear categorías", async () => {
    expect((await requestAs(tokenClienteA).post("/api/categorias").send({ nombre: "X" })).status).toBe(403);
    expect((await requestAs(tokenEmpleadoA).post("/api/categorias").send({ nombre: "Y" })).status).toBe(403);

    const admin = await requestAs(tokenAdmin).post("/api/categorias").send({ nombre: "Admin" });
    expect(admin.status).toBe(201);
    expect(await Categoria.count()).toBeGreaterThan(0);
  });

  test("empleado no crea ni elimina pedidos", async () => {
    const crear = await requestAs(tokenEmpleadoA).post("/api/pedidos").send({
      id_cliente: clienteA.id_cliente,
      id_direccion: direccionA.id_direccion,
      id_sucursal: sucA.id_sucursal,
      detalles: [{ id_producto: producto.id_producto, cantidad: 1 }],
    });
    expect(crear.status).toBe(403);

    const borrar = await requestAs(tokenEmpleadoA).delete(`/api/pedidos/${pedidoA.id_pedido}`);
    expect(borrar.status).toBe(403);
  });

  test("admin puede consultar stock de cualquier sucursal", async () => {
    const res = await requestAs(tokenAdmin).get(`/api/stock?sucursal=${sucB.id_sucursal}`);
    expect(res.status).toBe(200);
  });

  test("sin token no se accede a pedidos, reportes ni clientes", async () => {
    expect((await requestAs(null).get("/api/pedidos")).status).toBe(401);
    expect((await requestAs(null).get("/api/reportes/productos")).status).toBe(401);
    expect((await requestAs(null).get("/api/clientes")).status).toBe(401);
  });
});
