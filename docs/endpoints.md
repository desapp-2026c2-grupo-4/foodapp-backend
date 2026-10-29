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

Modelo: `Producto(id_producto, nombre, descripcion, precio, imagen, estado)` (`models/Producto.js`) + relaciones `Categoria N:M` y `MateriaPrima N:M (receta: cantidad por unidad)`.

| Método | Ruta | Descripción | Body / Params | Response | Códigos |
|--------|------|-------------|---------------|----------|---------|
| GET | `/api/productos` | Lista todos con categorías, receta y opcionales | — | `[{id_producto, nombre, descripcion, precio, imagen, estado, createdAt, updatedAt, categorias:[{id_categoria,nombre}], materiasPrimas:[{id_materia_prima,nombre, ProductoMateriaPrima:{cantidad}}], opcionales:[...]}]` | 200 |
| GET | `/api/productos/:id` | Detalle por id con relaciones | `id` param | mismo objeto que arriba o `404` | 200 / 404 `{error:"Producto no encontrado"}` |
| GET | `/api/productos/:id/stock` | Stock derivado de la receta en una sucursal | `id` param + query `sucursal*` | `{id_producto, id_sucursal, stock}` (`min(floor(stock_materia/cantidad_receta))`, 0 si no tiene receta) | 200 / 400 sin `sucursal` / 404 |
| POST | `/api/productos` | Crea producto (empleado/admin) | `{nombre* , precio* , descripcion?, imagen?, estado? (disponible|no_disponible|pausado), categorias?:[id_categoria], materiasPrimas?:[{id_materia_prima, cantidad>=1}]}` | `201` producto creado con includes | 201 / 400 `nombre y precio son obligatorios` / 400 receta inválida / 404 |
| PUT | `/api/productos/:id` | Actualiza campos permitidos (reemplaza categorías y receta si se envían) | `id` param + `{nombre?, descripcion?, precio?, imagen?, estado?, categorias?, materiasPrimas?}` (al menos uno) | producto actualizado con includes | 200 / 400 `No se enviaron campos...` / 400 receta inválida / 404 |
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

Modelo: `Sucursal(id_sucursal, nombre, estado, telefono, calle, altura, ciudad, provincia, latitud, longitud, radio_km)` (`models/Sucursal.js`) con dirección embebida (`AGENTS.md §5.8`) + `SucursalHorario(id_horario, id_sucursal, dia_semana, hora_apertura, hora_cierre)` (`models/SucursalHorario.js`).

- `radio_km`: radio de cobertura en kilómetros. Default `2.00`; rango permitido `0.1–100`. Se usa para la autoasignación y para validar una sucursal explícita.
- `dia_semana`: 1 = lunes … 7 = domingo.
- `hora_apertura`/`hora_cierre`: `HH:MM` (se almacenan como `TIME`). Si el cierre es menor o igual a la apertura, el rango cruza la medianoche (ej. `20:00–02:00`).
- Sin horarios cargados ⇒ la sucursal se considera **abierta siempre**.
- `abierta_ahora` se calcula en cada respuesta: `estado === "activa"` y el horario actual dentro del rango (zona `SCHEDULE_TIMEZONE`, por defecto `America/Argentina/Buenos_Aires`). No se persiste.

| Método | Ruta | Descripción | Body / Params | Response | Códigos |
|--------|------|-------------|---------------|----------|---------|
| GET | `/api/sucursales` | Lista con materias primas, stock y horarios | — | `[{id_sucursal, nombre, estado, telefono, calle, altura, ciudad, provincia, codigo_postal, latitud, longitud, radio_km, horarios:[{id_horario, dia_semana, hora_apertura, hora_cierre}], abierta_ahora, materiasPrimas:[{id_materia_prima, nombre, MateriaPrimaSucursal:{stock}}]}]` | 200 |
| GET | `/api/sucursales/:id` | Detalle con horarios y materias primas | `id` param | mismo objeto o `404` | 200 / 404 `{error:"Sucursal no encontrada"}` |
| POST | `/api/sucursales` | Crea sucursal y sus horarios | `{nombre*, calle*, altura*, ciudad*, provincia*, estado? (activa|inactiva|cerrada), telefono?, horarios?: [{dia_semana* (1-7), hora_apertura* (HH:MM), hora_cierre* (HH:MM)}], codigo_postal?, latitud?, longitud?, radio_km? (0.1-100, default 2)}` | `201` sucursal con `horarios`, `abierta_ahora` y materias primas | 201 / 400 Joi (`nombre, calle, altura, ciudad y provincia son obligatorios`; días duplicados; apertura = cierre; radio fuera de rango) |
| PUT | `/api/sucursales/:id` | Actualiza campos permitidos; si llega `horarios` reemplaza todos | `id` + `{nombre?, estado?, telefono?, horarios?, calle?, altura?, ciudad?, provincia?, codigo_postal?, latitud?, longitud?, radio_km?}` | sucursal actualizada | 200 / 400 / 404 |
| DELETE | `/api/sucursales/:id` | Elimina (si no tiene pedidos/productos) | `id` | `{mensaje:"Sucursal eliminada"}` | 200 / 404 / 409 |

**Ejemplo POST**
```bash
curl -X POST http://localhost:3000/api/sucursales \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Test Sur","calle":"Av Test","altura":"999","ciudad":"CABA","provincia":"Buenos Aires","estado":"activa","radio_km":2,"horarios":[{"dia_semana":1,"hora_apertura":"10:00","hora_cierre":"23:00"},{"dia_semana":2,"hora_apertura":"10:00","hora_cierre":"23:00"}]}'
```

---

## Pedidos — `/api/pedidos` (`routes/pedidoRoutes.js`, `controllers/pedidoController.js`)

Modelo: `Pedido(id_pedido, fecha_hora, importe, estado, id_cliente, id_sucursal, id_direccion)` + `DetallePedido(id_detalle, id_pedido, id_producto, cantidad, precio, observaciones)` (precio snapshot) + `HistorialPedido(id_historial, id_pedido, estado, fecha_hora)` + `Producto_Pedido(id_producto_pedido, id_pedido, id_producto)` (§5.15) + relaciones `Cliente`, `Direccion`, `Sucursal`, `Producto`.

| Método | Ruta | Descripción | Body / Params | Response | Códigos |
|--------|------|-------------|---------------|----------|---------|
| GET | `/api/pedidos` | Lista todos con cliente, sucursal, direccion, detalles+producto, historial. Filtros opcionales `?id_cliente=` y `?id_sucursal=` (empleados ven solo su sucursal) | query opcional | `[{id_pedido, fecha_hora, importe, estado, cliente:{id_cliente,nombre,apellido,email}, sucursal, direccion, detalles:[{id_detalle, cantidad, precio, observaciones, producto}], historial:[{id_historial, estado, fecha_hora}]}]` | 200 |
| GET | `/api/pedidos/:id` | Detalle completo por id | `id` param | mismo objeto que arriba | 200 / 404 `{error:"Pedido no encontrado"}` |
| GET | `/api/pedidos/:id/detalles` | Solo detalles + verificación importe | `id` param | `{id_pedido, importe, importeCalculado: SUM(cantidad*precio), detalles:[{..., producto}]}` | 200 / 404 |
| POST | `/api/pedidos` | Crea pedido con transacción (carrito → pedido) | `{id_cliente*, id_direccion*, id_sucursal?, estado? (default Pendiente), detalles*: [{id_producto XOR id_promocion, cantidad* (>=1), observaciones?, opcionales?}]}`. Item con `id_promocion`: se valida vigencia y se expande en líneas (`DetallePedido` con `id_promocion` + precio promocional distribuido al centavo). **Asignación de sucursal:** si no se envía `id_sucursal`, el backend asigna la sucursal **activa y abierta en ese momento**, **dentro de su `radio_km`** y más cercana a la dirección (Haversine) con stock suficiente para todo el pedido (`services/sucursalService.js`); si ninguna cumple → 409. Si se envía `id_sucursal`, se valida que exista, esté `activa`, abierta según sus horarios y dentro de su radio de cobertura; el stock se valida al descontar. Si no cumple → 400/409 (no se aplica cercanía) | `201` pedido creado con includes (`detalles[].promocion`, `sucursal` asignada) + `importe = SUM(cantidad*precio)` y `Producto_Pedido` + `HistorialPedido` + descuento de stock de la sucursal | 201 / 400 `id_cliente, id_direccion y detalles son obligatorios` / 400 `La dirección no pertenece al cliente` / 400 promo no vigente / 400 dirección sin coordenadas / 404 `Cliente/Direccion/Sucursal/Producto/Promoción no encontrado` / 409 stock insuficiente, sucursal fuera de radio o sucursal explícita no habilitada/fuera de horario (rollback total) |
| PUT | `/api/pedidos/:id` | Actualiza estado/importe (empleado). La sucursal no se puede modificar después de crear el pedido: enviar `id_sucursal` devuelve 400 | `id` + `{estado?, importe?}` (al menos uno). `estado` en `Pendiente|Confirmado|Preparando|Listo|En camino|Entregado|Cancelado`. Si `estado` cambia crea `HistorialPedido`; `importe` se autocorrige a `SUM(cantidad*precio)` vía `services/pedidoService.js`. **Flujo en un solo sentido:** `Pendiente → Confirmado → Preparando → En camino → Entregado` — solo se permite avanzar al estado siguiente inmediato, sin volver atrás (`400 {error:"Transición no permitida..."}` en caso contrario). **Cancelación:** `Cancelado` es terminal (no admite más cambios, `400`) y no se puede cancelar un pedido `Entregado` (`400`); el cliente cancela desde Mis pedidos | pedido actualizado con includes | 200 / 400 / 404 |
| PUT | `/api/pedidos/:id/detalles/:idDetalle` | Confirma item en preparación (empleado). Si todos los items quedan preparados, el pedido avanza solo a `En camino` + `HistorialPedido` | `{preparado*: boolean}` (solo válido si el pedido está en `Preparando`) | `{id_detalle, preparado, pedidoAvanzadoA: "En camino" \| null}` | 200 / 400 / 404 |
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
# id_sucursal es opcional; si se envía debe existir, estar activa, abierta y dentro de su radio_km (si no, 409)
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

## Promociones — `/api/promociones` (`routes/promocionRoutes.js`, `controllers/promocionController.js`, `services/promocionService.js`)

Modelo: `Promocion(id_promocion, nombre, descripcion, tipo, valor, fecha_inicio, fecha_fin, activa)` + `Promocion_Producto(id_promocion_producto, id_promocion, id_producto, cantidad)` (§5.16). Tipos: `PRECIO_FIJO` (precio final del conjunto), `PORCENTAJE` (0–100 % descuento), `DOS_POR_UNO` (de cada par se paga 1). Promociones globales (sin `Promocion_Sucursal`). Lógica en `promocionService` con transacciones; `GET` agrega `vigente` (activa + dentro de vigencia).

**Contrato de fechas:** `fecha_inicio` y `fecha_fin` se envían y devuelven como `YYYY-MM-DD`, sin hora ni offset. `fecha_hora` de pedidos e historial se serializa en ISO 8601 UTC. La UI muestra fechas como `DD/MM/YYYY` y fecha/hora como `DD/MM/YYYY HH:mm` (24 h, `America/Argentina/Buenos_Aires`).

| Método | Ruta | Descripción | Body / Params | Response | Códigos |
|--------|------|-------------|---------------|----------|---------|
| GET | `/api/promociones` | Lista con productos y cantidades | — | `[{id_promocion, nombre, descripcion, tipo, valor, fecha_inicio, fecha_fin, activa, vigente, productos:[{..., PromocionProducto:{cantidad}}]}]` | 200 |
| GET | `/api/promociones/:id` | Detalle con productos | `id` param | mismo objeto que arriba | 200 / 404 `{error:"Promoción no encontrada"}` |
| POST | `/api/promociones` | Crea con transacción (admin) | `{nombre*, tipo* (PRECIO_FIJO\|PORCENTAJE\|DOS_POR_UNO), valor*, fecha_inicio* (YYYY-MM-DD), fecha_fin* (YYYY-MM-DD), descripcion?, activa? (default true), productos*: [{id_producto*, cantidad* (>=1)}]}` | `201` promoción completa | 201 / 400 Joi o `fecha_fin anterior` o `PORCENTAJE fuera de 0–100` / 404 producto inexistente (ROLLBACK) |
| PUT | `/api/promociones/:id` | Modifica campos y/o reemplaza productos (admin) | `id` + parcial (al menos un campo); `productos` reemplaza el conjunto | promoción completa | 200 / 400 / 404 |
| DELETE | `/api/promociones/:id` | Elimina (cascada a `promocion_producto`) | `id` | `{mensaje:"Promoción eliminada"}` | 200 / 404 |

**Ejemplo POST (Combo Bajón de §5.16)**
```bash
curl -X POST http://localhost:3000/api/promociones \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Combo Bajón","descripcion":"2 hamburguesas + papas + gaseosas","tipo":"PRECIO_FIJO","valor":12000,"fecha_inicio":"2026-09-20","fecha_fin":"2026-10-20","productos":[{"id_producto":1,"cantidad":2},{"id_producto":2,"cantidad":1},{"id_producto":3,"cantidad":2}]}'
```

**Uso frontend:**
- Admin: `AdminPromocionesPage.jsx` → `POST/PUT/DELETE /api/promociones` (alta, modificación con reemplazo de productos, activación/desactivación, baja).

---

## Banners — `/api/banners` (`routes/bannerRoutes.js`, `controllers/bannerController.js`)

Modelo: `Banner(id_banner, titulo, descripcion, imagen, activo, orden)`. Se muestran arriba del catálogo, ordenados por `orden`.

| Método | Ruta | Descripción | Body / Params | Response | Códigos |
|--------|------|-------------|---------------|----------|---------|
| GET | `/api/banners` | Lista ordenada por `orden` (filtro `?activo=true`) | `?activo=true` opcional | `[{id_banner, titulo, descripcion, imagen, activo, orden}]` | 200 |
| GET | `/api/banners/:id` | Detalle | `id` param | mismo objeto que arriba | 200 / 404 `{error:"Banner no encontrado"}` |
| POST | `/api/banners` | Crea (admin) | `{titulo*, imagen*, descripcion?, activo? (default true), orden? (default 0)}` | `201` banner creado | 201 / 400 Joi |
| PUT | `/api/banners/:id` | Modifica (admin) | `id` + parcial (al menos un campo) | banner actualizado | 200 / 400 / 404 |
| DELETE | `/api/banners/:id` | Elimina (admin) | `id` | `{mensaje:"Banner eliminado"}` | 200 / 404 |

**Uso frontend:**
- Catálogo: `CatalogPage.jsx` → `GET /api/banners?activo=true` → `BannerCarousel.jsx` arriba de todo.
- Admin: `AdminBannersPage.jsx` → `POST/PUT/DELETE /api/banners` (alta, modificación, activación/desactivación, baja).

---

## Autenticación — `/api/auth` (`routes/authRoutes.js`, `controllers/authController.js`, `services/authService.js`)

Registro público siempre crea **CLIENTE** (tabla `clientes`, sin campo rol). Contraseñas con bcrypt (`utils/password.js`); tokens JWT (`utils/jwt.js`, `JWT_SECRET` + `JWT_EXPIRES_IN` en `.env`). Login busca primero en clientes y luego en empleados; al primer login exitoso migra contraseñas viejas en texto plano a hash.

| Método | Ruta | Descripción | Body / Params | Response | Códigos |
|--------|------|-------------|---------------|----------|---------|
| POST | `/api/auth/register` | Registro de cliente | `{nombre*, apellido*, tipo_doc?, dni?, email*, password* (mín. 6)}` (se ignora cualquier `rol` enviado) | `201 {token, user:{..., rol:"CLIENTE"}}` | 201 / 400 Joi / 409 email registrado |
| POST | `/api/auth/login` | Login clientes y empleados | `{email*, password*}` | `{token, user}` (`rol: CLIENTE` o el `rol` del empleado) | 200 / 400 Joi / 401 credenciales inválidas |

**Uso frontend:**
- `LoginPage.jsx` (`/login`) → `POST /api/auth/login` → guarda token y redirige según rol (ADMIN → `/empleados/pedidos`, resto → `/catalogo`).
- `RegisterPage.jsx` (`/registro`) → `POST /api/auth/register` → siempre CLIENTE.

---

## Empleados — `/api/empleados` (`routes/empleadoRoutes.js`, `controllers/empleadoController.js`)

Modelo: `Empleado(id_empleado, nombre, apellido, rol, email, password, id_sucursal)` con `rol` en `ADMIN|REPARTIDOR|EMPLEADO`. La contraseña nunca se expone en respuestas. ABM solo desde administración; el administrador elige el rol al crear (incluye otros administradores). El rol EMPLEADO accede a lo mismo que ADMIN **menos** el ABM de empleados.

| Método | Ruta | Descripción | Body / Params | Response | Códigos |
|--------|------|-------------|---------------|----------|---------|
| GET | `/api/empleados` | Lista con sucursal | — | `[{id_empleado, nombre, apellido, rol, email, id_sucursal, sucursal}]` | 200 |
| GET | `/api/empleados/:id` | Detalle con sucursal | `id` param | mismo objeto que arriba | 200 / 404 |
| POST | `/api/empleados` | Alta (admin) | `{nombre*, apellido*, rol* (ADMIN\|REPARTIDOR\|EMPLEADO), email?, password* (mín. 6), id_sucursal?}` | `201` empleado (sin password) | 201 / 400 Joi / 404 sucursal inexistente / 409 email registrado |
| PUT | `/api/empleados/:id` | Modificación (admin, password opcional) | parcial (al menos un campo; password vacío = no cambiar) | empleado actualizado | 200 / 400 / 404 / 409 |
| DELETE | `/api/empleados/:id` | Baja (admin) | `id` param | `{mensaje:"Empleado eliminado"}` | 200 / 404 |

**Uso frontend:**
- Admin: `AdminEmpleadosPage.jsx` (`/admin/empleados`) → `POST/PUT/DELETE /api/empleados`.

---

## Direcciones — `/api/clientes/:id/direcciones` (`routes/direccionRoutes.js`, `controllers/direccionController.js`)

Modelo: `Direccion(id_direccion, calle, altura, piso, departamento, ciudad, provincia, codigo_postal, latitud, longitud, id_cliente)`. La dirección se elige en un mapa (OpenStreetMap + Leaflet) y se guarda como latitud/longitud; calle/altura/ciudad/provincia/CP se resuelven con geocodificación inversa (Nominatim) y se muestran como `calle altura, provincia (CP ...)`.

| Método | Ruta | Descripción | Body / Params | Response | Códigos |
|--------|------|-------------|---------------|----------|---------|
| GET | `/api/clientes/:id/direcciones` | Lista del cliente | `id` param | `[{...direccion}]` | 200 / 404 cliente inexistente |
| POST | `/api/clientes/:id/direcciones` | Alta | `{calle*, altura*, piso?, departamento?, ciudad*, provincia*, codigo_postal?, latitud* (-90..90), longitud* (-180..180)}` | `201` dirección creada | 201 / 400 Joi / 404 cliente inexistente |
| DELETE | `/api/clientes/:id/direcciones/:idDireccion` | Baja (solo si es del cliente) | `id` + `idDireccion` params | `{mensaje:"Dirección eliminada"}` | 200 / 404 / 409 si se usa en pedidos |

**Uso frontend:**
- Registro: `RegisterPage.jsx` → mapa + `POST /api/clientes/:id/direcciones` tras crear la cuenta.
- Perfil: `ProfilePage.jsx` (sección Mis direcciones) → alta con mapa y baja.

---

## Materias primas — `/api/materias-primas` (`routes/materiaPrimaRoutes.js`, `controllers/materiaPrimaController.js`)

Modelo: `MateriaPrima(id_materia_prima, nombre, estado, stock_minimo)` (`models/MateriaPrima.js`, baja lógica con `deleted_at`). Cada producto define su receta vía `Producto_Materia_Prima(id_producto, id_materia_prima, cantidad)`; el stock vive en `Materia_Prima_Sucursal(id_materia_prima, id_sucursal, stock)` (`AGENTS.md §5.5`). `stock_minimo` es global por materia prima (default 0) y se compara contra el stock de cada sucursal para marcar `bajo_stock`.

| Método | Ruta | Descripción | Body / Params | Response | Códigos |
|--------|------|-------------|---------------|----------|---------|
| GET | `/api/materias-primas` | Lista materias primas | — | `[{id_materia_prima, nombre, estado, stock_minimo}]` | 200 |
| GET | `/api/materias-primas/:id` | Detalle por id | `id` param | materia prima | 200 / 404 |
| POST | `/api/materias-primas` | Crea materia prima | `{nombre*, estado? (disponible|no_disponible), stock_minimo? (entero >= 0)}` | `201` materia prima | 201 / 400 / 409 nombre duplicado |
| PUT | `/api/materias-primas/:id` | Actualiza nombre/estado/mínimo | `id` + `{nombre?, estado?, stock_minimo?}` | materia prima | 200 / 400 / 404 / 409 |
| DELETE | `/api/materias-primas/:id` | Baja lógica | `id` | `{mensaje:"Materia prima dada de baja"}` | 200 / 404 |

---

## Stock — `/api/stock` (`routes/stockRoutes.js`, `controllers/stockController.js`, `services/stockService.js`)

Modelo: `Materia_Prima_Sucursal(id_materia_prima, id_sucursal, stock)` — el stock pertenece a la combinación materia prima + sucursal. El stock de un producto es **derivado** de su receta (`min(floor(stock_materia / cantidad_receta))`); un producto sin receta no puede pedirse. Al crear un pedido se descuentan las materias primas de la receta dentro de la misma transacción (falla con 409 y hace rollback si no alcanza); al cancelar un pedido se reponen.

| Método | Ruta | Descripción | Body / Params | Response | Códigos |
|--------|------|-------------|---------------|----------|---------|
| GET | `/api/stock?sucursal=:id` | Materias primas con stock de una sucursal (0 si no hay fila) | query `sucursal*` | `[{id_materia_prima, nombre, estado, stock, stock_minimo, bajo_stock}]` | 200 / 404 sucursal inexistente |
| POST | `/api/stock` | Suma stock (crea la fila si no existe) | `{id_sucursal*, id_materia_prima*, cantidad* (entero >= 1)}` | `{id_sucursal, id_materia_prima, nombre, stock, stock_minimo, bajo_stock}` | 200 / 400 Joi o cantidad inválida / 404 sucursal o materia prima inexistente |

`bajo_stock` es `true` cuando `stock_minimo > 0 && stock < stock_minimo`.

**Stock derivado del producto:** `GET /api/productos/:id/stock?sucursal=:id` (ver sección Productos).

**Uso frontend:**
- Empleado: `AdminProductsPage.jsx` (vista de stock de su sucursal) → `GET /api/stock?sucursal=` y `POST /api/stock` para agregar.
- Admin: `AdminMateriasPrimasPage.jsx` (ABM de materias primas) y sección de receta en el ABM de productos.

---

## Reportes — `/api/reportes` (`routes/reporteRoutes.js`, `controllers/reporteController.js`)

Reporte de productos con unidades vendidas y facturación (precio histórico de cada detalle; incluye productos sin ventas con 0). Filtro opcional `?id_sucursal=` para acotar a los pedidos de una sucursal.

| Método | Ruta | Descripción | Body / Params | Response | Códigos |
|--------|------|-------------|---------------|----------|---------|
| GET | `/api/reportes/productos` | Ventas por producto, global o por sucursal | query opcional `id_sucursal` | `[{id_producto, nombre, precio_actual, estado, unidades_vendidas, facturacion, cantidad_pedidos}]` | 200 / 404 sucursal inexistente |
| GET | `/api/reportes/promociones` | Ventas por promoción, global o por sucursal. `unidades_vendidas` = combos vendidos (líneas expandidas / tamaño del combo); incluye promociones sin ventas con 0 | query opcional `id_sucursal` | `[{id_promocion, nombre, tipo, valor, activa, unidades_vendidas, facturacion, cantidad_pedidos}]` | 200 / 404 sucursal inexistente |

**Uso frontend:**
- Admin: `AdminReportesPage.jsx` → `GET /api/reportes/productos` y `GET /api/reportes/promociones` (global).
- Empleado: `AdminReportesPage.jsx` → mismos endpoints con `?id_sucursal=` (solo su sucursal).

---

## Notas comunes

- **Content-Type:** `application/json` en POST/PUT.
- **Variables:** `foodapp-frontend/.env` → `VITE_API_URL`; `foodapp-backend/.env` → `DATABASE_URL`, `PORT`, `JWT_SECRET`, `JWT_EXPIRES_IN`.
- **Errores Sequelize:** validación/único → `400 {error: "mensajes"}`, FK → `409` en DELETE productos/sucursales.
- **Autenticación:** login con JWT implementado (`/api/auth/login`); la protección de rutas por rol con middleware queda pendiente (`AGENTS.md §7`).
