require("dotenv").config();
const {
  sequelize,
  Cliente,
  Direccion,
  Sucursal,
  SucursalHorario,
  Categoria,
  Producto,
  CategoriaProducto,
  MateriaPrima,
  ProductoMateriaPrima,
  MateriaPrimaSucursal,
  Pedido,
  DetallePedido,
  HistorialPedido,
  ProductoPedido,
  Empleado,
  Opcional,
  DetallePedidoOpcional,
  Banner,
  Promocion,
} = require("../models");
const promocionService = require("../services/promocionService");
const { hashPassword } = require("../utils/password");

const imagen = (id, ancho = 800) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${ancho}&q=80`;

const IMG = {
  clasica: imagen("photo-1568901346375-23c9450c58cd"),
  doble: imagen("photo-1553979459-d2229ba7433b"),
  bacon: imagen("photo-1550547660-d9450f859349"),
  veggie: imagen("photo-1520072959219-c595dc870360"),
  papas: imagen("photo-1573080496219-bb080dd4f877"),
  papasCheddar: imagen("photo-1585109649139-366815a0d713"),
  nuggets: imagen("photo-1562967914-608f82629710"),
  gaseosa: imagen("photo-1581636625402-29b2a704ef13"),
  agua: imagen("photo-1548839140-29a749e1cf4d"),
  limonada: imagen("photo-1621263764928-df1444c5e859"),
  helado: imagen("photo-1563805042-7684c019e1cb"),
  brownie: imagen("photo-1606313564200-e75d5e30476c"),
  combo: imagen("photo-1550547660-d9450f859349", 1200),
  bannerCombo: imagen("photo-1550547660-d9450f859349", 1600),
  bannerPapas: imagen("photo-1573080496219-bb080dd4f877", 1600),
  bannerPostres: imagen("photo-1563805042-7684c019e1cb", 1600),
};

const horarioSemanal = (apertura, cierre, dias = [1, 2, 3, 4, 5, 6, 7]) =>
  dias.map((dia_semana) => ({ dia_semana, hora_apertura: apertura, hora_cierre: cierre }));

const sucursalesDemo = [
  {
    nombre: "Centro",
    estado: "activa",
    telefono: "1140001111",
    calle: "Av. Rivadavia",
    altura: "1000",
    ciudad: "CABA",
    provincia: "Buenos Aires",
    codigo_postal: "C1001",
    latitud: -34.6083,
    longitud: -58.3712,
    radio_km: 3.5,
    horarios: horarioSemanal("10:00", "23:00"),
  },
  {
    nombre: "Palermo",
    estado: "activa",
    telefono: "1140002222",
    calle: "Av. Santa Fe",
    altura: "3200",
    ciudad: "CABA",
    provincia: "Buenos Aires",
    codigo_postal: "C1425",
    latitud: -34.5885,
    longitud: -58.412,
    radio_km: 3.5,
    horarios: horarioSemanal("11:00", "00:00"),
  },
  {
    nombre: "Almagro",
    estado: "activa",
    telefono: "1140004444",
    calle: "Av. Corrientes",
    altura: "4200",
    ciudad: "CABA",
    provincia: "Buenos Aires",
    codigo_postal: "C1194",
    latitud: -34.6037,
    longitud: -58.4255,
    radio_km: 3,
    horarios: horarioSemanal("10:00", "23:00"),
  },
  {
    nombre: "Caballito",
    estado: "activa",
    telefono: "1140005555",
    calle: "Av. Rivadavia",
    altura: "5000",
    ciudad: "CABA",
    provincia: "Buenos Aires",
    codigo_postal: "C1424",
    latitud: -34.6224,
    longitud: -58.443,
    radio_km: 3,
    horarios: horarioSemanal("10:00", "23:00"),
  },
  {
    nombre: "Vicente López",
    estado: "activa",
    telefono: "1140006666",
    calle: "Av. Maipú",
    altura: "1500",
    ciudad: "Vicente López",
    provincia: "Buenos Aires",
    codigo_postal: "B1638",
    latitud: -34.524,
    longitud: -58.4782,
    radio_km: 4,
    horarios: horarioSemanal("10:00", "23:00"),
  },
  {
    nombre: "Morón",
    estado: "activa",
    telefono: "1140003333",
    calle: "Av. Rivadavia",
    altura: "23000",
    ciudad: "Morón",
    provincia: "Buenos Aires",
    codigo_postal: "B1708",
    latitud: -34.65,
    longitud: -58.62,
    radio_km: 4,
    horarios: horarioSemanal("10:00", "22:00", [1, 2, 3, 4, 5, 6]),
  },
  {
    nombre: "San Isidro",
    estado: "inactiva",
    telefono: "1140007777",
    calle: "Av. Centenario",
    altura: "1200",
    ciudad: "San Isidro",
    provincia: "Buenos Aires",
    codigo_postal: "B1642",
    latitud: -34.472,
    longitud: -58.511,
    radio_km: 3,
    horarios: horarioSemanal("10:00", "22:00"),
  },
];

const categoriasDemo = [
  "Hamburguesas",
  "Papas",
  "Bebidas",
  "Postres",
  "Pollo",
  "Vegetariano",
];

const materiasDemo = [
  { nombre: "Pan", stock_minimo: 20 },
  { nombre: "Medallón de carne", stock_minimo: 20 },
  { nombre: "Medallón veggie", stock_minimo: 10 },
  { nombre: "Queso cheddar", stock_minimo: 30 },
  { nombre: "Bacon", stock_minimo: 20 },
  { nombre: "Vegetales", stock_minimo: 20 },
  { nombre: "Papa", stock_minimo: 80 },
  { nombre: "Aceite", stock_minimo: 20 },
  { nombre: "Pollo", stock_minimo: 20 },
  { nombre: "Gaseosa", stock_minimo: 30 },
  { nombre: "Agua", stock_minimo: 30 },
  { nombre: "Limón", stock_minimo: 20 },
  { nombre: "Helado", stock_minimo: 20 },
  { nombre: "Brownie", stock_minimo: 10 },
];

const stockBase = {
  Pan: 180,
  "Medallón de carne": 140,
  "Medallón veggie": 80,
  "Queso cheddar": 180,
  Bacon: 100,
  Vegetales: 140,
  Papa: 240,
  Aceite: 120,
  Pollo: 100,
  Gaseosa: 140,
  Agua: 140,
  Limón: 100,
  Helado: 120,
  Brownie: 80,
};

const stockPorSucursal = {
  Palermo: { Papa: 40 },
  Morón: { Bacon: 0 },
  "Vicente López": { Helado: 0 },
  "San Isidro": Object.fromEntries(materiasDemo.map((m) => [m.nombre, 0])),
};

const productosDemo = [
  {
    nombre: "Hamburguesa Clásica",
    descripcion: "Pan, medallón de carne, queso cheddar, lechuga y tomate",
    precio: 5500,
    imagen: IMG.clasica,
    categorias: ["Hamburguesas"],
    receta: { Pan: 1, "Medallón de carne": 1, "Queso cheddar": 1, Vegetales: 1 },
  },
  {
    nombre: "Hamburguesa Doble Cheddar",
    descripcion: "Doble carne, doble cheddar y pan brioche",
    precio: 7900,
    imagen: IMG.doble,
    categorias: ["Hamburguesas"],
    receta: { Pan: 1, "Medallón de carne": 2, "Queso cheddar": 2 },
  },
  {
    nombre: "Hamburguesa Bacon",
    descripcion: "Carne, cheddar, bacon crocante y salsa de la casa",
    precio: 8200,
    imagen: IMG.bacon,
    categorias: ["Hamburguesas"],
    receta: { Pan: 1, "Medallón de carne": 1, "Queso cheddar": 1, Bacon: 2 },
  },
  {
    nombre: "Hamburguesa Veggie",
    descripcion: "Medallón veggie, queso, vegetales frescos y pan artesanal",
    precio: 6900,
    imagen: IMG.veggie,
    categorias: ["Hamburguesas", "Vegetariano"],
    receta: { Pan: 1, "Medallón veggie": 1, "Queso cheddar": 1, Vegetales: 1 },
  },
  {
    nombre: "Papas Fritas Grandes",
    descripcion: "Porción grande de papas fritas con sal marina",
    precio: 3200,
    imagen: IMG.papas,
    categorias: ["Papas"],
    receta: { Papa: 3, Aceite: 1 },
  },
  {
    nombre: "Papas con Cheddar y Bacon",
    descripcion: "Papas fritas cubiertas con cheddar fundido y bacon",
    precio: 4500,
    imagen: IMG.papasCheddar,
    categorias: ["Papas"],
    receta: { Papa: 3, Aceite: 1, "Queso cheddar": 1, Bacon: 1 },
  },
  {
    nombre: "Nuggets de Pollo x8",
    descripcion: "Ocho nuggets de pollo con salsa para dipping",
    precio: 4800,
    imagen: IMG.nuggets,
    categorias: ["Pollo"],
    receta: { Pollo: 1, Aceite: 1 },
  },
  {
    nombre: "Gaseosa Cola 500 ml",
    descripcion: "Bebida cola bien fría",
    precio: 1800,
    imagen: IMG.gaseosa,
    categorias: ["Bebidas"],
    receta: { Gaseosa: 1 },
  },
  {
    nombre: "Agua Mineral 500 ml",
    descripcion: "Agua mineral sin gas",
    precio: 1200,
    imagen: IMG.agua,
    categorias: ["Bebidas"],
    receta: { Agua: 1 },
  },
  {
    nombre: "Limonada 500 ml",
    descripcion: "Limonada artesanal con limón fresco",
    precio: 2200,
    imagen: IMG.limonada,
    categorias: ["Bebidas"],
    receta: { Limón: 2, Agua: 1 },
  },
  {
    nombre: "Helado Oreo",
    descripcion: "Helado cremoso con galletitas Oreo",
    precio: 2800,
    imagen: IMG.helado,
    categorias: ["Postres"],
    receta: { Helado: 3 },
  },
  {
    nombre: "Brownie con Helado",
    descripcion: "Brownie tibio con bocha de helado de vainilla",
    precio: 3500,
    imagen: IMG.brownie,
    categorias: ["Postres"],
    receta: { Brownie: 1, Helado: 1 },
  },
];

const opcionalesDemo = [
  { producto: "Hamburguesa Clásica", nombre: "Extra queso", descripcion: "Feta extra de cheddar", precio: 500 },
  { producto: "Hamburguesa Clásica", nombre: "Sin cebolla", descripcion: "Sin cebolla", precio: 0 },
  { producto: "Hamburguesa Doble Cheddar", nombre: "Extra cheddar", descripcion: "Dos fetas extra de cheddar", precio: 700 },
  { producto: "Hamburguesa Bacon", nombre: "Extra bacon", descripcion: "Porción extra de bacon", precio: 800 },
  { producto: "Hamburguesa Bacon", nombre: "Extra carne", descripcion: "Medallón extra de carne", precio: 900 },
  { producto: "Brownie con Helado", nombre: "Extra helado", descripcion: "Bocha extra de helado", precio: 800 },
];

const promocionesDemo = [
  {
    nombre: "Combo Bajón",
    descripcion: "2 hamburguesas clásicas + papas grandes + 2 gaseosas",
    imagen: IMG.combo,
    tipo: "PRECIO_FIJO",
    valor: 12000,
    fecha_inicio: "2026-01-01",
    fecha_fin: "2027-12-31",
    activa: true,
    productos: [
      ["Hamburguesa Clásica", 2],
      ["Papas Fritas Grandes", 1],
      ["Gaseosa Cola 500 ml", 2],
    ],
  },
  {
    nombre: "Combo Doble Cheddar",
    descripcion: "2 dobles cheddar + 2 papas grandes + 2 gaseosas",
    imagen: IMG.combo,
    tipo: "PRECIO_FIJO",
    valor: 22000,
    fecha_inicio: "2026-01-01",
    fecha_fin: "2027-12-31",
    activa: true,
    productos: [
      ["Hamburguesa Doble Cheddar", 2],
      ["Papas Fritas Grandes", 2],
      ["Gaseosa Cola 500 ml", 2],
    ],
  },
  {
    nombre: "Combo Veggie",
    descripcion: "Hamburguesa veggie + papas grandes + limonada",
    imagen: IMG.veggie,
    tipo: "PRECIO_FIJO",
    valor: 9500,
    fecha_inicio: "2026-01-01",
    fecha_fin: "2027-12-31",
    activa: true,
    productos: [
      ["Hamburguesa Veggie", 1],
      ["Papas Fritas Grandes", 1],
      ["Limonada 500 ml", 1],
    ],
  },
  {
    nombre: "2x1 Papas Grandes",
    descripcion: "Llevás 2 papas grandes y pagás 1",
    imagen: IMG.papas,
    tipo: "DOS_POR_UNO",
    valor: 0,
    fecha_inicio: "2026-01-01",
    fecha_fin: "2027-12-31",
    activa: true,
    productos: [["Papas Fritas Grandes", 2]],
  },
  {
    nombre: "15% Hamburguesa Clásica",
    descripcion: "Descuento en la hamburguesa clásica",
    imagen: IMG.clasica,
    tipo: "PORCENTAJE",
    valor: 15,
    fecha_inicio: "2026-01-01",
    fecha_fin: "2027-12-31",
    activa: true,
    productos: [["Hamburguesa Clásica", 1]],
  },
  {
    nombre: "Promo Vencida",
    descripcion: "Ejemplo de promoción inactiva para el panel administrativo",
    imagen: IMG.papas,
    tipo: "PRECIO_FIJO",
    valor: 4000,
    fecha_inicio: "2025-01-01",
    fecha_fin: "2025-12-31",
    activa: false,
    productos: [
      ["Papas Fritas Grandes", 1],
      ["Gaseosa Cola 500 ml", 1],
    ],
  },
];

const bannersDemo = [
  {
    titulo: "Combos que rinden",
    descripcion: "Hamburguesas, papas y bebida en un solo pedido",
    imagen: IMG.bannerCombo,
    activo: true,
    orden: 0,
  },
  {
    titulo: "2x1 en papas grandes",
    descripcion: "La promo que acompaña cualquier hamburguesa",
    imagen: IMG.bannerPapas,
    activo: true,
    orden: 1,
  },
  {
    titulo: "Dulce final",
    descripcion: "Helados y brownies para cerrar el pedido",
    imagen: IMG.bannerPostres,
    activo: true,
    orden: 2,
  },
];

const clientesDemo = [
  { nombre: "Juan", apellido: "Pérez", tipo_doc: "DNI", dni: "30111222", email: "juan.perez@example.com" },
  { nombre: "María", apellido: "Gómez", tipo_doc: "DNI", dni: "30222333", email: "maria.gomez@example.com" },
  { nombre: "Carlos", apellido: "López", tipo_doc: "DNI", dni: "30333444", email: "carlos.lopez@example.com" },
  { nombre: "Lucía", apellido: "Fernández", tipo_doc: "DNI", dni: "30444555", email: "lucia.fernandez@example.com" },
];

const direccionesDemo = [
  {
    cliente: "juan.perez@example.com",
    calle: "Av. Rivadavia",
    altura: "1500",
    ciudad: "CABA",
    provincia: "Buenos Aires",
    codigo_postal: "C1085",
    latitud: -34.61,
    longitud: -58.385,
  },
  {
    cliente: "juan.perez@example.com",
    calle: "Mitre",
    altura: "123",
    ciudad: "Morón",
    provincia: "Buenos Aires",
    codigo_postal: "B1708",
    latitud: -34.651,
    longitud: -58.621,
  },
  {
    cliente: "maria.gomez@example.com",
    calle: "Av. Santa Fe",
    altura: "3200",
    ciudad: "CABA",
    provincia: "Buenos Aires",
    codigo_postal: "C1425",
    latitud: -34.5885,
    longitud: -58.412,
  },
  {
    cliente: "carlos.lopez@example.com",
    calle: "Av. Rivadavia",
    altura: "23000",
    ciudad: "Morón",
    provincia: "Buenos Aires",
    codigo_postal: "B1708",
    latitud: -34.65,
    longitud: -58.62,
  },
  {
    cliente: "lucia.fernandez@example.com",
    calle: "Av. Rivadavia",
    altura: "5000",
    ciudad: "CABA",
    provincia: "Buenos Aires",
    codigo_postal: "C1424",
    latitud: -34.6224,
    longitud: -58.443,
  },
];

const pedidosDemo = [
  {
    cliente: "juan.perez@example.com",
    sucursal: "Centro",
    estado: "Pendiente",
    fecha: "2026-11-15T18:00:00-03:00",
    historial: ["Pendiente"],
    items: [
      { producto: "Hamburguesa Clásica", cantidad: 1, observaciones: "Sin cebolla", opcionales: ["Extra queso"] },
      { producto: "Papas Fritas Grandes", cantidad: 1 },
      { producto: "Gaseosa Cola 500 ml", cantidad: 1 },
    ],
  },
  {
    cliente: "maria.gomez@example.com",
    sucursal: "Palermo",
    estado: "Confirmado",
    fecha: "2026-11-15T18:30:00-03:00",
    historial: ["Pendiente", "Confirmado"],
    items: [
      { producto: "Hamburguesa Doble Cheddar", cantidad: 2 },
      { producto: "Gaseosa Cola 500 ml", cantidad: 2 },
    ],
  },
  {
    cliente: "carlos.lopez@example.com",
    sucursal: "Morón",
    estado: "Preparando",
    fecha: "2026-11-15T19:00:00-03:00",
    historial: ["Pendiente", "Confirmado", "Preparando"],
    items: [
      { producto: "Hamburguesa Clásica", cantidad: 1 },
      { producto: "Papas Fritas Grandes", cantidad: 1 },
    ],
  },
  {
    cliente: "lucia.fernandez@example.com",
    sucursal: "Caballito",
    estado: "Entregado",
    fecha: "2026-11-14T20:00:00-03:00",
    historial: ["Pendiente", "Confirmado", "Preparando", "Listo", "En camino", "Entregado"],
    items: [
      { producto: "Hamburguesa Veggie", cantidad: 1 },
      { producto: "Limonada 500 ml", cantidad: 1 },
      { producto: "Helado Oreo", cantidad: 1 },
    ],
  },
  {
    cliente: "juan.perez@example.com",
    sucursal: "Centro",
    estado: "Entregado",
    fecha: "2026-11-13T21:00:00-03:00",
    historial: ["Pendiente", "Confirmado", "Preparando", "Listo", "En camino", "Entregado"],
    promocion: { nombre: "Combo Bajón", cantidad: 1 },
  },
  {
    cliente: "maria.gomez@example.com",
    sucursal: "Palermo",
    estado: "Cancelado",
    fecha: "2026-11-12T22:00:00-03:00",
    historial: ["Pendiente", "Cancelado"],
    items: [
      { producto: "Helado Oreo", cantidad: 1 },
      { producto: "Brownie con Helado", cantidad: 1 },
    ],
  },
];

const crearSucursales = async () => {
  const sucursales = await Sucursal.bulkCreate(
    sucursalesDemo.map(({ horarios, ...sucursal }) => sucursal),
    { returning: true }
  );
  const porNombre = Object.fromEntries(sucursales.map((s) => [s.nombre, s]));
  const horarios = await SucursalHorario.bulkCreate(
    sucursales.flatMap((sucursal) =>
      (sucursalesDemo.find((s) => s.nombre === sucursal.nombre)?.horarios || []).map((h) => ({
        ...h,
        id_sucursal: sucursal.id_sucursal,
      }))
    )
  );
  return { sucursales, porNombre, horarios };
};

const crearCategorias = async () => {
  const categorias = await Categoria.bulkCreate(
    categoriasDemo.map((nombre) => ({ nombre })),
    { returning: true }
  );
  return {
    categorias,
    porNombre: Object.fromEntries(categorias.map((c) => [c.nombre, c])),
  };
};

const crearMateriasPrimas = async () => {
  const materias = await MateriaPrima.bulkCreate(materiasDemo, { returning: true });
  return {
    materias,
    porNombre: Object.fromEntries(materias.map((m) => [m.nombre, m])),
  };
};

const crearProductos = async (categoriasPorNombre, materiasPorNombre) => {
  const productos = await Producto.bulkCreate(
    productosDemo.map(({ categorias, receta, ...producto }) => ({
      ...producto,
      estado: "disponible",
    })),
    { returning: true }
  );
  const porNombre = Object.fromEntries(productos.map((p) => [p.nombre, p]));

  const relacionesCategorias = [];
  const relacionesRecetas = [];
  for (const producto of productosDemo) {
    const creado = porNombre[producto.nombre];
    for (const categoria of producto.categorias) {
      relacionesCategorias.push({
        id_producto: creado.id_producto,
        id_categoria: categoriasPorNombre[categoria].id_categoria,
      });
    }
    for (const [materia, cantidad] of Object.entries(producto.receta)) {
      relacionesRecetas.push({
        id_producto: creado.id_producto,
        id_materia_prima: materiasPorNombre[materia].id_materia_prima,
        cantidad,
      });
    }
  }

  await CategoriaProducto.bulkCreate(relacionesCategorias);
  await ProductoMateriaPrima.bulkCreate(relacionesRecetas);

  return { productos, porNombre };
};

const crearStock = async (sucursales, materias) => {
  const filas = [];
  for (const sucursal of sucursales) {
    const overrides = stockPorSucursal[sucursal.nombre] || {};
    for (const materia of materias) {
      filas.push({
        id_sucursal: sucursal.id_sucursal,
        id_materia_prima: materia.id_materia_prima,
        stock: overrides[materia.nombre] ?? stockBase[materia.nombre] ?? 0,
      });
    }
  }
  await MateriaPrimaSucursal.bulkCreate(filas);
  return filas.length;
};

const crearPromociones = async (productosPorNombre) => {
  const promociones = [];
  for (const promo of promocionesDemo) {
    const creada = await promocionService.crearPromocion({
      nombre: promo.nombre,
      descripcion: promo.descripcion,
      imagen: promo.imagen,
      tipo: promo.tipo,
      valor: promo.valor,
      fecha_inicio: promo.fecha_inicio,
      fecha_fin: promo.fecha_fin,
      activa: promo.activa,
      productos: promo.productos.map(([nombre, cantidad]) => ({
        id_producto: productosPorNombre[nombre].id_producto,
        cantidad,
      })),
    });
    promociones.push(creada);
  }
  return promociones;
};

const crearOpcionales = async (productosPorNombre) => {
  const opcionales = await Opcional.bulkCreate(
    opcionalesDemo.map((opcional) => ({
      nombre: opcional.nombre,
      descripcion: opcional.descripcion,
      precio: opcional.precio,
      estado: "disponible",
      id_producto: productosPorNombre[opcional.producto].id_producto,
    })),
    { returning: true }
  );
  return {
    opcionales,
    porClave: Object.fromEntries(
      opcionales.map((o) => {
        const producto = opcionalesDemo.find(
          (item) => productosPorNombre[item.producto].id_producto === o.id_producto && item.nombre === o.nombre
        );
        return [`${producto.producto}|${o.nombre}`, o];
      })
    ),
  };
};

const crearClientes = async () => {
  const password = await hashPassword("cliente123");
  const clientes = await Cliente.bulkCreate(
    clientesDemo.map((cliente) => ({ ...cliente, password })),
    { returning: true }
  );
  const porEmail = Object.fromEntries(clientes.map((c) => [c.email, c]));

  const direcciones = await Direccion.bulkCreate(
    direccionesDemo.map((direccion) => ({
      calle: direccion.calle,
      altura: direccion.altura,
      ciudad: direccion.ciudad,
      provincia: direccion.provincia,
      codigo_postal: direccion.codigo_postal,
      latitud: direccion.latitud,
      longitud: direccion.longitud,
      id_cliente: porEmail[direccion.cliente].id_cliente,
    })),
    { returning: true }
  );

  const direccionPorCliente = {};
  for (const direccion of direcciones) {
    const cliente = clientesDemo.find(
      (c) => porEmail[c.email].id_cliente === direccion.id_cliente
    );
    if (cliente && !direccionPorCliente[cliente.email]) {
      direccionPorCliente[cliente.email] = direccion;
    }
  }

  return { clientes, porEmail, direcciones, direccionPorCliente };
};

const crearEmpleados = async (sucursalesPorNombre) => {
  const [passwordAdmin, passwordEmpleado] = await Promise.all([
    hashPassword("admin123"),
    hashPassword("empleado123"),
  ]);
  const empleados = await Empleado.bulkCreate([
    {
      nombre: "Admin",
      apellido: "Principal",
      rol: "ADMIN",
      email: "admin@altoque.com",
      password: passwordAdmin,
      id_sucursal: sucursalesPorNombre.Centro.id_sucursal,
    },
    {
      nombre: "Empleado",
      apellido: "Centro",
      rol: "EMPLEADO",
      email: "empleado@altoque.com",
      password: passwordEmpleado,
      id_sucursal: sucursalesPorNombre.Centro.id_sucursal,
    },
    {
      nombre: "Empleado",
      apellido: "Palermo",
      rol: "EMPLEADO",
      email: "empleado.palermo@altoque.com",
      password: passwordEmpleado,
      id_sucursal: sucursalesPorNombre.Palermo.id_sucursal,
    },
    {
      nombre: "Empleado",
      apellido: "Morón",
      rol: "EMPLEADO",
      email: "empleado.moron@altoque.com",
      password: passwordEmpleado,
      id_sucursal: sucursalesPorNombre.Morón.id_sucursal,
    },
  ], { returning: true });
  return empleados;
};

const crearPedidos = async ({
  clientesPorEmail,
  direccionPorCliente,
  sucursalesPorNombre,
  productosPorNombre,
  opcionalesPorClave,
  promociones,
}) => {
  const promocionesPorNombre = Object.fromEntries(promociones.map((p) => [p.nombre, p]));
  const transaccion = await sequelize.transaction();
  try {
    for (const pedidoDemo of pedidosDemo) {
      const cliente = clientesPorEmail[pedidoDemo.cliente];
      const direccion = direccionPorCliente[pedidoDemo.cliente];
      const sucursal = sucursalesPorNombre[pedidoDemo.sucursal];
      const fechaBase = new Date(pedidoDemo.fecha);

      const pedido = await Pedido.create({
        fecha_hora: fechaBase,
        importe: 0,
        estado: pedidoDemo.estado,
        id_cliente: cliente.id_cliente,
        id_sucursal: sucursal.id_sucursal,
        id_direccion: direccion.id_direccion,
      }, { transaction: transaccion });

      const lineas = [];
      if (pedidoDemo.promocion) {
        const promo = promocionesPorNombre[pedidoDemo.promocion.nombre];
        const expandidas = await promocionService.expandirPromocion(
          promo.id_promocion,
          pedidoDemo.promocion.cantidad,
          transaccion
        );
        for (const linea of expandidas) {
          lineas.push({
            id_producto: linea.id_producto,
            cantidad: linea.cantidad,
            precio: linea.precio,
            observaciones: `Promo ${promo.nombre}`,
            id_promocion: promo.id_promocion,
            opcionales: [],
          });
        }
      } else {
        for (const item of pedidoDemo.items) {
          const producto = productosPorNombre[item.producto];
          const opcionales = (item.opcionales || []).map(
            (nombre) => opcionalesPorClave[`${item.producto}|${nombre}`]
          );
          const precio = parseFloat(producto.precio) + opcionales.reduce(
            (total, opcional) => total + parseFloat(opcional.precio),
            0
          );
          lineas.push({
            id_producto: producto.id_producto,
            cantidad: item.cantidad,
            precio,
            observaciones: item.observaciones || null,
            id_promocion: null,
            opcionales,
          });
        }
      }

      let importe = 0;
      const productosDelPedido = new Set();
      for (const linea of lineas) {
        const detalle = await DetallePedido.create({
          id_pedido: pedido.id_pedido,
          id_producto: linea.id_producto,
          cantidad: linea.cantidad,
          precio: linea.precio,
          observaciones: linea.observaciones,
          id_promocion: linea.id_promocion,
        }, { transaction: transaccion });

        for (const opcional of linea.opcionales) {
          await DetallePedidoOpcional.create({
            id_detalle: detalle.id_detalle,
            id_opcional: opcional.id_opcional,
            precio: opcional.precio,
          }, { transaction: transaccion });
        }

        importe += linea.cantidad * linea.precio;
        productosDelPedido.add(linea.id_producto);
      }

      await ProductoPedido.bulkCreate(
        [...productosDelPedido].map((id_producto) => ({
          id_producto,
          id_pedido: pedido.id_pedido,
        })),
        { transaction: transaccion }
      );

      await pedido.update({ importe }, { transaction: transaccion });

      await HistorialPedido.bulkCreate(
        pedidoDemo.historial.map((estado, indice) => ({
          id_pedido: pedido.id_pedido,
          estado,
          fecha_hora: new Date(fechaBase.getTime() + indice * 5 * 60000),
        })),
        { transaction: transaccion }
      );
    }

    await transaccion.commit();
  } catch (err) {
    await transaccion.rollback();
    throw err;
  }
};

async function seedDemo() {
  try {
    await sequelize.authenticate();
    console.log("DB conectada, iniciando seed demo ampliado...");

    await sequelize.sync({ force: true });
    console.log("Tablas recreadas");

    const { sucursales, porNombre: sucursalesPorNombre } = await crearSucursales();
    console.log(`Sucursales: ${sucursales.length}`);

    const { categorias, porNombre: categoriasPorNombre } = await crearCategorias();
    console.log(`Categorías: ${categorias.length}`);

    const { materias, porNombre: materiasPorNombre } = await crearMateriasPrimas();
    console.log(`Materias primas: ${materias.length}`);

    const { productos } = await crearProductos(categoriasPorNombre, materiasPorNombre);
    console.log(`Productos: ${productos.length}`);

    const filasStock = await crearStock(sucursales, materias);
    console.log(`Stock materia prima × sucursal: ${filasStock}`);

    const promociones = await crearPromociones(
      Object.fromEntries(productos.map((p) => [p.nombre, p]))
    );
    console.log(`Promociones: ${promociones.length}`);

    const { opcionales, porClave: opcionalesPorClave } = await crearOpcionales(
      Object.fromEntries(productos.map((p) => [p.nombre, p]))
    );
    console.log(`Opcionales: ${opcionales.length}`);

    const banners = await Banner.bulkCreate(bannersDemo, { returning: true });
    console.log(`Banners: ${banners.length}`);

    const { clientes, porEmail: clientesPorEmail, direccionPorCliente } = await crearClientes();
    console.log(`Clientes: ${clientes.length}`);

    const empleados = await crearEmpleados(sucursalesPorNombre);
    console.log(`Empleados: ${empleados.length}`);

    await crearPedidos({
      clientesPorEmail,
      direccionPorCliente,
      sucursalesPorNombre,
      productosPorNombre: Object.fromEntries(productos.map((p) => [p.nombre, p])),
      opcionalesPorClave,
      promociones,
    });
    console.log(`Pedidos: ${pedidosDemo.length}`);

    const resumen = {
      sucursales: await Sucursal.count(),
      categorias: await Categoria.count(),
      productos: await Producto.count(),
      materias_primas: await MateriaPrima.count(),
      stock_materias_primas: await MateriaPrimaSucursal.count(),
      recetas: await ProductoMateriaPrima.count(),
      promociones: await Promocion.count(),
      banners: await Banner.count(),
      opcionales: await Opcional.count(),
      clientes: await Cliente.count(),
      empleados: await Empleado.count(),
      pedidos: await Pedido.count(),
      detalles: await DetallePedido.count(),
      historial: await HistorialPedido.count(),
    };

    console.log("Seed demo completado:", JSON.stringify(resumen, null, 2));
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error("Error en seed demo:", err);
    await sequelize.close();
    process.exit(1);
  }
}

seedDemo();
