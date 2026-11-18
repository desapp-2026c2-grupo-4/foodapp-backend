const { request, app } = require("./helpers/request");
const { resetDb, closeDb } = require("./db_utils");
const {
  Categoria,
  MateriaPrima,
  Producto,
  CategoriaProducto,
  ProductoMateriaPrima,
  PromocionProducto,
  Sucursal,
  SucursalHorario,
  MateriaPrimaSucursal,
} = require("../models");
const stockService = require("../services/stockService");

beforeAll(async () => {
  await resetDb();
});

afterAll(async () => {
  await closeDb();
});

describe("Baja lógica de categorías de producto", () => {
  test("oculta la relación, conserva la fila y la restaura al volver a agregarla", async () => {
    const categoriaA = await Categoria.create({ nombre: "Categoría A" });
    const categoriaB = await Categoria.create({ nombre: "Categoría B" });
    const creado = await request(app).post("/api/productos").send({
      nombre: "Producto con categorías",
      precio: 1000,
      categorias: [categoriaA.id_categoria, categoriaB.id_categoria],
    });
    expect(creado.status).toBe(201);

    const idProducto = creado.body.id_producto;
    const baja = await request(app)
      .put(`/api/productos/${idProducto}`)
      .send({ categorias: [categoriaA.id_categoria] });
    expect(baja.status).toBe(200);
    expect(baja.body.categorias).toHaveLength(1);

    const filas = await CategoriaProducto.findAll({
      where: { id_producto: idProducto },
      paranoid: false,
    });
    expect(filas).toHaveLength(2);
    const filaB = filas.find((f) => f.id_categoria === categoriaB.id_categoria);
    expect(filaB.deletedAt).not.toBeNull();

    const detalle = await request(app).get(`/api/productos/${idProducto}`);
    expect(detalle.body.categorias.map((c) => c.id_categoria)).toEqual([categoriaA.id_categoria]);

    const reactivada = await request(app)
      .put(`/api/productos/${idProducto}`)
      .send({ categorias: [categoriaA.id_categoria, categoriaB.id_categoria] });
    expect(reactivada.status).toBe(200);
    expect(reactivada.body.categorias).toHaveLength(2);

    const filasFinales = await CategoriaProducto.findAll({
      where: { id_producto: idProducto },
      paranoid: false,
    });
    expect(filasFinales).toHaveLength(2);
    const filaBRestaurada = filasFinales.find((f) => f.id_categoria === categoriaB.id_categoria);
    expect(filaBRestaurada.id_categoria_producto).toBe(filaB.id_categoria_producto);
    expect(filaBRestaurada.deletedAt).toBeNull();
  });
});

describe("Baja lógica de la receta de producto", () => {
  test("la materia prima dada de baja no cuenta para el stock y se restaura al volver a agregarla", async () => {
    const carne = await MateriaPrima.create({ nombre: "Carne para receta" });
    const sucursal = await Sucursal.create({
      nombre: "Sucursal receta",
      estado: "activa",
      calle: "Calle",
      altura: "1",
      ciudad: "Ciudad",
      provincia: "Provincia",
    });
    await MateriaPrimaSucursal.create({
      id_materia_prima: carne.id_materia_prima,
      id_sucursal: sucursal.id_sucursal,
      stock: 10,
    });
    const creado = await request(app).post("/api/productos").send({
      nombre: "Producto con receta",
      precio: 1000,
      materiasPrimas: [{ id_materia_prima: carne.id_materia_prima, cantidad: 2 }],
    });
    expect(creado.status).toBe(201);
    const idProducto = creado.body.id_producto;

    expect((await stockService.calcularStockProductos(sucursal.id_sucursal)).get(idProducto)).toBe(5);

    const sinReceta = await request(app)
      .put(`/api/productos/${idProducto}`)
      .send({ materiasPrimas: [] });
    expect(sinReceta.status).toBe(200);

    const filas = await ProductoMateriaPrima.findAll({
      where: { id_producto: idProducto },
      paranoid: false,
    });
    expect(filas).toHaveLength(1);
    expect(filas[0].deletedAt).not.toBeNull();
    expect((await stockService.calcularStockProductos(sucursal.id_sucursal)).get(idProducto) ?? 0).toBe(0);

    const conRecetaNueva = await request(app)
      .put(`/api/productos/${idProducto}`)
      .send({ materiasPrimas: [{ id_materia_prima: carne.id_materia_prima, cantidad: 5 }] });
    expect(conRecetaNueva.status).toBe(200);

    const filasFinales = await ProductoMateriaPrima.findAll({
      where: { id_producto: idProducto },
      paranoid: false,
    });
    expect(filasFinales).toHaveLength(1);
    expect(filasFinales[0].deletedAt).toBeNull();
    expect(filasFinales[0].cantidad).toBe(5);
    expect((await stockService.calcularStockProductos(sucursal.id_sucursal)).get(idProducto)).toBe(2);
  });
});

describe("Baja lógica de productos de una promoción", () => {
  test("oculta el producto, conserva la fila y la restaura al volver a agregarlo", async () => {
    const productoA = await Producto.create({ nombre: "Promo A", precio: 1000 });
    const productoB = await Producto.create({ nombre: "Promo B", precio: 2000 });
    const creada = await request(app).post("/api/promociones").send({
      nombre: "Promo con dos productos",
      tipo: "PRECIO_FIJO",
      valor: 2500,
      fecha_inicio: "2024-01-01",
      fecha_fin: "2035-12-31",
      productos: [
        { id_producto: productoA.id_producto, cantidad: 1 },
        { id_producto: productoB.id_producto, cantidad: 2 },
      ],
    });
    expect(creada.status).toBe(201);
    const idPromocion = creada.body.id_promocion;

    const baja = await request(app)
      .put(`/api/promociones/${idPromocion}`)
      .send({ productos: [{ id_producto: productoA.id_producto, cantidad: 1 }] });
    expect(baja.status).toBe(200);
    expect(baja.body.productos).toHaveLength(1);

    const filas = await PromocionProducto.findAll({
      where: { id_promocion: idPromocion },
      paranoid: false,
    });
    expect(filas).toHaveLength(2);
    const filaB = filas.find((f) => f.id_producto === productoB.id_producto);
    expect(filaB.deletedAt).not.toBeNull();

    const detalle = await request(app).get(`/api/promociones/${idPromocion}`);
    expect(detalle.body.productos.map((p) => p.id_producto)).toEqual([productoA.id_producto]);

    const reactivada = await request(app)
      .put(`/api/promociones/${idPromocion}`)
      .send({
        productos: [
          { id_producto: productoA.id_producto, cantidad: 1 },
          { id_producto: productoB.id_producto, cantidad: 3 },
        ],
      });
    expect(reactivada.status).toBe(200);
    expect(reactivada.body.productos).toHaveLength(2);

    const filasFinales = await PromocionProducto.findAll({
      where: { id_promocion: idPromocion },
      paranoid: false,
    });
    expect(filasFinales).toHaveLength(2);
    const filaBRestaurada = filasFinales.find((f) => f.id_producto === productoB.id_producto);
    expect(filaBRestaurada.id_promocion_producto).toBe(filaB.id_promocion_producto);
    expect(filaBRestaurada.deletedAt).toBeNull();
    expect(filaBRestaurada.cantidad).toBe(3);
  });
});

describe("Baja lógica de horarios de sucursal", () => {
  test("oculta el día, conserva la fila y la restaura al volver a agregarlo", async () => {
    const creada = await request(app).post("/api/sucursales").send({
      nombre: "Sucursal con horarios",
      calle: "Calle",
      altura: "1",
      ciudad: "Ciudad",
      provincia: "Provincia",
      horarios: [
        { dia_semana: 1, hora_apertura: "10:00", hora_cierre: "18:00" },
        { dia_semana: 2, hora_apertura: "10:00", hora_cierre: "18:00" },
      ],
    });
    expect(creada.status).toBe(201);
    const idSucursal = creada.body.id_sucursal;

    const baja = await request(app)
      .put(`/api/sucursales/${idSucursal}`)
      .send({ horarios: [{ dia_semana: 3, hora_apertura: "12:00", hora_cierre: "20:00" }] });
    expect(baja.status).toBe(200);
    expect(baja.body.horarios).toHaveLength(1);
    expect(baja.body.horarios[0].dia_semana).toBe(3);

    const filas = await SucursalHorario.findAll({
      where: { id_sucursal: idSucursal },
      paranoid: false,
    });
    expect(filas).toHaveLength(3);
    const filaDia1 = filas.find((f) => f.dia_semana === 1);
    expect(filaDia1.deletedAt).not.toBeNull();

    const detalle = await request(app).get(`/api/sucursales/${idSucursal}`);
    expect(detalle.body.horarios.map((h) => h.dia_semana)).toEqual([3]);

    const reactivada = await request(app)
      .put(`/api/sucursales/${idSucursal}`)
      .send({
        horarios: [
          { dia_semana: 1, hora_apertura: "09:00", hora_cierre: "17:00" },
          { dia_semana: 3, hora_apertura: "12:00", hora_cierre: "20:00" },
        ],
      });
    expect(reactivada.status).toBe(200);
    expect(reactivada.body.horarios).toHaveLength(2);

    const filasFinales = await SucursalHorario.findAll({
      where: { id_sucursal: idSucursal },
      paranoid: false,
    });
    expect(filasFinales).toHaveLength(3);
    const filaDia1Restaurada = filasFinales.find((f) => f.dia_semana === 1);
    expect(filaDia1Restaurada.id_horario).toBe(filaDia1.id_horario);
    expect(filaDia1Restaurada.deletedAt).toBeNull();
    expect(filaDia1Restaurada.hora_apertura).toMatch(/^09:00/);
  });
});
