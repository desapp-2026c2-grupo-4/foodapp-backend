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
  - `models/index.js`: definición y asociaciones de 11 tablas
  - `controllers/*`: `productoController`, `sucursalController`, `pedidoController`
  - `services/pedidoService.js`: lógica de negocio (cálculo importe, transacción)
  - `routes/*`: mapeo REST `/api/productos`, `/api/sucursales`, `/api/pedidos`
  - `middlewares/errorMiddleware.js`: manejo global de errores
  - `index.js`: app Express (`helmet`, `cors`, `json`, montaje de rutas)
  - `scripts/seed.js`: pool ≤3 registros por tabla (categorías, productos, etc.)

### Base de datos

- **Motor:** PostgreSQL (`DATABASE_URL` en `.env`, ej. `postgres://unahur:desarrollo@localhost:5432/bajon`)
- **Tablas:** `clientes`, `direcciones`, `categorias`, `productos`, `categoria_producto`, `producto_sucursal` (stock), `sucursales`, `pedidos`, `detalle_pedidos`, `historial_pedidos`, `producto_pedido`
- **Relaciones clave** (`AGENTS.md §5`, `models/index.js`):
  - `Cliente 1:N Direccion`, `Cliente 1:N Pedido`, `Direccion 1:N Pedido`
  - `Producto N:M Categoria` (vía `categoria_producto`), `Producto N:M Sucursal` (vía `producto_sucursal` con `stock`)
  - `Producto N:M Pedido` (vía `producto_pedido` §5.15), `Pedido 1:N DetallePedido` (precio snapshot, cantidad, observaciones)
  - `Pedido 1:N HistorialPedido` (`estado` + `fecha_hora`), `Sucursal 1:N Pedido`, `Producto 1:N DetallePedido`

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

### Servicios de dominio (`foodapp-frontend/src/services/`)

- `productService.js`: `getProductos()` → `GET /productos`, `getProductoById(id)` → `GET /productos/:id`
- `pedidoService.js`: `createPedido(payload)` → `POST /pedidos`, `getPedidos()` → `GET /pedidos`, `getPedidoById(id)` → `GET /pedidos/:id`, `getPedidoDetalles(id)` → `GET /pedidos/:id/detalles`, `updatePedidoEstado(id, estado)` → `PUT /pedidos/:id`

### Endpoints REST (`foodapp-backend/index.js` + `routes/*`)

| Recurso | Endpoints |
|---------|-----------|
| **Productos** | `GET /api/productos`, `GET /api/productos/:id`, `POST /api/productos`, `PUT /api/productos/:id`, `DELETE /api/productos/:id` |
| **Sucursales** | `GET /api/sucursales`, `POST /api/sucursales`, `PUT /api/sucursales/:id`, `DELETE /api/sucursales/:id` |
| **Pedidos** | `GET /api/pedidos`, `GET /api/pedidos/:id`, `GET /api/pedidos/:id/detalles`, `POST /api/pedidos`, `PUT /api/pedidos/:id`, `DELETE /api/pedidos/:id` |
| **Utilidad** | `GET /`, `GET /db-test` (Pool `SELECT 1`), `GET /health` (`sequelize.authenticate`) |

### Flujo ejemplo — Carrito → Pedido

1. `CatalogPage.jsx` hace `getProductos()` → `GET /api/productos` → renderiza `ProductCard.jsx`
2. Usuario agrega/modifica cantidades en `CartContext.jsx` (`addProduct`, `updateQuantity`, `removeProduct`, `total = SUM precio*cantidad`)
3. `CartPage.jsx` `confirmCart()` → `createPedido({id_cliente, id_direccion, id_sucursal, detalles:[{id_producto, cantidad, observaciones}]})` → `POST /api/pedidos`
4. Backend `pedidoController.createPedido` valida cliente/dirección/sucursal, crea en transacción `Pedido` + `DetallePedido` (precio snapshot) + `ProductoPedido` + `HistorialPedido`, calcula `importe`, retorna `201` con `includes`
5. Frontend muestra `OrderConfirmation.jsx` modal con N° pedido, fecha, estado, productos y total
6. Empleado: `EmployeeOrdersPage.jsx` hace `getPedidos()` → `GET /api/pedidos` (con `includes` cliente, sucursal, direccion, detalles+producto, historial) → tabla; `EmployeeOrderDetailPage.jsx` hace `getPedidoById` → `PUT /api/pedidos/:id` para cambiar estado (`Pendiente`, `Confirmado`, `Preparando`, `En camino`, `Entregado`)

### Configuración Cross-Origin y seguridad

- Backend usa `cors()` y `helmet()` en `index.js` (habilita requests desde Vite dev server `http://localhost:5173`)
- Middleware de error global (`errorMiddleware.js`) devuelve `{error: "..."}` sin stack trace

---

## 3. Comunicación Backend ↔ Base de datos

Dos mecanismos coexistentes (ambos usan misma `DATABASE_URL`):

### a) Sequelize ORM (principal, para modelo de dominio)

- **Inicialización:** `config/database.js` crea `new Sequelize(DATABASE_URL, {dialect:"postgres", logging:false, define:{underscored:true, timestamps:true}})`
- **Autenticación y sync:** `index.js` hace `sequelize.authenticate().then(...)`, `scripts/sync.js` hace `sequelize.sync({force})`
- **Modelos:** cada archivo en `models/*.js` define `DataTypes`, `primaryKey`, referencias, validaciones, `tableName` (ej. `Producto` → `productos`, `Sucursal` → `sucursales`, `ProductoSucursal` composite PK, `ProductoPedido` única `[id_producto, id_pedido]`)
- **Asociaciones:** `models/index.js` declara `hasMany`/`belongsTo`/`belongsToMany` (Cliente-Direccion, Pedido-Detalle, etc.) y exporta `{sequelize, Cliente, ...}`
- **Consultas:** controllers usan `Model.findAll`/`findByPk`/`create`/`update`/`destroy` con `include` (eager loading) y `order`; `pedidoController.createPedido` usa `sequelize.transaction()` para atomicidad (crea `Pedido` con `importe 0`, inserta `DetallePedido` con precio de `Producto`, inserta `ProductoPedido` vía `findOrCreate`, recalcula `importe = SUM(cantidad*precio)`, `update Pedido`, crea `HistorialPedido`, `commit`/`rollback`)
- **Validación y stock:** `ProductoSucursal` guarda `stock` por par (producto+sucursal), nunca en `CategoriaProducto`; precio en `DetallePedido` preserva histórico

### b) Pool `pg` directo (secundario, para health check)

- `config/db.js` crea `new Pool({connectionString: DATABASE_URL})`
- **Uso:** `index.js` `GET /db-test` hace `pool.query("SELECT 1 AS ok")` para verificar conectividad sin pasar por Sequelize; permite diagnóstico independiente del ORM

### Variables de entorno

- `.env` (gitignored) define `DATABASE_URL`, `PORT` (3000), `DB_*`; `.env.example` documenta sin credenciales
- `config/database.js` resuelve path con `path.resolve(__dirname, "../.env")` para soportar cualquier `cwd`

### Persistencia y seed

- Tablas creadas con `sequelize.sync({force:true})` en `scripts/seed.js`, luego `bulkCreate` con `returning:true` para ≤3 registros por tabla y recálculo de `importe` por pedido (`SUM cantidad*precio`) antes de `commit`
- Transacciones garantizan consistencia (`AGENTS.md §18.6`): pedido + detalles + historial en una misma transacción

### Diagrama resumido

```text
[React Vite + CartContext + apiFetch] --fetch JSON--> [Express index.js -> routes -> controllers -> services/pedidoService -> Sequelize Models] --SQL--> [PostgreSQL bajon]
                                      <--JSON error/success--                            <--result rows--
```
