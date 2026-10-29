const { request, requestAs, app } = require("./helpers/request");
const { crearCliente, crearEmpleado } = require("./helpers/users");
const { resetDb, closeDb } = require("./db_utils");
const {
  Categoria,
  MateriaPrima,
  Producto,
  CategoriaProducto,
  ProductoMateriaPrima,
} = require("../models");

let categoriaA;
let categoriaB;
let materiaA;
let materiaB;
let tokenCliente;
let tokenEmpleado;

const crearProducto = async (datos = {}) =>
  Producto.create({
    nombre: `Producto ${Date.now()}`,
    precio: 1000,
    ...datos,
  });

beforeAll(async () => {
  await resetDb();
  categoriaA = await Categoria.create({ nombre: "Hamburguesas" });
  categoriaB = await Categoria.create({ nombre: "Combos" });
  materiaA = await MateriaPrima.create({ nombre: "Pan" });
  materiaB = await MateriaPrima.create({ nombre: "Carne" });
  tokenCliente = (await crearCliente()).token;
  tokenEmpleado = (await crearEmpleado()).token;
});

afterAll(async () => {
  await closeDb();
});

describe("CRUD /api/productos", () => {
  test("crea un producto con categorías y receta", async () => {
    const res = await request(app).post("/api/productos").send({
      nombre: "Hamburguesa clásica",
      descripcion: "Con queso",
      precio: 5500,
      categorias: [categoriaA.id_categoria, categoriaB.id_categoria],
      materiasPrimas: [
        { id_materia_prima: materiaA.id_materia_prima, cantidad: 1 },
        { id_materia_prima: materiaB.id_materia_prima, cantidad: 2 },
      ],
    });

    expect(res.status).toBe(201);
    expect(res.body.id_producto).toBeDefined();
    expect(res.body.categorias.map((c) => c.id_categoria).sort()).toEqual(
      [categoriaA.id_categoria, categoriaB.id_categoria].sort()
    );
    const receta = res.body.materiasPrimas.find((m) => m.id_materia_prima === materiaB.id_materia_prima);
    expect(receta.ProductoMateriaPrima.cantidad).toBe(2);
  });

  test("GET público lista y obtiene productos", async () => {
    const producto = await crearProducto({ nombre: "Papas fritas", precio: 3200 });
    await CategoriaProducto.create({
      id_producto: producto.id_producto,
      id_categoria: categoriaA.id_categoria,
    });

    const lista = await requestAs(null).get("/api/productos");
    expect(lista.status).toBe(200);
    expect(lista.body.some((p) => p.id_producto === producto.id_producto)).toBe(true);

    const detalle = await requestAs(null).get(`/api/productos/${producto.id_producto}`);
    expect(detalle.status).toBe(200);
    expect(detalle.body.nombre).toBe("Papas fritas");
    expect(detalle.body.categorias.map((c) => c.id_categoria)).toContain(categoriaA.id_categoria);
  });

  test("actualiza los campos simples del producto", async () => {
    const producto = await crearProducto();

    const res = await request(app).put(`/api/productos/${producto.id_producto}`).send({
      nombre: "Producto actualizado",
      descripcion: "Nueva descripción",
      precio: 2500,
      estado: "pausado",
    });

    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe("Producto actualizado");
    expect(res.body.descripcion).toBe("Nueva descripción");
    expect(Number(res.body.precio)).toBe(2500);
    expect(res.body.estado).toBe("pausado");
  });

  test("reemplaza categorías y receta en el PUT", async () => {
    const producto = await crearProducto();
    await CategoriaProducto.create({
      id_producto: producto.id_producto,
      id_categoria: categoriaA.id_categoria,
    });
    await ProductoMateriaPrima.create({
      id_producto: producto.id_producto,
      id_materia_prima: materiaA.id_materia_prima,
      cantidad: 1,
    });

    const res = await request(app).put(`/api/productos/${producto.id_producto}`).send({
      categorias: [categoriaB.id_categoria],
      materiasPrimas: [{ id_materia_prima: materiaB.id_materia_prima, cantidad: 3 }],
    });

    expect(res.status).toBe(200);
    expect(res.body.categorias.map((c) => c.id_categoria)).toEqual([categoriaB.id_categoria]);
    expect(res.body.materiasPrimas).toHaveLength(1);
    expect(res.body.materiasPrimas[0].id_materia_prima).toBe(materiaB.id_materia_prima);
    expect(res.body.materiasPrimas[0].ProductoMateriaPrima.cantidad).toBe(3);
  });

  test("no modifica el producto si la categoría no existe", async () => {
    const producto = await crearProducto({ nombre: "Sin cambios" });

    const res = await request(app).put(`/api/productos/${producto.id_producto}`).send({
      nombre: "No debería guardarse",
      categorias: [999999],
    });

    expect(res.status).toBe(404);
    const actual = await Producto.findByPk(producto.id_producto);
    expect(actual.nombre).toBe("Sin cambios");
  });

  test("no modifica el producto si la receta es inválida", async () => {
    const producto = await crearProducto({ nombre: "Receta original" });

    const res = await request(app).put(`/api/productos/${producto.id_producto}`).send({
      nombre: "No debería guardarse",
      materiasPrimas: [{ id_materia_prima: 999999, cantidad: 1 }],
    });

    expect(res.status).toBe(400);
    const actual = await Producto.findByPk(producto.id_producto);
    expect(actual.nombre).toBe("Receta original");
  });

  test("hace rollback si falla una relación después de actualizar el producto", async () => {
    const producto = await crearProducto({ nombre: "Rollback" });
    await CategoriaProducto.create({
      id_producto: producto.id_producto,
      id_categoria: categoriaA.id_categoria,
    });

    const res = await request(app).put(`/api/productos/${producto.id_producto}`).send({
      nombre: "Cambio que debe revertirse",
      categorias: [categoriaA.id_categoria, categoriaA.id_categoria],
    });

    expect(res.status).toBe(400);
    const actual = await Producto.findByPk(producto.id_producto);
    expect(actual.nombre).toBe("Rollback");
    const relaciones = await CategoriaProducto.findAll({
      where: { id_producto: producto.id_producto },
    });
    expect(relaciones).toHaveLength(1);
    expect(relaciones[0].id_categoria).toBe(categoriaA.id_categoria);
  });

  test("no crea el producto si la categoría no existe", async () => {
    const antes = await Producto.count();

    const res = await request(app).post("/api/productos").send({
      nombre: "Producto inválido",
      precio: 100,
      categorias: [999999],
    });

    expect(res.status).toBe(404);
    expect(await Producto.count()).toBe(antes);
  });

  test("elimina lógicamente el producto", async () => {
    const producto = await crearProducto();

    const res = await request(app).delete(`/api/productos/${producto.id_producto}`);
    expect(res.status).toBe(200);
    expect(res.body.mensaje).toBeDefined();

    const detalle = await requestAs(null).get(`/api/productos/${producto.id_producto}`);
    expect(detalle.status).toBe(404);
    expect(await Producto.findByPk(producto.id_producto)).toBeNull();
  });

  test("protege las mutaciones para ADMIN", async () => {
    const producto = await crearProducto();
    const payload = { nombre: "No permitido", precio: 1 };

    expect((await requestAs(null).post("/api/productos").send(payload)).status).toBe(401);
    expect((await requestAs(tokenCliente).post("/api/productos").send(payload)).status).toBe(403);
    expect((await requestAs(tokenEmpleado).post("/api/productos").send(payload)).status).toBe(403);
    expect(
      (await requestAs(tokenEmpleado).put(`/api/productos/${producto.id_producto}`).send({ nombre: "X" })).status
    ).toBe(403);
    expect(
      (await requestAs(tokenCliente).delete(`/api/productos/${producto.id_producto}`)).status
    ).toBe(403);
  });
});
