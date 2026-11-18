# Arquitectura del proyecto — Foodapp (BAJON)

## 1. Visión general y componentes principales

**Arquitectura:** Monolito modular (`AGENTS.md §3`). No microservicios.

Tres capas desacopladas:

```text
Frontend  --HTTP/REST JSON-->  Backend  --SQL via ORM/driver-->  Base de datos
```

### Frontend (`foodapp-frontend`)

- **Tecnologías:** React 19 + Vite 8 + React Router + TailwindCSS 4 + Fetch API
- **Origen:** `vite.config.js`, `src/main.jsx`, `src/App.jsx`, `src/index.css` (`@theme`)
- **Estructura modular por rol en un solo repo** (`AGENTS.md §2`, `§9`):
  - Cliente: `src/pages/CatalogPage.jsx`, `src/pages/CartPage.jsx`, `src/context/CartContext.jsx`
  - Empleado: `src/pages/EmployeeOrdersPage.jsx`, `src/pages/EmployeeOrderDetailPage.jsx`
  - Compartido: `src/components/*`, `src/services/*`, `src/context/*`
- **Punto de entrada:** `src/main.jsx` renderiza `<App/>` con `BrowserRouter` + `CartProvider`

### Backend (`foodapp-backend`)

- **Tecnologías:** Node.js + Express 5 + Sequelize 6 + PostgreSQL 18 + pg Pool
- **Patrón:** Controllers → Services → Models → Routes → Middlewares (`AGENTS.md §11`)
- **Archivos clave:**
  - `config/database.js`: instancia Sequelize (`dialect: postgres`, `underscored`, `timestamps`)
  - `config/db.js`: Pool `pg` directo para `health`/`db-test`
  - `models/index.js`: definición y asociaciones de los modelos
  - `controllers/*`: `productoController`, `sucursalController`, `pedidoController`, `reporteController`
  - `services/pedidoService.js`: lógica de negocio (cálculo importe, transacción)
  - `services/reporteService.js`: consultas SQL agregadas de pedidos, clientes, sucursales, productos y promociones
  - `services/parametroService.js`: defaults, caché y validación de parámetros operativos configurables
  - `schemas/reporteSchema.js`: validación Joi de `desde`, `hasta`, `id_sucursal`, `limite`, `dias` y `agrupacion`
  - `routes/*`: mapeo REST `/api/productos`, `/api/sucursales`, `/api/pedidos`, `/api/reportes`, `/api/parametros`
  - `middlewares/errorMiddleware.js`: manejo global de errores
  - `index.js`: app Express (`helmet`, `cors`, `json`, montaje de rutas)
  - `scripts/seed.js`: seed mínimo con pool ≤3 registros por tabla
  - `scripts/seed-demo.js`: dataset demo ampliado (sucursales, productos, stock, promociones, banners y pedidos)

### Base de datos

- **Motor:** PostgreSQL (`DATABASE_URL` en `.env`, ej. `postgres://unahur:desarrollo@localhost:5432/bajon`)
- **Tablas:** `clientes`, `direcciones`, `categorias`, `productos`, `categoria_producto`, `materias_primas`, `producto_materia_prima` (receta), `materia_prima_sucursal` (stock), `reducciones_stock` (auditoría de reducciones manuales), `sucursales`, `sucursal_horarios` (apertura/cierre por día), `pedidos`, `detalle_pedidos`, `historial_pedidos`, `producto_pedido`, `parametros` (configuración operativa)
- **DER completo:** [`der-foodapp.drawio`](./der-foodapp.drawio) (editable en diagrams.net, exportable a PNG/SVG) y versión Mermaid en [`der-foodapp.md`](./der-foodapp.md).
- **Relaciones clave** (`AGENTS.md §5`, `models/index.js`):
  - `Cliente 1:N Direccion`, `Cliente 1:N Pedido`, `Direccion 1:N Pedido`
  - `Producto N:M Categoria` (vía `categoria_producto`), `Producto N:M MateriaPrima` (vía `producto_materia_prima` con `cantidad`), `MateriaPrima N:M Sucursal` (vía `materia_prima_sucursal` con `stock`)
  - `Producto N:M Pedido` (vía `producto_pedido` §5.15), `Pedido 1:N DetallePedido` (precio snapshot, cantidad, observaciones)
  - `Pedido 1:N HistorialPedido` (`estado` + `fecha_hora`), `Sucursal 1:N Pedido`, `Producto 1:N DetallePedido`, `Sucursal 1:N SucursalHorario` (`dia_semana` 1-7, `hora_apertura`, `hora_cierre`)
  - `MateriaPrima 1:N ReduccionStock`, `Sucursal 1:N ReduccionStock`, `Empleado 1:N ReduccionStock` (reducciones manuales con motivo, snapshots de stock y usuario)

---

## 2. Comunicación Frontend ↔ Backend

**Protocolo:** HTTP REST + JSON, sin duplicar endpoints por rol (`AGENTS.md §8`).

### Base URL

```js
import.meta.env.VITE_API_URL // foodapp-frontend/.env, .env.example
// default: http://localhost:3000/api
// Definida en src/services/api.js como API_URL
```

### Cliente HTTP

Fetch wrapper `src/services/api.js::apiFetch(path, options)`:

- Agrega `Content-Type: application/json`
- Concatena `API_URL + path` (ej. `/productos`, `/pedidos/3/detalles`)
- Manejo de errores: parsea `{error: "..."}` y lanza `Error`
- Retorna JSON (o `null` en `DELETE` vacío)

### Persistencia del carrito (`foodapp-frontend/src/context/CartContext.jsx` + `src/utils/cartStorage.js`)

- El carrito se guarda en `localStorage` con payload `{ version: 1, items }`.
- Claves: `foodapp_cart_guest`, `foodapp_cart_cliente_<id_cliente>` y `foodapp_cart_empleado_<id_empleado>`.
- Al iniciar sesión como cliente, el carrito de invitado se fusiona por `_key` (suma cantidades), se guarda en la clave del cliente y se elimina la clave guest.
- `CartProvider` remonta su estado interno al cambiar de usuario para cargar el carrito correspondiente sin mezclar sesiones.
- El carrito se guarda en cada cambio de items y al vaciarlo; si `localStorage` falla o el JSON es inválido, se usa un carrito vacío en memoria.

### Servicios de dominio (`foodapp-frontend/src/services/`)

- `productService.js`: `getProductos()` → `GET /productos`, `getProductoById(id)` → `GET /productos/:id`
- `pedidoService.js`: `createPedido(payload)` → `POST /pedidos`, `getPedidos()` → `GET /pedidos`, `getPedidoById(id)` → `GET /pedidos/:id`, `getPedidoDetalles(id)` → `GET /pedidos/:id/detalles`, `updatePedidoEstado(id, estado)` → `PUT /pedidos/:id`
- `reporteService.js`: consultas de reportes con filtros `desde`, `hasta`, `id_sucursal`, `limite`, `dias` y `agrupacion` → `/reportes/*`
- `parametroService.js`: `getParametros()`/`getParametrosMap()` y `updateParametros()` → `/parametros`

### Endpoints REST (`foodapp-backend/index.js` + `routes/*`)

| Recurso | Endpoints |
|---------|-----------|
| **Productos** | `GET /api/productos`, `GET /api/productos/:id`, `POST /api/productos`, `PUT /api/productos/:id`, `DELETE /api/productos/:id` |
| **Sucursales** | `GET /api/sucursales`, `POST /api/sucursales`, `PUT /api/sucursales/:id`, `DELETE /api/sucursales/:id` |
| **Parámetros** | `GET /api/parametros`, `PUT /api/parametros` |
| **Pedidos** | `GET /api/pedidos`, `GET /api/pedidos/:id`, `GET /api/pedidos/:id/detalles`, `POST /api/pedidos`, `PUT /api/pedidos/:id`, `DELETE /api/pedidos/:id` |
| **Reportes** | `GET /api/reportes/pedidos/dia`, `/pedidos/estado`, `/pedidos/tiempo-entrega`, `/pedidos/cancelados`, `/sucursales`, `/sucursales/productos`, `/clientes/top`, `/clientes/nuevos`, `/clientes/inactivos`, `/productos`, `/promociones`, `/promociones/impacto` |
| **Utilidad** | `GET /`, `GET /db-test` (Pool `SELECT 1`), `GET /health` (`sequelize.authenticate`) |

### Flujo ejemplo — Carrito → Pedido

1. `CatalogPage.jsx` hace `getProductos()` → `GET /api/productos` → renderiza `ProductCard.jsx`
2. Usuario agrega/modifica cantidades en `CartContext.jsx` (`addProduct`, `updateQuantity`, `removeProduct`, `total = SUM precio*cantidad`)
3. `CartPage.jsx` `confirmCart()` → `createPedido({id_cliente, id_direccion, detalles:[{id_producto, cantidad, observaciones}]})` → `POST /api/pedidos` (sin `id_sucursal`: el backend la asigna)
4. Backend `pedidoController.createPedido` valida cliente/dirección y resuelve la sucursal en `services/sucursalService.js` (si viene `id_sucursal`, exige que exista, esté activa, abierta y dentro de su `radio_km`; si no, elige la más cercana dentro de su radio con stock). Luego crea en transacción `Pedido` + `DetallePedido` (precio snapshot) + `ProductoPedido` + `HistorialPedido`, calcula `importe` y retorna `201` con `includes`
5. `services/pedidoService.js` agrega `distancia_km` y `tiempo_estimado_min = ceil(20 + (distancia / 40) * 60)` usando las coordenadas de la dirección y la sucursal. `ClientHistoryPage.jsx` y `OrderConfirmation.jsx` muestran el estimado en pedidos activos
6. Empleado: `EmployeeOrdersPage.jsx` hace `getPedidos()` → `GET /api/pedidos` (con `includes` cliente, sucursal, direccion, detalles+producto, historial) → tabla; `EmployeeOrderDetailPage.jsx` hace `getPedidoById` → `PUT /api/pedidos/:id` para cambiar estado (`Pendiente`, `Confirmado`, `Preparando`, `En camino`, `Entregado`). `ClientHistoryPage.jsx` usa el mismo `PUT /api/pedidos/:id` únicamente para cancelar pedidos propios hasta `En camino`.

### Flujo ejemplo — Recuperación de contraseña

1. `LoginPage.jsx` muestra el link a `ForgotPasswordPage.jsx` (`/recuperar-password`)
2. El usuario ingresa email + DNI; el frontend llama `recuperarPassword()` → `POST /api/auth/password/recuperar`
3. `authService.recuperarPassword` normaliza el DNI (solo dígitos), compara contra el cliente y genera un JWT con `purpose: "password_reset"` y expiración de 15 minutos (`utils/jwt.js`)
4. Con el `resetToken` en memoria, `ForgotPasswordPage.jsx` llama `restablecerPassword()` → `POST /api/auth/password/restablecer`; el backend valida el token, hashea la nueva contraseña con bcrypt y permite el login con ella

### Configuración Cross-Origin y seguridad

- Backend usa `cors()` y `helmet()` en `index.js` (habilita requests desde Vite dev server `http://localhost:5173`)
- Middleware de error global (`errorMiddleware.js`) devuelve `{error: "..."}` sin stack trace

---

## 3. Comunicación Backend ↔ Base de datos

Dos mecanismos coexistentes (ambos usan misma `DATABASE_URL`):

### a) Sequelize ORM (principal, para modelo de dominio)

- **Inicialización:** `config/database.js` crea `new Sequelize(DATABASE_URL, {dialect:"postgres", logging:false, define:{underscored:true, timestamps:true}})`
- **Autenticación y sync:** `index.js` hace `sequelize.authenticate().then(...)`, `scripts/sync.js` hace `sequelize.sync({ alter: true })` o `{ force: true }` con `--force`
- **Modelos:** cada archivo en `models/*.js` define `DataTypes`, `primaryKey`, referencias, validaciones, `tableName` (ej. `Producto` → `productos`, `Sucursal` → `sucursales`, `MateriaPrimaSucursal` composite PK, `ProductoPedido` única `[id_producto, id_pedido]`)
- **Asociaciones:** `models/index.js` declara `hasMany`/`belongsTo`/`belongsToMany` (Cliente-Direccion, Pedido-Detalle, etc.) y exporta `{sequelize, Cliente, ...}`
- **Consultas:** controllers usan `Model.findAll`/`findByPk`/`create`/`update`/`destroy` con `include` (eager loading) y `order`; `pedidoController.createPedido` usa `sequelize.transaction()` para atomicidad (crea `Pedido` con `importe 0`, inserta `DetallePedido` con precio de `Producto`, inserta `ProductoPedido` vía `findOrCreate`, recalcula `importe = SUM(cantidad*precio)`, `update Pedido`, crea `HistorialPedido`, `commit`/`rollback`)
- **Validación y stock:** `MateriaPrimaSucursal` guarda `stock` por par (materia prima + sucursal), nunca en `CategoriaProducto`; el stock de un producto se deriva de su receta (`producto_materia_prima`) como `min(floor(stock_materia / cantidad_receta))`; precio en `DetallePedido` preserva histórico. Las reducciones manuales usan `ReduccionStock` dentro de una transacción con lock, validan cantidad contra el stock y guardan `motivo`, `stock_anterior`, `stock_nuevo` e `id_empleado`

### b) Pool `pg` directo (secundario, para health check)

- `config/db.js` crea `new Pool({connectionString: DATABASE_URL})`
- **Uso:** `index.js` `GET /db-test` hace `pool.query("SELECT 1 AS ok")` para verificar conectividad sin pasar por Sequelize; permite diagnóstico independiente del ORM

### Variables de entorno

- `.env` (gitignored) define `DATABASE_URL`, `PORT` (3000), `DB_*`; `.env.example` documenta sin credenciales
- `config/database.js` resuelve path con `path.resolve(__dirname, "../.env")` para soportar cualquier `cwd`

### Persistencia y seed

- `scripts/seed.js` y `scripts/seed-demo.js` recrean las tablas con `sequelize.sync({force:true})`; el primero mantiene el pool mínimo ≤3 por tabla y el segundo carga un dataset demo ampliado con stock, promociones, banners y pedidos. Los importes se recalculan como `SUM(cantidad*precio)` y los pedidos se crean en transacción.
- Transacciones garantizan consistencia (`AGENTS.md §18.6`): pedido + detalles + historial en una misma transacción

### Diagrama resumido

```text
[React Vite + CartContext + apiFetch] --fetch JSON--> [Express index.js -> routes -> controllers -> services/pedidoService -> Sequelize Models] --SQL--> [PostgreSQL bajon]
                                      <--JSON error/success--                            <--result rows--
```

---

## 4. Reportes

**Archivos:** `routes/reporteRoutes.js` → `controllers/reporteController.js` → `services/reporteService.js` → `sequelize.query` sobre PostgreSQL.

- **Acceso:** `autenticar` + `requireStaff` (ADMIN/EMPLEADO) + `requireSucursal`. El admin puede filtrar por `id_sucursal`; el empleado siempre queda acotado a su sucursal y recibe `403` si intenta otra.
- **Período:** `desde`/`hasta` inclusivos en formato `YYYY-MM-DD`. Default: últimos `reporte_dias_default` días (inicial 30, configurable en `/api/parametros`) hasta hoy en `SCHEDULE_TIMEZONE`. Las agrupaciones usan la zona horaria de la sucursal/negocio (`America/Argentina/Buenos_Aires` por defecto).
- **Criterio de ventas:** solo pedidos `Entregado` para ventas, productos, clientes y promociones. Cancelados se reportan aparte. La facturación usa `DetallePedido.precio` (snapshot histórico).
- **Clientes:** top/nuevos/inactivos consideran pedidos entregados. “Nuevo” = primer pedido entregado dentro del período y sucursal consultada. “Inactivo” = último pedido entregado anterior a `now() - dias` (default 30).
- **Promociones:** `unidades_vendidas` = `SUM(DetallePedido.cantidad) / tamaño del combo`; el impacto es la participación de la facturación de la promoción sobre la facturación total entregada del período/sucursal.
- **Respuesta:** JSON agregado; el frontend `AdminReportesPage.jsx` lo muestra con tablas, KPIs y barras CSS/Tailwind, sin librerías de gráficos.
- **Validación:** `schemas/reporteSchema.js` valida query; `middlewares/validateMiddleware.js` soporta reemplazar `req.query` en Express 5. Fechas inválidas o rango invertido → `400`; sucursal inexistente → `404`.
