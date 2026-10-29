const { request, app } = require("./helpers/request");
const { Cliente, Direccion, Sucursal, Producto, Opcional, MateriaPrima, ProductoMateriaPrima, MateriaPrimaSucursal, Pedido, SucursalHorario } = require("../models");
const { diaYMinutoLocal } = require("../utils/schedule");
const { resetDb, closeDb } = require("./db_utils");

// Direcciones de CABA con coordenadas reales (para auto-asignación por cercanía)
const DIR_CENTRO = { calle: "Av. Rivadavia", altura: "1000", ciudad: "CABA", provincia: "Buenos Aires", latitud: -34.6083, longitud: -58.3712 };
const SUC_CERCA = { nombre: "Centro", calle: "Av. Rivadavia", altura: "1000", ciudad: "CABA", provincia: "Buenos Aires", latitud: -34.6083, longitud: -58.3712 };
const SUC_LEJOS = { nombre: "La Plata", calle: "Calle 7", altura: "500", ciudad: "La Plata", provincia: "Buenos Aires", latitud: -34.9214, longitud: -57.9545 };

let cliente;
let direccion;
let sucCerca;
let sucLejos;
let producto; // precio 5500.00
let opcional; // precio 500.00
let materia; // receta: 1 por unidad de producto

beforeAll(async () => {
  await resetDb();

  const reg = await request(app).post("/api/auth/register").send({
    nombre: "Juan",
    apellido: "Pérez",
    email: "juan.perez@example.com",
    password: "secreto123",
  });
  cliente = reg.body.user;

  direccion = await Direccion.create({ ...DIR_CENTRO, id_cliente: cliente.id_cliente });
  sucCerca = await Sucursal.create({ ...SUC_CERCA, estado: "activa" });
  sucLejos = await Sucursal.create({ ...SUC_LEJOS, estado: "activa" });
  producto = await Producto.create({ nombre: "Hamburguesa Clásica", precio: 5500.00 });
  opcional = await Opcional.create({ nombre: "Extra queso", precio: 500.00, id_producto: producto.id_producto });
  materia = await MateriaPrima.create({ nombre: "Carne" });
  await ProductoMateriaPrima.create({
    id_producto: producto.id_producto, id_materia_prima: materia.id_materia_prima, cantidad: 1,
  });
  await MateriaPrimaSucursal.bulkCreate([
    { id_materia_prima: materia.id_materia_prima, id_sucursal: sucCerca.id_sucursal, stock: 50 },
    { id_materia_prima: materia.id_materia_prima, id_sucursal: sucLejos.id_sucursal, stock: 50 },
  ]);
});

afterAll(async () => {
  await closeDb();
});

const basePedido = (extras = {}) => ({
  id_cliente: cliente.id_cliente,
  id_direccion: direccion.id_direccion,
  detalles: [{ id_producto: producto.id_producto, cantidad: 1 }],
  ...extras,
});

const crearPedido = (extras = {}) =>
  request(app).post("/api/pedidos").send(basePedido(extras));

describe("POST /api/pedidos (creación)", () => {
  test("crea pedido con sucursal explícita: 201, Pendiente, importe e historial", async () => {
    const res = await crearPedido({ id_sucursal: sucCerca.id_sucursal });

    expect(res.status).toBe(201);
    expect(res.body.id_sucursal).toBe(sucCerca.id_sucursal);
    expect(res.body.estado).toBe("Pendiente");
    expect(parseFloat(res.body.importe)).toBe(5500.00);
    expect(res.body.detalles).toHaveLength(1);
    expect(parseFloat(res.body.detalles[0].precio)).toBe(5500.00);
    expect(res.body.historial.map((h) => h.estado)).toEqual(["Pendiente"]);
  });

  test("sin id_sucursal asigna la más cercana con stock (no la lejana)", async () => {
    const res = await crearPedido();

    expect(res.status).toBe(201);
    expect(res.body.id_sucursal).toBe(sucCerca.id_sucursal);
  });

  test("rechaza sucursal explícita fuera del radio de cobertura", async () => {
    const antes = await Pedido.count();
    const res = await crearPedido({ id_sucursal: sucLejos.id_sucursal });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/radio de cobertura/);
    expect(await Pedido.count()).toBe(antes);
  });

  test("no autoasigna una sucursal fuera del radio aunque tenga stock", async () => {
    const materiaRadio = await MateriaPrima.create({ nombre: "Insumo fuera de radio" });
    const productoRadio = await Producto.create({ nombre: "Producto fuera de radio", precio: 1000 });
    await ProductoMateriaPrima.create({
      id_producto: productoRadio.id_producto,
      id_materia_prima: materiaRadio.id_materia_prima,
      cantidad: 1,
    });
    await MateriaPrimaSucursal.create({
      id_materia_prima: materiaRadio.id_materia_prima,
      id_sucursal: sucLejos.id_sucursal,
      stock: 10,
    });

    const antes = await Pedido.count();
    const res = await crearPedido({
      detalles: [{ id_producto: productoRadio.id_producto, cantidad: 1 }],
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/radio de cobertura/);
    expect(await Pedido.count()).toBe(antes);
  });

  test("autoasigna otra sucursal dentro del radio si la más cercana no tiene stock", async () => {
    const sucMedia = await Sucursal.create({
      nombre: "Sucursal a 1 km",
      calle: "Av. Rivadavia",
      altura: "2000",
      ciudad: "CABA",
      provincia: "Buenos Aires",
      latitud: -34.6183,
      longitud: -58.3712,
      estado: "activa",
      radio_km: 2,
    });
    const materiaRadio = await MateriaPrima.create({ nombre: "Insumo dentro de radio" });
    const productoRadio = await Producto.create({ nombre: "Producto dentro de radio", precio: 1000 });
    await ProductoMateriaPrima.create({
      id_producto: productoRadio.id_producto,
      id_materia_prima: materiaRadio.id_materia_prima,
      cantidad: 1,
    });
    await MateriaPrimaSucursal.create({
      id_materia_prima: materiaRadio.id_materia_prima,
      id_sucursal: sucMedia.id_sucursal,
      stock: 10,
    });

    const res = await crearPedido({
      detalles: [{ id_producto: productoRadio.id_producto, cantidad: 1 }],
    });

    expect(res.status).toBe(201);
    expect(res.body.id_sucursal).toBe(sucMedia.id_sucursal);
  });

  test("rechaza sucursal explícita si la dirección no tiene coordenadas", async () => {
    const sinCoords = await Direccion.create({
      calle: "Sin coordenadas",
      altura: "1",
      ciudad: "CABA",
      provincia: "Buenos Aires",
      id_cliente: cliente.id_cliente,
    });

    const res = await crearPedido({
      id_direccion: sinCoords.id_direccion,
      id_sucursal: sucCerca.id_sucursal,
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/coordenadas/);
  });

  test("rechaza sucursal explícita sin coordenadas", async () => {
    const sinCoords = await Sucursal.create({
      nombre: "Sucursal sin coordenadas",
      calle: "Sin coordenadas",
      altura: "1",
      ciudad: "CABA",
      provincia: "Buenos Aires",
      estado: "activa",
    });

    const res = await crearPedido({ id_sucursal: sinCoords.id_sucursal });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/coordenadas/);
  });

  test("rechaza sucursal explícita inactiva con 409 y no crea el pedido", async () => {
    const inactiva = await Sucursal.create({ ...SUC_CERCA, nombre: "Inactiva", estado: "inactiva" });
    const antes = await Pedido.count();

    const res = await crearPedido({ id_sucursal: inactiva.id_sucursal });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/no está habilitada/);
    expect(await Pedido.count()).toBe(antes);
  });

  test("rechaza sucursal explícita fuera de horario con 409", async () => {
    const cerrada = await Sucursal.create({ ...SUC_LEJOS, nombre: "Cerrada", estado: "activa" });
    const diaDosDias = ((diaYMinutoLocal().dia + 1) % 7) + 1;
    await SucursalHorario.create({
      id_sucursal: cerrada.id_sucursal,
      dia_semana: diaDosDias,
      hora_apertura: "10:00",
      hora_cierre: "12:00",
    });
    await MateriaPrimaSucursal.create({
      id_materia_prima: materia.id_materia_prima,
      id_sucursal: cerrada.id_sucursal,
      stock: 50,
    });

    const res = await crearPedido({ id_sucursal: cerrada.id_sucursal });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/fuera de horario/);
  });

  test("sin stock suficiente en ninguna sucursal devuelve 409 y no crea el pedido", async () => {
    const antes = await Pedido.count();
    const res = await crearPedido({ detalles: [{ id_producto: producto.id_producto, cantidad: 9999 }] });

    expect(res.status).toBe(409);
    expect(await Pedido.count()).toBe(antes);
  });

  test("descuenta el stock de la sucursal asignada", async () => {
    const stockAntes = (await MateriaPrimaSucursal.findOne({
      where: { id_materia_prima: materia.id_materia_prima, id_sucursal: sucCerca.id_sucursal },
    })).stock;

    await crearPedido({ id_sucursal: sucCerca.id_sucursal, detalles: [{ id_producto: producto.id_producto, cantidad: 3 }] });

    const stockDespues = (await MateriaPrimaSucursal.findOne({
      where: { id_materia_prima: materia.id_materia_prima, id_sucursal: sucCerca.id_sucursal },
    })).stock;
    expect(stockDespues).toBe(stockAntes - 3);
  });

  test("el detalle guarda precio snapshot y observaciones", async () => {
    const res = await crearPedido({
      id_sucursal: sucCerca.id_sucursal,
      detalles: [{ id_producto: producto.id_producto, cantidad: 2, observaciones: "Sin cebolla", opcionales: [opcional.id_opcional] }],
    });

    expect(res.status).toBe(201);
    // 5500 base + 500 opcional = 6000 x2
    expect(parseFloat(res.body.importe)).toBe(12000.00);
    expect(res.body.detalles[0].observaciones).toBe("Sin cebolla");
    expect(res.body.detalles[0].opciones).toHaveLength(1);
  });

  test("rechaza detalles vacíos con 400", async () => {
    const res = await crearPedido({ detalles: [] });

    expect(res.status).toBe(400);
  });

  test("rechaza cliente inexistente con 404", async () => {
    const res = await crearPedido({ id_cliente: 9999 });

    expect(res.status).toBe(404);
  });

  test("rechaza dirección de otro cliente con 400", async () => {
    const otro = await Cliente.create({ nombre: "Otro", apellido: "X", email: "otro@example.com", password: "x" });
    const ajena = await Direccion.create({ ...DIR_CENTRO, id_cliente: otro.id_cliente });

    const res = await crearPedido({ id_direccion: ajena.id_direccion });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no pertenece al cliente/);
  });

  test("rechaza producto inexistente con 404", async () => {
    const res = await crearPedido({ detalles: [{ id_producto: 9999, cantidad: 1 }] });

    expect(res.status).toBe(404);
  });

  test("rechaza opcional de otro producto con 400", async () => {
    const otroProd = await Producto.create({ nombre: "Papas", precio: 1000 });
    const res = await crearPedido({
      id_sucursal: sucCerca.id_sucursal,
      detalles: [{ id_producto: otroProd.id_producto, cantidad: 1, opcionales: [opcional.id_opcional] }],
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no pertenece al producto/);
  });
});

describe("GET pedidos y detalle", () => {
  test("GET /api/pedidos filtra por id_cliente", async () => {
    const res = await request(app).get(`/api/pedidos?id_cliente=${cliente.id_cliente}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((p) => p.id_cliente === cliente.id_cliente)).toBe(true);
  });

  test("GET /api/pedidos/:id trae detalle con importe calculado coincidente", async () => {
    const creado = await crearPedido({ id_sucursal: sucCerca.id_sucursal });
    const res = await request(app).get(`/api/pedidos/${creado.body.id_pedido}/detalles`);

    expect(res.status).toBe(200);
    const esperado = res.body.detalles.reduce((s, d) => s + d.cantidad * parseFloat(d.precio), 0);
    expect(parseFloat(res.body.importeCalculado)).toBe(esperado);
    expect(parseFloat(res.body.importe)).toBe(esperado);
  });

  test("GET /api/pedidos/:id inexistente devuelve 404", async () => {
    const res = await request(app).get("/api/pedidos/9999");

    expect(res.status).toBe(404);
  });
});

describe("PUT /api/pedidos/:id (cambio de estado)", () => {
  test("avanza el flujo completo Pendiente → Confirmado → Preparando → En camino → Entregado", async () => {
    const creado = await crearPedido({ id_sucursal: sucCerca.id_sucursal });
    const id = creado.body.id_pedido;

    for (const estado of ["Confirmado", "Preparando", "En camino", "Entregado"]) {
      const res = await request(app).put(`/api/pedidos/${id}`).send({ estado });
      expect(res.status).toBe(200);
      expect(res.body.estado).toBe(estado);
    }

    const final = await request(app).get(`/api/pedidos/${id}`);
    expect(final.body.historial.map((h) => h.estado)).toEqual(
      ["Pendiente", "Confirmado", "Preparando", "En camino", "Entregado"]
    );
  });

  test("rechaza saltar estados con 400", async () => {
    const creado = await crearPedido({ id_sucursal: sucCerca.id_sucursal });

    const res = await request(app).put(`/api/pedidos/${creado.body.id_pedido}`).send({ estado: "Preparando" });

    expect(res.status).toBe(400);
  });

  test("rechaza retroceder con 400", async () => {
    const creado = await crearPedido({ id_sucursal: sucCerca.id_sucursal });
    await request(app).put(`/api/pedidos/${creado.body.id_pedido}`).send({ estado: "Confirmado" });

    const res = await request(app).put(`/api/pedidos/${creado.body.id_pedido}`).send({ estado: "Pendiente" });

    expect(res.status).toBe(400);
  });

  test("rechaza estado inválido con 400 (Joi)", async () => {
    const creado = await crearPedido({ id_sucursal: sucCerca.id_sucursal });

    const res = await request(app).put(`/api/pedidos/${creado.body.id_pedido}`).send({ estado: "Volando" });

    expect(res.status).toBe(400);
  });

  test("pedido inexistente devuelve 404", async () => {
    const res = await request(app).put("/api/pedidos/9999").send({ estado: "Confirmado" });

    expect(res.status).toBe(404);
  });

  test("el importe manual se autocorrige al calculado", async () => {
    const creado = await crearPedido({ id_sucursal: sucCerca.id_sucursal });

    const res = await request(app)
      .put(`/api/pedidos/${creado.body.id_pedido}`)
      .send({ estado: "Confirmado", importe: 1 });

    expect(res.status).toBe(200);
    expect(parseFloat(res.body.importe)).toBe(5500.00);
  });

  test("no permite cambiar la sucursal por PUT", async () => {
    const creado = await crearPedido({ id_sucursal: sucCerca.id_sucursal });

    const res = await request(app)
      .put(`/api/pedidos/${creado.body.id_pedido}`)
      .send({ id_sucursal: sucLejos.id_sucursal });

    expect(res.status).toBe(400);
    const get = await request(app).get(`/api/pedidos/${creado.body.id_pedido}`);
    expect(get.body.id_sucursal).toBe(sucCerca.id_sucursal);
  });
});

describe("Cancelación", () => {
  test("cancela un pedido Pendiente y suma al historial", async () => {
    const creado = await crearPedido({ id_sucursal: sucCerca.id_sucursal });

    const res = await request(app).put(`/api/pedidos/${creado.body.id_pedido}`).send({ estado: "Cancelado" });

    expect(res.status).toBe(200);
    expect(res.body.estado).toBe("Cancelado");
    expect(res.body.historial.map((h) => h.estado)).toEqual(["Pendiente", "Cancelado"]);
  });

  test("cancelar un pedido repone el stock de materias primas", async () => {
    const antes = (await MateriaPrimaSucursal.findOne({
      where: { id_materia_prima: materia.id_materia_prima, id_sucursal: sucCerca.id_sucursal },
    })).stock;

    const creado = await crearPedido({
      id_sucursal: sucCerca.id_sucursal,
      detalles: [{ id_producto: producto.id_producto, cantidad: 2 }],
    });
    const trasPedido = (await MateriaPrimaSucursal.findOne({
      where: { id_materia_prima: materia.id_materia_prima, id_sucursal: sucCerca.id_sucursal },
    })).stock;
    expect(trasPedido).toBe(antes - 2);

    const res = await request(app).put(`/api/pedidos/${creado.body.id_pedido}`).send({ estado: "Cancelado" });
    expect(res.status).toBe(200);

    const trasCancelar = (await MateriaPrimaSucursal.findOne({
      where: { id_materia_prima: materia.id_materia_prima, id_sucursal: sucCerca.id_sucursal },
    })).stock;
    expect(trasCancelar).toBe(antes);
  });

  test("no se puede cancelar un pedido Entregado", async () => {
    const creado = await crearPedido({ id_sucursal: sucCerca.id_sucursal });
    for (const estado of ["Confirmado", "Preparando", "En camino", "Entregado"]) {
      await request(app).put(`/api/pedidos/${creado.body.id_pedido}`).send({ estado });
    }

    const res = await request(app).put(`/api/pedidos/${creado.body.id_pedido}`).send({ estado: "Cancelado" });

    expect(res.status).toBe(400);
  });

  test("un pedido Cancelado es terminal: no admite más cambios", async () => {
    const creado = await crearPedido({ id_sucursal: sucCerca.id_sucursal });
    await request(app).put(`/api/pedidos/${creado.body.id_pedido}`).send({ estado: "Cancelado" });

    const res = await request(app).put(`/api/pedidos/${creado.body.id_pedido}`).send({ estado: "Confirmado" });

    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/pedidos/:id (baja lógica)", () => {
  test("da de baja el pedido: deja de mostrarse pero persiste en la base", async () => {
    const creado = await crearPedido({ id_sucursal: sucCerca.id_sucursal });
    const id = creado.body.id_pedido;

    const del = await request(app).delete(`/api/pedidos/${id}`);
    expect(del.status).toBe(200);

    const get = await request(app).get(`/api/pedidos/${id}`);
    expect(get.status).toBe(404);

    const lista = await request(app).get(`/api/pedidos?id_cliente=${cliente.id_cliente}`);
    expect(lista.body.some((p) => p.id_pedido === id)).toBe(false);

    const enDb = await Pedido.findByPk(id, { paranoid: false });
    expect(enDb).not.toBeNull();
    expect(enDb.deletedAt).not.toBeNull();
  });

  test("eliminar inexistente devuelve 404", async () => {
    const res = await request(app).delete("/api/pedidos/9999");

    expect(res.status).toBe(404);
  });
});

describe("PUT /api/pedidos/:id/detalles/:idDetalle (preparado)", () => {
  test("al confirmar todos los items avanza solo a En camino", async () => {
    const creado = await crearPedido({
      id_sucursal: sucCerca.id_sucursal,
      detalles: [
        { id_producto: producto.id_producto, cantidad: 1 },
        { id_producto: producto.id_producto, cantidad: 1, observaciones: "doble" },
      ],
    });
    const id = creado.body.id_pedido;
    const [d1, d2] = creado.body.detalles;
    await request(app).put(`/api/pedidos/${id}`).send({ estado: "Confirmado" });
    await request(app).put(`/api/pedidos/${id}`).send({ estado: "Preparando" });

    const r1 = await request(app).put(`/api/pedidos/${id}/detalles/${d1.id_detalle}`).send({ preparado: true });
    expect(r1.status).toBe(200);
    expect(r1.body.pedidoAvanzadoA).toBeNull();

    const r2 = await request(app).put(`/api/pedidos/${id}/detalles/${d2.id_detalle}`).send({ preparado: true });
    expect(r2.status).toBe(200);
    expect(r2.body.pedidoAvanzadoA).toBe("En camino");

    const final = await request(app).get(`/api/pedidos/${id}`);
    expect(final.body.estado).toBe("En camino");
  });

  test("rechaza confirmar items si no está en Preparando", async () => {
    const creado = await crearPedido({ id_sucursal: sucCerca.id_sucursal });
    const d = creado.body.detalles[0];

    const res = await request(app).put(`/api/pedidos/${creado.body.id_pedido}/detalles/${d.id_detalle}`).send({ preparado: true });

    expect(res.status).toBe(400);
  });

  test("rechaza detalle de otro pedido con 404", async () => {
    const a = await crearPedido({ id_sucursal: sucCerca.id_sucursal });
    const b = await crearPedido({ id_sucursal: sucCerca.id_sucursal });
    await request(app).put(`/api/pedidos/${a.body.id_pedido}`).send({ estado: "Confirmado" });
    await request(app).put(`/api/pedidos/${a.body.id_pedido}`).send({ estado: "Preparando" });

    const res = await request(app)
      .put(`/api/pedidos/${a.body.id_pedido}/detalles/${b.body.detalles[0].id_detalle}`)
      .send({ preparado: true });

    expect(res.status).toBe(404);
  });
});
