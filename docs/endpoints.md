# Endpoints — Foodapp Backend

Base URL: `http://localhost:3000` (producción via `PORT` en `.env`)
Prefijo API: `/api` — Endpoints REST sin duplicar por rol (`AGENTS.md §8`).

Cliente frontend: `foodapp-frontend/src/services/api.js` (`VITE_API_URL` → `http://localhost:3000/api`) con wrapper `apiFetch` que agrega `Content-Type: application/json` y parsea `{error}`.

> Todos los endpoints devuelven JSON. Errores con `{error: "mensaje"}` y middleware `middlewares/errorMiddleware.js`. Montaje en `index.js:44-46` con `helmet` + `cors` + `express.json()`.

---

## Utilidad / Health

| Método | Ruta | Descripción | Request | Response 200 | Errores |
|--------|------|-------------|---------|--------------|---------|
| GET | `/` | Check básico | — | `La app funciona` (text) | — |
| GET | `/db-test` | Verifica Pool `pg` | — | `{mensaje:"Conexión OK", data:[{ok:1}]}` | `500 {mensaje, error}` |
| GET | `/health` | Verifica Sequelize | — | `{status:"ok", db:"connected"}` | `500 {status:"error", error}` |

---

## Productos — `/api/productos` (`routes/productoRoutes.js`, `controllers/productoController.js`)

Modelo: `Producto(id_producto, nombre, descripcion, precio, imagen, estado)` (`models/Producto.js`) + relaciones `Categoria N:M` y `Sucursal N:M (stock)`.

| Método | Ruta | Descripción | Body / Params | Response | Códigos |
|--------|------|-------------|---------------|----------|---------|
| GET | `/api/productos` | Lista todos con categorías y sucursales con stock | — | `[{id_producto, nombre, descripcion, precio, imagen, estado, createdAt, updatedAt, categorias:[{id_categoria,nombre}], sucursales:[{..., ProductoSucursal:{stock}}]}]` | 200 |
| GET | `/api/productos/:id` | Detalle por id con relaciones | `id` param | mismo objeto que arriba o `404` | 200 / 404 `{error:"Producto no encontrado"}` |
| POST | `/api/productos` | Crea producto (empleado/admin) | `{nombre* , precio* , descripcion?, imagen?, estado? (disponible|no_disponible|pausado), categorias?:[id_categoria]}` | `201` producto creado con `categorias` y `sucursales` | 201 / 400 `nombre y precio son obligatorios` / 400 validación Sequelize |
| PUT | `/api/productos/:id` | Actualiza campos permitidos | `id` param + `{nombre?, descripcion?, precio?, imagen?, estado?}` (al menos uno) | producto actualizado con includes | 200 / 400 `No se enviaron campos...` / 404 |
| DELETE | `/api/productos/:id` | Elimina producto | `id` param | `{mensaje:"Producto eliminado"}` | 200 / 404 / 409 `{error:"No se puede eliminar producto con pedidos asociados"}` (FK `detalle_pedidos` RESTRICT) |

**Ejemplo POST**
```bash
curl -X POST http://localhost:3000/api/productos \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Hamburguesa Doble","precio":7500,"estado":"disponible","categorias":[1]}'
```

**Uso frontend:** `CatalogPage.jsx` → `productService.getProductos()` → `GET /productos` para catálogo; `ProductCard` usa `precio` y `estado`.

---

## Sucursales — `/api/sucursales` (`routes/sucursalRoutes.js`, `controllers/sucursalController.js`)

Modelo: `Sucursal(id_sucursal, nombre, estado, telefono, horario, calle, altura, ciudad, provincia, latitud, longitud)` (`models/Sucursal.js`) con dirección embebida (`AGENTS.md §5.8`).

| Método | Ruta | Descripción | Body / Params | Response | Códigos |
|--------|------|-------------|---------------|----------|---------|
| GET | `/api/sucursales` | Lista con productos y stock | — | `[{id_sucursal, nombre, estado, telefono, horario, calle, altura, ciudad, provincia, latitud, longitud, productos:[{..., ProductoSucursal:{stock}}]}]` | 200 |
| GET | `/api/sucursales/:id` | Detalle con productos | `id` param | mismo objeto o `404` | 200 / 404 `{error:"Sucursal no encontrada"}` |
| POST | `/api/sucursales` | Crea sucursal | `{nombre*, calle*, altura*, ciudad*, provincia*, estado? (activa|inactiva|cerrada), telefono?, horario?, latitud?, longitud?}` | `201` sucursal con `productos` | 201 / 400 `nombre, calle, altura, ciudad y provincia son obligatorios` |
| PUT | `/api/sucursales/:id` | Actualiza campos permitidos | `id` + `{nombre?, estado?, telefono?, horario?, calle?, altura?, ciudad?, provincia?, latitud?, longitud?}` | sucursal actualizada | 200 / 400 / 404 |
| DELETE | `/api/sucursales/:id` | Elimina (si no tiene pedidos/productos) | `id` | `{mensaje:"Sucursal eliminada"}` | 200 / 404 / 409 |

**Ejemplo POST**
```bash
curl -X POST http://localhost:3000/api/sucursales \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Test Sur","calle":"Av Test","altura":"999","ciudad":"CABA","provincia":"Buenos Aires","estado":"activa"}'
```

---

## Pedidos — `/api/pedidos` (`routes/pedidoRoutes.js`, `controllers/pedidoController.js`)

Modelo: `Pedido(id_pedido, fecha_hora, importe, estado, id_cliente, id_sucursal, id_direccion)` + `DetallePedido(id_detalle, id_pedido, id_producto, cantidad, precio, observaciones)` (precio snapshot) + `HistorialPedido(id_historial, id_pedido, estado, fecha_hora)` + `Producto_Pedido(id_producto_pedido, id_pedido, id_producto)` (§5.15) + relaciones `Cliente`, `Direccion`, `Sucursal`, `Producto`.

| Método | Ruta | Descripción | Body / Params | Response | Códigos |
|--------|------|-------------|---------------|----------|---------|
| GET | `/api/pedidos` | Lista todos con cliente, sucursal, direccion, detalles+producto, historial | — | `[{id_pedido, fecha_hora, importe, estado, cliente:{id_cliente,nombre,apellido,email}, sucursal, direccion, detalles:[{id_detalle, cantidad, precio, observaciones, producto}], historial:[{id_historial, estado, fecha_hora}]}]` | 200 |
| GET | `/api/pedidos/:id` | Detalle completo por id | `id` param | mismo objeto que arriba | 200 / 404 `{error:"Pedido no encontrado"}` |
| GET | `/api/pedidos/:id/detalles` | Solo detalles + verificación importe | `id` param | `{id_pedido, importe, importeCalculado: SUM(cantidad*precio), detalles:[{..., producto}]}` | 200 / 404 |
| POST | `/api/pedidos` | Crea pedido con transacción (carrito → pedido) | `{id_cliente*, id_direccion*, id_sucursal?, estado? (default Pendiente), detalles*: [{id_producto*, cantidad* (>=1), observaciones?}]}` | `201` pedido creado con includes + `importe = SUM(cantidad*precio)` y `Producto_Pedido` + `HistorialPedido` | 201 / 400 `id_cliente, id_direccion y detalles son obligatorios` / 400 `La dirección no pertenece al cliente` / 404 `Cliente/Direccion/Sucursal/Producto no encontrado` |
| PUT | `/api/pedidos/:id` | Actualiza estado/sucursal/importe (empleado) | `id` + `{estado?, id_sucursal?, importe?}` (al menos uno). `estado` en `Pendiente|Confirmado|Preparando|Listo|En camino|Entregado|Cancelado`. Si `estado` cambia crea `HistorialPedido`; `importe` se autocorrige a `SUM(cantidad*precio)` vía `services/pedidoService.js` | pedido actualizado con includes | 200 / 400 / 404 |
| DELETE | `/api/pedidos/:id` | Elimina con CASCADE (detalles, historial, producto_pedido) | `id` | `{mensaje:"Pedido eliminado"}` | 200 / 404 |

**Ejemplo POST (confirmar carrito desde `CartContext.jsx:32`)**
```bash
curl -X POST http://localhost:3000/api/pedidos \
  -H "Content-Type: application/json" \
  -d '{
    "id_cliente":1,
    "id_direccion":1,
    "id_sucursal":1,
    "detalles":[
      {"id_producto":1,"cantidad":2,"observaciones":"Sin tomate"},
      {"id_producto":3,"cantidad":1}
    ]
  }'
# -> 201 {"id_pedido":4,"importe":"12800.00","estado":"Pendiente", "detalles":[...], "historial":[...]}
# importe = 2*5500 + 1*1800 = 12800
```

**Ejemplo PUT (empleado cambia estado)**
```bash
curl -X PUT http://localhost:3000/api/pedidos/4 \
  -H "Content-Type: application/json" \
  -d '{"estado":"Confirmado"}'
# o
curl -X PUT http://localhost:3000/api/pedidos/4 -d '{"estado":"En camino"}'
# Frontend: EmployeeOrderDetailPage.jsx usa updatePedidoEstado() -> PUT /pedidos/:id
```

**Ejemplo GET detalle**
```bash
curl http://localhost:3000/api/pedidos/3      # completo
curl http://localhost:3000/api/pedidos/3/detalles # solo detalles + importeCalculado (verifica 2*1800=3600)
```

**Uso frontend:**
- Cliente: `CartPage.jsx` → `CartContext.confirmCart` → `POST /pedidos` → `OrderConfirmation.jsx` modal.
- Empleado: `EmployeeOrdersPage.jsx` → `GET /pedidos` (tabla con N° pedido, productos y cantidades, importe, dirección, estado, fecha); `EmployeeOrderDetailPage.jsx` → `GET /pedidos/:id` (detalle: N° pedido, productos, importe, dirección, estado, fecha) + botones para `PUT` a `Pendiente, Confirmado, Preparando (En preparación), En camino, Entregado`.

---

## Notas comunes

- **Content-Type:** `application/json` en POST/PUT.
- **Variables:** `foodapp-frontend/.env` → `VITE_API_URL`; `foodapp-backend/.env` → `DATABASE_URL`, `PORT`.
- **Errores Sequelize:** validación/único → `400 {error: "mensajes"}`, FK → `409` en DELETE productos/sucursales.
- **Sin autenticación aún:** rutas abiertas (empleados sin login por requerimiento actual, `AGENTS.md §7` pendiente JWT/bcrypt).
