# Testing — Foodapp (BAJON)

## 1. Estrategia actual

El backend se prueba con **Jest + Supertest** contra una **base PostgreSQL real de test**. No hay mocks de base de datos ni de servicios: los tests ejercitan rutas, middlewares, controladores, servicios y modelos.

Características:

- Cada archivo de integración recrea el esquema con `sequelize.sync({ force: true })`.
- Se ejecuta con `--runInBand` para evitar carreras entre archivos sobre la misma base.
- Un `ADMIN` de prueba se crea automáticamente antes de cada archivo.
- Los tests usan `supertest(app)` directamente, sin levantar un puerto HTTP.
- Hay tests unitarios puros para utilidades de fechas y horarios.
- No hay tests de frontend ni tests end-to-end de navegador.
- No hay pipeline de CI configurado en los repositorios.

> Importante: la suite **destruye y recrea el esquema** de la base configurada. Nunca apuntar `TEST_DATABASE_URL` a una base de desarrollo o producción.

---

## 2. Herramientas

| Herramienta | Uso |
|---|---|
| Jest 30 | Runner de tests, asserts y cobertura. |
| Supertest 7 | Peticiones HTTP contra la app Express. |
| PostgreSQL | Base real de test. |
| `@jest` setup | Variables de entorno y conexión antes de cargar modelos. |

Scripts del backend:

```json
{
  "test": "jest --runInBand",
  "test:coverage": "jest --runInBand --coverage"
}
```

---

## 3. Configuración de la base de test

`test/setup.js` se ejecuta antes de cargar la app y define:

```js
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "postgres://unahur:desarrollo@localhost:5432/bajon_test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "desarrollo";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "12h";
process.env.NODE_ENV = "test";
```

Requisitos:

1. Tener PostgreSQL disponible.
2. Crear la base `bajon_test` o definir `TEST_DATABASE_URL`.
3. Verificar que el usuario tenga permisos para crear y borrar tablas.
4. Ejecutar los tests desde `foodapp-backend/`.

Ejemplo con una base local:

```bash
export TEST_DATABASE_URL="postgres://unahur:desarrollo@localhost:5432/bajon_test"
npm test
```

Si no se define `TEST_DATABASE_URL`, se usa la URL por defecto indicada arriba.

---

## 4. Comandos

### Backend

```bash
# Instalar dependencias
npm install

# Ejecutar toda la suite una vez
npm test

# Ejecutar con cobertura
npm run test:coverage

# Ejecutar un archivo específico
npx jest --runInBand test/pedido.test.js

# Ejecutar tests que coincidan con un nombre
npx jest --runInBand -t "asignación de sucursal"
```

### Frontend

El frontend no tiene runner de tests. Las verificaciones disponibles son:

```bash
npm install
npm run lint
npm run build
```

`lint` usa `oxlint`. `build` usa Vite y detecta errores de importación, sintaxis y bundling, pero no valida comportamiento.

---

## 5. Estructura de tests

```text
test/
├── setup.js                 # Variables de entorno y base de test
├── db_utils.js              # resetDb / closeDb
├── helpers/
│   ├── auth.js              # Admin de prueba y token
│   ├── request.js           # Supertest con/sin token
│   └── users.js             # Clientes y empleados de prueba
├── fechas.test.js           # Unitarios de fechas
├── horarios.test.js         # Unitarios de horarios
└── *.test.js                # Integración por módulo
```

### `resetDb`

```js
async function resetDb() {
  resetAdmin();
  await sequelize.sync({ force: true });
  await crearAdmin();
}
```

- Borra y recrea todas las tablas.
- Crea el admin `admin.test@example.com` con contraseña `admin123`.
- Se ejecuta en `beforeAll` de cada archivo de integración.

### Helpers de usuarios

- `crearCliente({ ... })`: crea un cliente con contraseña `secreto123` por defecto y devuelve `{ cliente, token }`.
- `crearEmpleado({ ... })`: crea un empleado con rol `EMPLEADO` por defecto y devuelve `{ empleado, token }`.
- `request()`: cliente Supertest autenticado como admin.
- `requestAs(token)`: cliente Supertest con el token indicado; `requestAs(null)` es anónimo.

### Admin de prueba

| Dato | Valor |
|---|---|
| Email | `admin.test@example.com` |
| Contraseña | `admin123` |
| Rol | `ADMIN` |
| Sucursal | `null` |

No confundir con las credenciales del seeder de desarrollo (`admin@altoque.com`).

---

## 6. Cobertura por archivo

Cifras estáticas al 2026-11-18: **259 casos**, **48 `describe`**, **18 archivos**.

| Archivo | Casos | Qué cubre |
|---|---:|---|
| `auth.test.js` | 18 | Registro, login, hash, migración de contraseña, recuperación y restablecimiento. |
| `baja-logica.test.js` | 6 | Baja lógica de categorías, productos, empleados y referencias históricas. |
| `baja-logica-relaciones.test.js` | 4 | Baja lógica y restauración de categorías, receta, promociones y horarios. |
| `banners.test.js` | 10 | CRUD, activación, orden, validaciones y permisos. |
| `clientes-admin.test.js` | 13 | Alta, listado, detalle, resumen, edición, DNI, email y permisos. |
| `cliente.test.js` | 7 | Email inmutable y cambio de contraseña autenticado. |
| `empleados.test.js` | 13 | CRUD, roles, sucursal, email único, baja y reutilización. |
| `fechas.test.js` | 3 | Fechas locales, validación y normalización `YYYY-MM-DD`. |
| `horarios.test.js` | 6 | Rangos diurnos, nocturnos, cierre a las 00:00 y estado manual. |
| `materias-primas.test.js` | 11 | CRUD, stock mínimo, duplicados y baja lógica. |
| `pedido.test.js` | 43 | Creación, asignación, stock, precios, estados, cancelación según preparación, preparado y tiempo estimado. |
| `productos.test.js` | 11 | CRUD, categorías, receta, rollback, baja lógica y permisos. |
| `promociones.test.js` | 16 | Tipos, vigencias, productos, rollback, activación y permisos. |
| `reportes.test.js` | 22 | Rangos, pedidos, sucursales, productos, clientes, promociones y permisos. |
| `parametros.test.js` | 10 | API de parámetros, permisos, validaciones, ETA y rangos de reportes. |
| `seguridad.test.js` | 28 | Catálogo público, stock privado, alcance por sucursal, ownership, cancelación por cliente y rutas admin. |
| `stock.test.js` | 29 | Stock por sucursal, derivado, reposición, reducciones y descuento por pedido. |
| `sucursales.test.js` | 9 | Horarios, radio, validaciones y estado operativo. |

La cobertura de líneas real debe obtenerse con `npm run test:coverage`; no hay umbral mínimo configurado.

---

## 7. Casos críticos cubiertos

### Autenticación

- El registro siempre crea `CLIENTE` y rechaza inyección de rol.
- La contraseña se guarda hasheada.
- Login correcto, incorrecto y email inexistente.
- Migración de contraseña legada en texto plano.
- Recuperación con email + DNI y token temporal.
- Un token de sesión no sirve para restablecer contraseña.

### Pedidos

- Creación con sucursal explícita y automática.
- Asignación de la sucursal más cercana con stock.
- Rechazo por falta de stock, sucursal cerrada, inactiva o fuera de radio.
- Snapshot de precio y observaciones.
- Importe calculado y autocorrección.
- Flujo completo de estados y rechazo de saltos/retrocesos.
- Cancelación con reposición total, parcial por ítems preparados o sin reposición en `En camino`.
- Cliente cancela pedidos propios hasta `En camino`; no puede avanzar estados, modificar importes ni cancelar pedidos ajenos, en `Listo` o terminales.
- Confirmación de ítems preparados y avance automático.
- Cálculo de distancia y tiempo estimado.

### Stock

- Stock derivado `min(floor(stock / cantidad))`.
- Producto sin receta con stock 0 y rechazo al pedir.
- Reposición y creación de fila.
- Reducción con motivo, auditoría y snapshots.
- Prohibición de stock negativo.
- Historial de reducciones por sucursal.

### Promociones

- `PRECIO_FIJO`, `PORCENTAJE` y `DOS_POR_UNO`.
- Vigencia con zona horaria de Argentina.
- Reemplazo transaccional de productos con baja lógica y restauración.
- Rollback ante producto inexistente.
- Activación/desactivación y baja lógica.

### Seguridad

- Catálogo público sin stock.
- Stock solo para staff.
- Empleado limitado a su sucursal.
- Cliente limitado a sus pedidos, perfil y direcciones.
- Rutas administrativas protegidas.
- Admin con acceso global.

### Reportes

- Rango por defecto de 30 días y validación de fechas.
- Agrupación por fecha local.
- Solo pedidos entregados para ventas.
- Sucursales sin pedidos con ceros.
- Productos sin ventas.
- Clientes top, nuevos e inactivos.
- Promociones e impacto.
- Permisos por sucursal.

---

## 8. Cobertura del frontend

No hay tests automatizados de frontend. Esto implica que no se verifica automáticamente:

- Renderizado de páginas y componentes.
- Navegación y protección de rutas.
- Flujo de carrito y `localStorage`.
- Fusión de carrito invitado.
- Checkout y selección de dirección.
- Mapas, geocodificación y marcadores.
- Formularios administrativos.
- Reportes y gráficos.
- Recuperación de contraseña.
- Responsive y accesibilidad.

Verificación manual mínima recomendada:

1. Registro, login y logout de cliente.
2. Login de empleado y admin.
3. Alta de dirección con mapa.
4. Agregar producto y promoción al carrito.
5. Checkout con dirección y confirmación.
6. Cambio de estado como empleado.
7. Repetición de pedido.
8. Alta de producto con receta y control de stock.
9. Reportes con filtros.
10. Recuperación de contraseña.

---

## 9. Brechas y riesgos de testing

| Brecha | Impacto | Acción sugerida |
|---|---|---|
| Sin tests de frontend | Regresiones visuales y de flujo | Incorporar Vitest + Testing Library o documentar pruebas manuales. |
| Sin tests E2E | No se valida el flujo completo real | Evaluar Playwright para checkout y administración. |
| Sin CI | Los tests no se ejecutan automáticamente | Configurar GitHub Actions con PostgreSQL. |
| Sin umbral de cobertura | La cobertura puede bajar sin alerta | Definir umbral y reporte. |
| Sin tests de accesibilidad | Riesgo de barreras de uso | Agregar axe o revisión manual. |
| Sin tests de rendimiento | Cálculo de stock y reportes pueden escalar mal | Medir con volúmenes representativos. |
| Dependencia de PostgreSQL local | La suite no corre sin base | Documentar Docker o usar testcontainers. |
| `README.md` desactualizado | Comandos `db:init`/`test:watch` no existen en `package.json` | Actualizar README o este documento. |
| Sin pruebas de email real | La recuperación no envía correo | Mockear un proveedor cuando se implemente. |

---

## 10. Convenciones para agregar tests

1. Crear el archivo como `test/<modulo>.test.js`.
2. Usar `resetDb()` en `beforeAll` y `closeDb()` en `afterAll`.
3. Usar `request()` para admin y `requestAs(token)` para roles específicos.
4. Crear datos con los helpers o con los modelos; evitar depender del seeder.
5. Probar el caso feliz, validaciones, permisos y efectos secundarios.
6. Para transacciones, verificar que no queden datos parciales.
7. Para stock, verificar valores antes y después.
8. Para reportes, fijar fechas explícitas y evitar depender del día actual.
9. No usar la base de desarrollo.
10. Ejecutar `npm test` completo antes de cerrar el cambio.

Ejemplo mínimo:

```js
const { request } = require("./helpers/request");
const { resetDb, closeDb } = require("./db_utils");

beforeAll(async () => {
  await resetDb();
});

afterAll(async () => {
  await closeDb();
});

test("GET /api/productos responde 200", async () => {
  const res = await request().get("/api/productos");
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
});
```

---

## 11. Checklist de cierre de Sprint 5

- [x] `npm test` pasa completo contra PostgreSQL de test.
- [ ] `npm run test:coverage` genera reporte sin fallos.
- [x] `npm run lint` pasa en frontend (solo warnings preexistentes).
- [x] `npm run build` pasa en frontend.
- [x] Cancelación de pedido por cliente corregida y probada hasta `En camino`.
- [ ] Tests de reportes y recuperación de contraseña estables.
- [ ] Brechas de frontend documentadas o cubiertas.
- [ ] Sin secretos en archivos versionados.
- [ ] Documentación enlazada desde [`README.md`](./README.md).

---

## 12. Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `ECONNREFUSED` | PostgreSQL no está corriendo | Iniciar PostgreSQL o revisar el puerto. |
| `database "bajon_test" does not exist` | Falta crear la base | Crear `bajon_test` o definir `TEST_DATABASE_URL`. |
| Tests que se pisan entre sí | Ejecución paralela | Usar `--runInBand` (ya está en `npm test`). |
| Datos inesperados entre archivos | No se llamó a `resetDb()` | Agregar `beforeAll` con `resetDb()`. |
| Timeout al cerrar | Conexión Sequelize abierta | Llamar a `closeDb()` en `afterAll`. |
| Fechas distintas a las esperadas | Zona horaria del entorno | Usar las utilidades de fechas y la zona de Argentina. |
| Tests de frontend no encontrados | No hay runner configurado | Usar `lint` y `build`; agregar Vitest si se requiere. |
