require("dotenv").config();
const {
  sequelize,
  Cliente,
  Direccion,
  Sucursal,
  Categoria,
  Producto,
  CategoriaProducto,
  ProductoSucursal,
  Pedido,
  DetallePedido,
  HistorialPedido,
  ProductoPedido,
  Empleado,
  Opcional,
  DetallePedidoOpcional,
} = require("../models");
const promocionService = require("../services/promocionService");

async function seed() {
  try {
    await sequelize.authenticate();
    console.log("DB conectada, iniciando seed (pool <=3 por tabla)...");

    // Limpieza opcional con force ya hecho en sync; aquí truncamos si existen datos
    // Creamos datos si no existen (idempotente simple: contar y solo insertar si vacío)
    // Para garantizar <=3 ejemplos, usamos sync force antes o truncamos manualmente
    await sequelize.sync({ force: true });
    console.log("Tablas recreadas");

    // 1. Categorías (3)
    const categorias = await Categoria.bulkCreate([
      { nombre: "Hamburguesas" },
      { nombre: "Papas" },
      { nombre: "Bebidas" },
    ], { returning: true });
    console.log(`Categorías: ${categorias.length}`);

    // 2. Productos (3)
    const productos = await Producto.bulkCreate([
      { nombre: "Hamburguesa Clásica", descripcion: "Pan, carne, lechuga, tomate", precio: 5500.00, imagen: "https://example.com/burger1.jpg", estado: "disponible" },
      { nombre: "Papas Fritas Grandes", descripcion: "Porción grande 300g", precio: 3200.00, imagen: "https://example.com/fries.jpg", estado: "disponible" },
      { nombre: "Gaseosa Cola 500ml", descripcion: "Bebida fría", precio: 1800.00, imagen: "https://example.com/cola.jpg", estado: "disponible" },
    ], { returning: true });
    console.log(`Productos: ${productos.length}`);

    // 3. CategoriaProducto (relacionar 3)
    await CategoriaProducto.bulkCreate([
      { id_producto: productos[0].id_producto, id_categoria: categorias[0].id_categoria },
      { id_producto: productos[1].id_producto, id_categoria: categorias[1].id_categoria },
      { id_producto: productos[2].id_producto, id_categoria: categorias[2].id_categoria },
    ]);
    console.log("CategoriaProducto: 3 relaciones");

    // 4. Sucursales (3)
    const sucursales = await Sucursal.bulkCreate([
      { nombre: "Centro", estado: "activa", telefono: "1140001111", horario: "10:00-23:00", calle: "Av. Rivadavia", altura: "1000", ciudad: "CABA", provincia: "Buenos Aires", latitud: -34.6083, longitud: -58.3712 },
      { nombre: "Palermo", estado: "activa", telefono: "1140002222", horario: "11:00-00:00", calle: "Av. Santa Fe", altura: "3200", ciudad: "CABA", provincia: "Buenos Aires", latitud: -34.5885, longitud: -58.4120 },
      { nombre: "Morón", estado: "activa", telefono: "1140003333", horario: "10:00-22:00", calle: "Belgrano", altura: "500", ciudad: "Morón", provincia: "Buenos Aires", latitud: -34.6500, longitud: -58.6200 },
    ], { returning: true });
    console.log(`Sucursales: ${sucursales.length}`);

    // 5. ProductoSucursal (stock) - 3*3 combinaciones pero limitado a 3 ejemplos según consigna: creamos 3 registros
    // Para demostrar funcionalidad usamos 3 stocks significativos
    await ProductoSucursal.bulkCreate([
      { id_producto: productos[0].id_producto, id_sucursal: sucursales[0].id_sucursal, stock: 50 },
      { id_producto: productos[1].id_producto, id_sucursal: sucursales[0].id_sucursal, stock: 30 },
      { id_producto: productos[2].id_producto, id_sucursal: sucursales[1].id_sucursal, stock: 100 },
    ]);
    console.log("ProductoSucursal: 3 registros de stock");

    // 6. Clientes (3) - necesario para pedidos
    const clientes = await Cliente.bulkCreate([
      { nombre: "Juan", apellido: "Pérez", tipo_doc: "DNI", dni: "30111222", email: "juan.perez@example.com", password: "hashed_password_1" },
      { nombre: "María", apellido: "Gómez", tipo_doc: "DNI", dni: "30222333", email: "maria.gomez@example.com", password: "hashed_password_2" },
      { nombre: "Carlos", apellido: "López", tipo_doc: "DNI", dni: "30333444", email: "carlos.lopez@example.com", password: "hashed_password_3" },
    ], { returning: true });
    console.log(`Clientes: ${clientes.length}`);

    // 7. Direcciones (3) - una por cliente
    const direcciones = await Direccion.bulkCreate([
      { calle: "Mitre", altura: "123", ciudad: "Morón", provincia: "Buenos Aires", latitud: -34.6510, longitud: -58.6210, id_cliente: clientes[0].id_cliente },
      { calle: "Corrientes", altura: "1500", ciudad: "CABA", provincia: "Buenos Aires", latitud: -34.6037, longitud: -58.3816, id_cliente: clientes[1].id_cliente },
      { calle: "Santa Fe", altura: "2500", piso: "2", departamento: "B", ciudad: "CABA", provincia: "Buenos Aires", latitud: -34.5880, longitud: -58.4100, id_cliente: clientes[2].id_cliente },
    ], { returning: true });
    console.log(`Direcciones: ${direcciones.length}`);

    // 8. Pedidos (3) - importes se calcularán como SUM(cantidad*precio) de DetallePedido
    // Se crean inicialmente en 0 y luego se actualizan tras insertar detalles para garantizar consistencia
    const pedidos = await Pedido.bulkCreate([
      { importe: 0, estado: "Pendiente", id_cliente: clientes[0].id_cliente, id_sucursal: sucursales[0].id_sucursal, id_direccion: direcciones[0].id_direccion },
      { importe: 0, estado: "Confirmado", id_cliente: clientes[1].id_cliente, id_sucursal: sucursales[1].id_sucursal, id_direccion: direcciones[1].id_direccion },
      { importe: 0, estado: "Entregado", id_cliente: clientes[2].id_cliente, id_sucursal: sucursales[1].id_sucursal, id_direccion: direcciones[2].id_direccion },
    ], { returning: true });
    console.log(`Pedidos: ${pedidos.length}`);

    // 9. DetallePedido (3) - uno por pedido; precio = snapshot de Producto.precio
    const detallesData = [
      { id_pedido: pedidos[0].id_pedido, id_producto: productos[0].id_producto, cantidad: 1, precio: 5500.00, observaciones: "Sin cebolla" }, // 1*5500=5500
      { id_pedido: pedidos[1].id_pedido, id_producto: productos[1].id_producto, cantidad: 1, precio: 3200.00, observaciones: null }, // 1*3200=3200
      { id_pedido: pedidos[2].id_pedido, id_producto: productos[2].id_producto, cantidad: 2, precio: 1800.00, observaciones: "Bien fría" }, // 2*1800=3600
    ];
    await DetallePedido.bulkCreate(detallesData);
    console.log("DetallePedido: 3");

    // Recalcular importe = SUM(cantidad*precio) por pedido y actualizar
    for (const pedido of pedidos) {
      const detalles = detallesData.filter(d => d.id_pedido === pedido.id_pedido);
      const importe = detalles.reduce((sum, d) => sum + d.cantidad * parseFloat(d.precio), 0);
      await pedido.update({ importe });
      console.log(`Pedido ${pedido.id_pedido} importe recalculado: ${importe} (validado: SUM cantidad*precio)`);
    }

    // 10. HistorialPedido (3) - uno por pedido inicial + extra para demostrar evolución
    await HistorialPedido.bulkCreate([
      { id_pedido: pedidos[0].id_pedido, estado: "Pendiente", fecha_hora: new Date() },
      { id_pedido: pedidos[1].id_pedido, estado: "Confirmado", fecha_hora: new Date() },
      { id_pedido: pedidos[2].id_pedido, estado: "Entregado", fecha_hora: new Date() },
    ]);
    console.log("HistorialPedido: 3");

    // 11. Producto_Pedido (§5.15) - tabla intermedia simple Producto N:M Pedido (<=3)
    await ProductoPedido.bulkCreate([
      { id_producto: productos[0].id_producto, id_pedido: pedidos[0].id_pedido },
      { id_producto: productos[1].id_producto, id_pedido: pedidos[1].id_pedido },
      { id_producto: productos[2].id_producto, id_pedido: pedidos[2].id_pedido },
    ]);
    console.log("Producto_Pedido: 3");

    // 12. Opcionales (≤3 por producto, máx 3 totales para demo)
    const opcionales = await Opcional.bulkCreate([
      { nombre: "Extra queso", descripcion: "Porción extra de queso", precio: 500.00, id_producto: productos[0].id_producto },
      { nombre: "Extra cheddar", descripcion: "Cheddar extra", precio: 400.00, id_producto: productos[1].id_producto },
      { nombre: "Hielo extra", descripcion: "Más hielo", precio: 0.00, id_producto: productos[2].id_producto },
    ], { returning: true });
    console.log(`Opcionales: ${opcionales.length}`);

    // 13. Empleado administrador (para selección admin en frontend)
    await Empleado.bulkCreate([
      { nombre: "Admin", apellido: "Principal", rol: "ADMIN", email: "admin@altoque.com", password: "hashed_admin", id_sucursal: sucursales[0].id_sucursal },
    ]);
    console.log("Empleados: 1 (admin)");

    // 14. Ejemplo de opcionales en un pedido (pedido 1, detalle 1 con extra queso)
    const detalle1 = await DetallePedido.findOne({ where: { id_pedido: pedidos[0].id_pedido } });
    // Actualizar precio del detalle para incluir opcional (5500 + 500 = 6000) y recalcular importe
    await detalle1.update({ precio: 6000.00 });
    await DetallePedidoOpcional.create({ id_detalle: detalle1.id_detalle, id_opcional: opcionales[0].id_opcional, precio: opcionales[0].precio });
    // Recalcular importe pedido 1: 1*6000=6000
    await pedidos[0].update({ importe: 6000.00 });
    console.log(`Pedido ${pedidos[0].id_pedido} actualizado con opcional ${opcionales[0].nombre} -> importe 6000`);

    // 15. Promociones (§5.16, máx 3 para demo, vía service con transacción)
    await promocionService.crearPromocion({
      nombre: "Combo Bajón",
      descripcion: "2 hamburguesas + papas + 2 gaseosas",
      tipo: "PRECIO_FIJO",
      valor: 12000,
      fecha_inicio: "2026-01-01",
      fecha_fin: "2027-12-31",
      activa: true,
      productos: [
        { id_producto: productos[0].id_producto, cantidad: 2 },
        { id_producto: productos[1].id_producto, cantidad: 1 },
        { id_producto: productos[2].id_producto, cantidad: 2 },
      ],
    });
    await promocionService.crearPromocion({
      nombre: "2x1 Papas Grandes",
      descripcion: "Llevás 2, pagás 1",
      tipo: "DOS_POR_UNO",
      valor: 0,
      fecha_inicio: "2026-01-01",
      fecha_fin: "2027-12-31",
      activa: true,
      productos: [{ id_producto: productos[1].id_producto, cantidad: 2 }],
    });
    await promocionService.crearPromocion({
      nombre: "15% Hamburguesa",
      descripcion: "Descuento desactivado de ejemplo",
      tipo: "PORCENTAJE",
      valor: 15,
      fecha_inicio: "2026-01-01",
      fecha_fin: "2027-12-31",
      activa: false,
      productos: [{ id_producto: productos[0].id_producto, cantidad: 1 }],
    });
    console.log("Promociones: 3");

    console.log("Seed completado exitosamente (<=3 por tabla)");
    process.exit(0);
  } catch (err) {
    console.error("Error en seed:", err);
    process.exit(1);
  }
}

seed();
