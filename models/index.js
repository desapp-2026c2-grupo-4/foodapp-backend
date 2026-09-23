const sequelize = require("../config/database");
const Cliente = require("./Cliente");
const Direccion = require("./Direccion");
const Sucursal = require("./Sucursal");
const Categoria = require("./Categoria");
const Producto = require("./Producto");
const CategoriaProducto = require("./CategoriaProducto");
const ProductoSucursal = require("./ProductoSucursal");
const Pedido = require("./Pedido");
const DetallePedido = require("./DetallePedido");
const HistorialPedido = require("./HistorialPedido");
const ProductoPedido = require("./ProductoPedido");
const Empleado = require("./Empleado");
const Opcional = require("./Opcional");
const DetallePedidoOpcional = require("./DetallePedidoOpcional");
const Promocion = require("./Promocion");
const PromocionProducto = require("./PromocionProducto");

// Cliente 1:N Direccion
Cliente.hasMany(Direccion, { foreignKey: "id_cliente", as: "direcciones" });
Direccion.belongsTo(Cliente, { foreignKey: "id_cliente", as: "cliente" });

// Cliente 1:N Pedido
Cliente.hasMany(Pedido, { foreignKey: "id_cliente", as: "pedidos" });
Pedido.belongsTo(Cliente, { foreignKey: "id_cliente", as: "cliente" });

// Direccion 1:N Pedido
Direccion.hasMany(Pedido, { foreignKey: "id_direccion", as: "pedidos" });
Pedido.belongsTo(Direccion, { foreignKey: "id_direccion", as: "direccion" });

// Sucursal 1:N Pedido
Sucursal.hasMany(Pedido, { foreignKey: "id_sucursal", as: "pedidos" });
Pedido.belongsTo(Sucursal, { foreignKey: "id_sucursal", as: "sucursal" });

// Producto N:M Categoria via CategoriaProducto
Producto.belongsToMany(Categoria, {
  through: CategoriaProducto,
  foreignKey: "id_producto",
  otherKey: "id_categoria",
  as: "categorias",
});
Categoria.belongsToMany(Producto, {
  through: CategoriaProducto,
  foreignKey: "id_categoria",
  otherKey: "id_producto",
  as: "productos",
});

// Producto N:M Sucursal via ProductoSucursal (stock)
Producto.belongsToMany(Sucursal, {
  through: ProductoSucursal,
  foreignKey: "id_producto",
  otherKey: "id_sucursal",
  as: "sucursales",
});
Sucursal.belongsToMany(Producto, {
  through: ProductoSucursal,
  foreignKey: "id_sucursal",
  otherKey: "id_producto",
  as: "productos",
});

// Pedido 1:N DetallePedido
Pedido.hasMany(DetallePedido, { foreignKey: "id_pedido", as: "detalles" });
DetallePedido.belongsTo(Pedido, { foreignKey: "id_pedido", as: "pedido" });

// Producto 1:N DetallePedido
Producto.hasMany(DetallePedido, { foreignKey: "id_producto", as: "detallesPedido" });
DetallePedido.belongsTo(Producto, { foreignKey: "id_producto", as: "producto" });

// Pedido 1:N HistorialPedido
Pedido.hasMany(HistorialPedido, { foreignKey: "id_pedido", as: "historial" });
HistorialPedido.belongsTo(Pedido, { foreignKey: "id_pedido", as: "pedido" });

// Producto N:M Pedido via Producto_Pedido (§5.15 AGENTS.md)
// Mantiene DetallePedido (§5.6) para historial con precio/cantidad/observaciones
Producto.belongsToMany(Pedido, {
  through: ProductoPedido,
  foreignKey: "id_producto",
  otherKey: "id_pedido",
  as: "pedidosProductoPedido",
});
Pedido.belongsToMany(Producto, {
  through: ProductoPedido,
  foreignKey: "id_pedido",
  otherKey: "id_producto",
  as: "productosProductoPedido",
});

// Empleado N:1 Sucursal
Empleado.belongsTo(Sucursal, { foreignKey: "id_sucursal", as: "sucursal" });
Sucursal.hasMany(Empleado, { foreignKey: "id_sucursal", as: "empleados" });

// Producto 1:N Opcional (opcionales configurables por producto)
Producto.hasMany(Opcional, { foreignKey: "id_producto", as: "opcionales" });
Opcional.belongsTo(Producto, { foreignKey: "id_producto", as: "producto" });

// DetallePedido 1:N DetallePedidoOpcional (opcionales seleccionados + snapshot precio)
DetallePedido.hasMany(DetallePedidoOpcional, { foreignKey: "id_detalle", as: "opciones" });
DetallePedidoOpcional.belongsTo(DetallePedido, { foreignKey: "id_detalle", as: "detalle" });

// Opcional 1:N DetallePedidoOpcional
Opcional.hasMany(DetallePedidoOpcional, { foreignKey: "id_opcional", as: "detallesUso" });
DetallePedidoOpcional.belongsTo(Opcional, { foreignKey: "id_opcional", as: "opcional" });

// Producto N:M Promocion via PromocionProducto (§5.16 AGENTS.md, promociones globales)
Producto.belongsToMany(Promocion, {
  through: PromocionProducto,
  foreignKey: "id_producto",
  otherKey: "id_promocion",
  as: "promociones",
});
Promocion.belongsToMany(Producto, {
  through: PromocionProducto,
  foreignKey: "id_promocion",
  otherKey: "id_producto",
  as: "productos",
});

// DetallePedido N:1 Promocion (líneas generadas por una promo conservan su origen §5.16)
DetallePedido.belongsTo(Promocion, { foreignKey: "id_promocion", as: "promocion" });
Promocion.hasMany(DetallePedido, { foreignKey: "id_promocion", as: "detallesUso" });

module.exports = {
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
  Promocion,
  PromocionProducto,
};
