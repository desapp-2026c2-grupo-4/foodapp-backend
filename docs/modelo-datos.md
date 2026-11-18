# Modelo de datos — Foodapp (BAJON)

**Actualizado:** 2026-11-12  
**Fuentes:** `models/*.js`, `models/index.js`, `config/database.js`, `docs/der-foodapp.md` y `docs/decisiones-negocio.md`.  
**Diagramas:** [`der-foodapp.md`](./der-foodapp.md) (Mermaid) y [`der-foodapp.drawio`](./der-foodapp.drawio) (editable).

---

## 1. Resumen

El modelo es relacional, implementado sobre PostgreSQL y definido con Sequelize. Está compuesto por **22 tablas** agrupadas en siete dominios:

- Identidad y acceso.
- Red de entrega.
- Catálogo.
- Abastecimiento y stock.
- Promociones.
- Pedidos.
- Configuración.

La fuente de verdad es el código de los modelos. El DER es la representación visual; si existe una diferencia, debe prevalecer lo definido en `models/*.js` y corregirse el diagrama.

El modelo **no incluye** tablas de pagos, asignación de repartidores, calificaciones ni notificaciones. El carrito tampoco se persiste en la base: vive en `localStorage` en el frontend.

---

## 2. Convenciones

| Convención | Detalle |
|---|---|
| Nombres de tablas | Plural, `snake_case`, definidos explícitamente con `tableName`. |
| Nombres de modelos | `PascalCase`, por ejemplo `DetallePedido`. |
| Claves primarias | `INTEGER` autoincremental (`SERIAL`) salvo tablas intermedias con PK compuesta. |
| Claves foráneas | Columnas `id_*` de tipo `INTEGER`. |
| Dinero | `DECIMAL(10, 2)`, equivalente a `NUMERIC(10, 2)` en PostgreSQL. |
| Coordenadas | `DECIMAL(10, 7)`. |
| Radio de sucursal | `DECIMAL(6, 2)`. |
| Fechas y horas | `DATE` (timestamp con zona en PostgreSQL), `DATEONLY` para fechas sin hora y `TIME` para horarios. |
| Timestamps | Sequelize usa `underscored: true`; los campos son `created_at`, `updated_at` y `deleted_at`. |
| Baja lógica | `paranoid: true` genera `deleted_at`; las tablas sin `paranoid` se eliminan físicamente o en cascada. |
| Validaciones | `min`, `max`, `isIn`, `isEmail` y `notEmpty` son validaciones de Sequelize, no necesariamente restricciones `CHECK` en PostgreSQL. |
| Acciones referenciales | Se declaran con `onUpdate` y `onDelete` en cada FK. |

### 2.1 Tablas con baja lógica

Tienen `deleted_at`:

`banners`, `categoria_producto`, `categorias`, `direcciones`, `empleados`, `materias_primas`, `opcionales`, `pedidos`, `producto_materia_prima`, `productos`, `promociones`, `promocion_producto`, `sucursal_horarios`, `sucursales`.

No tienen baja lógica:

`clientes`, `detalle_pedido_opcionales`, `detalle_pedidos`, `historial_pedidos`, `materia_prima_sucursal`, `parametros`, `producto_pedido`, `reducciones_stock`.

### 2.2 Casos especiales de timestamps

- `categorias`, `categoria_producto`, `promocion_producto`, `producto_materia_prima` y `sucursal_horarios`: solo tienen `deleted_at`; no tienen `created_at` ni `updated_at`.
- `pedidos`: usa `fecha_hora` como fecha de creación, no tiene `updated_at` y sí tiene `deleted_at`.
- `detalle_pedidos`, `detalle_pedido_opcionales`, `historial_pedidos`, `producto_pedido`, `materia_prima_sucursal` y `reducciones_stock`: no tienen timestamps automáticos.
- `clientes`: tiene `created_at` y `updated_at`, pero no `deleted_at`.

---

## 3. Dominios y tablas

| Dominio | Tabla | Propósito |
|---|---|---|
| Identidad y acceso | `clientes` | Datos de clientes y credenciales. |
| Identidad y acceso | `empleados` | Datos de empleados, rol y sucursal asignada. |
| Red de entrega | `direcciones` | Direcciones de clientes. |
| Red de entrega | `sucursales` | Sucursales, dirección embebida y radio de cobertura. |
| Red de entrega | `sucursal_horarios` | Horarios de apertura y cierre por día. |
| Catálogo | `categorias` | Categorías de productos. |
| Catálogo | `productos` | Productos vendibles. |
| Catálogo | `categoria_producto` | Relación N:M entre productos y categorías. |
| Catálogo | `opcionales` | Opcionales configurables por producto. |
| Catálogo | `banners` | Banners del catálogo. |
| Abastecimiento y stock | `materias_primas` | Insumos utilizados en recetas. |
| Abastecimiento y stock | `producto_materia_prima` | Receta o BOM: materias primas por unidad de producto. |
| Abastecimiento y stock | `materia_prima_sucursal` | Stock de una materia prima en una sucursal. |
| Abastecimiento y stock | `reducciones_stock` | Auditoría de reducciones manuales de stock. |
| Promociones | `promociones` | Promociones compuestas y su vigencia. |
| Promociones | `promocion_producto` | Productos y cantidades que componen una promoción. |
| Pedidos | `pedidos` | Cabecera del pedido. |
| Pedidos | `detalle_pedidos` | Líneas del pedido con precio histórico. |
| Pedidos | `detalle_pedido_opcionales` | Opcionales elegidos por línea, con precio histórico. |
| Pedidos | `historial_pedidos` | Evolución de estados del pedido. |
| Pedidos | `producto_pedido` | Relación simple N:M entre productos y pedidos; se conserva por compatibilidad. |
| Configuración | `parametros` | Parámetros operativos clave-valor con metadata y auditoría de actualización. |

---

## 4. Entidades

### 4.1 `clientes`

Datos personales, credenciales y correo de acceso.

| Campo | Tipo | Nulo | Default | Restricciones y notas |
|---|---|---|---|---|
| `id_cliente` | `SERIAL` | No | — | PK autoincremental. |
| `nombre` | `VARCHAR(255)` | No | — | — |
| `apellido` | `VARCHAR(255)` | No | — | — |
| `tipo_doc` | `VARCHAR(255)` | Sí | — | Tipo de documento. |
| `dni` | `VARCHAR(255)` | Sí | — | No es único en el modelo. |
| `email` | `VARCHAR(255)` | No | — | Único; validación de email. |
| `password` | `VARCHAR(255)` | No | — | Hash de contraseña; nunca texto plano. |
| `created_at` | `TIMESTAMPTZ` | No | — | Timestamp de creación. |
| `updated_at` | `TIMESTAMPTZ` | No | — | Timestamp de actualización. |

**Relaciones:** 1:N con `direcciones` y `pedidos`.  
**Baja lógica:** no.  
**Notas:** el DNI se usa en recuperación de contraseña, pero no tiene restricción de unicidad.

---

### 4.2 `empleados`

Usuarios administrativos o de operación.

| Campo | Tipo | Nulo | Default | Restricciones y notas |
|---|---|---|---|---|
| `id_empleado` | `SERIAL` | No | — | PK autoincremental. |
| `nombre` | `VARCHAR(255)` | No | — | — |
| `apellido` | `VARCHAR(255)` | No | — | — |
| `rol` | `VARCHAR(255)` | No | `'ADMIN'` | Valores: `ADMIN`, `REPARTIDOR`, `EMPLEADO`. |
| `email` | `VARCHAR(255)` | Sí | — | Único; validación de email. |
| `password` | `VARCHAR(255)` | No | — | Hash de contraseña. |
| `id_sucursal` | `INTEGER` | Sí | — | FK a `sucursales.id_sucursal`; `ON DELETE SET NULL`. |
| `created_at` | `TIMESTAMPTZ` | No | — | Timestamp de creación. |
| `updated_at` | `TIMESTAMPTZ` | No | — | Timestamp de actualización. |
| `deleted_at` | `TIMESTAMPTZ` | Sí | — | Baja lógica. |

**Relaciones:** N:1 con `sucursales`; 1:N con `reducciones_stock`.  
**Baja lógica:** sí.  
**Notas:** un empleado sin sucursal no puede operar stock, pedidos ni reportes según las reglas de negocio.

---

### 4.3 `direcciones`

Direcciones de entrega registradas por los clientes.

| Campo | Tipo | Nulo | Default | Restricciones y notas |
|---|---|---|---|---|
| `id_direccion` | `SERIAL` | No | — | PK autoincremental. |
| `calle` | `VARCHAR(255)` | No | — | — |
| `altura` | `VARCHAR(255)` | No | — | Se almacena como texto. |
| `piso` | `VARCHAR(255)` | Sí | — | — |
| `departamento` | `VARCHAR(255)` | Sí | — | — |
| `ciudad` | `VARCHAR(255)` | No | — | — |
| `provincia` | `VARCHAR(255)` | No | — | — |
| `codigo_postal` | `VARCHAR(255)` | Sí | — | — |
| `latitud` | `DECIMAL(10, 7)` | Sí | — | Coordenada. |
| `longitud` | `DECIMAL(10, 7)` | Sí | — | Coordenada. |
| `id_cliente` | `INTEGER` | No | — | FK a `clientes.id_cliente`; `ON DELETE CASCADE`. |
| `created_at` | `TIMESTAMPTZ` | No | — | Timestamp de creación. |
| `updated_at` | `TIMESTAMPTZ` | No | — | Timestamp de actualización. |
| `deleted_at` | `TIMESTAMPTZ` | Sí | — | Baja lógica. |

**Relaciones:** N:1 con `clientes`; 1:N con `pedidos`.  
**Baja lógica:** sí.  
**Notas:** el esquema permite coordenadas nulas, pero el checkout y la asignación de sucursal las requieren. La baja lógica preserva la referencia desde pedidos históricos; no se guarda un snapshot completo de la dirección en el pedido.

---

### 4.4 `sucursales`

Sucursales desde las que se preparan y entregan pedidos.

| Campo | Tipo | Nulo | Default | Restricciones y notas |
|---|---|---|---|---|
| `id_sucursal` | `SERIAL` | No | — | PK autoincremental. |
| `nombre` | `VARCHAR(255)` | No | — | — |
| `estado` | `VARCHAR(255)` | No | `'activa'` | Valores: `activa`, `inactiva`, `cerrada`. |
| `telefono` | `VARCHAR(255)` | Sí | — | — |
| `calle` | `VARCHAR(255)` | No | — | Dirección embebida. |
| `altura` | `VARCHAR(255)` | No | — | — |
| `ciudad` | `VARCHAR(255)` | No | — | — |
| `provincia` | `VARCHAR(255)` | No | — | — |
| `codigo_postal` | `VARCHAR(255)` | Sí | — | — |
| `latitud` | `DECIMAL(10, 7)` | Sí | — | Coordenada. |
| `longitud` | `DECIMAL(10, 7)` | Sí | — | Coordenada. |
| `radio_km` | `DECIMAL(6, 2)` | No | `2.00` | Validación entre `0.1` y `100`. |
| `created_at` | `TIMESTAMPTZ` | No | — | Timestamp de creación. |
| `updated_at` | `TIMESTAMPTZ` | No | — | Timestamp de actualización. |
| `deleted_at` | `TIMESTAMPTZ` | Sí | — | Baja lógica. |

**Relaciones:** 1:N con `pedidos`, `empleados`, `sucursal_horarios`, `materia_prima_sucursal` y `reducciones_stock`.  
**Baja lógica:** sí.  
**Notas:** la dirección de la sucursal forma parte de la propia entidad; no se usa `direcciones` de cliente. Las coordenadas son nulas en el esquema, pero necesarias para calcular distancias.

---

### 4.5 `sucursal_horarios`

Horarios semanales de cada sucursal.

| Campo | Tipo | Nulo | Default | Restricciones y notas |
|---|---|---|---|---|
| `id_horario` | `SERIAL` | No | — | PK autoincremental. |
| `id_sucursal` | `INTEGER` | No | — | FK a `sucursales.id_sucursal`; `ON DELETE CASCADE`. |
| `dia_semana` | `SMALLINT` | No | — | Valores de `1` a `7`. |
| `hora_apertura` | `TIME` | No | — | Hora de apertura. |
| `hora_cierre` | `TIME` | No | — | Hora de cierre. |
| `deleted_at` | `TIMESTAMPTZ` | Sí | — | Baja lógica. |

**Índice único:** `(id_sucursal, dia_semana)`.  
**Timestamps:** solo `deleted_at`; no tiene `created_at` ni `updated_at`.  
**Relaciones:** N:1 con `sucursales`.  
**Notas:** una fila por sucursal y día. La zona horaria de negocio es `America/Argentina/Buenos_Aires`.

---

### 4.6 `categorias`

Categorías del catálogo.

| Campo | Tipo | Nulo | Default | Restricciones y notas |
|---|---|---|---|---|
| `id_categoria` | `SERIAL` | No | — | PK autoincremental. |
| `nombre` | `VARCHAR(255)` | No | — | Único. |
| `deleted_at` | `TIMESTAMPTZ` | Sí | — | Baja lógica. |

**Timestamps:** solo `deleted_at`; no tiene `created_at` ni `updated_at`.  
**Relaciones:** N:M con `productos` mediante `categoria_producto`.  
**Baja lógica:** sí.  
**Notas:** al recrear una categoría con el mismo nombre, el servicio reutiliza el registro existente.

---

### 4.7 `productos`

Productos vendibles del catálogo.

| Campo | Tipo | Nulo | Default | Restricciones y notas |
|---|---|---|---|---|
| `id_producto` | `SERIAL` | No | — | PK autoincremental. |
| `nombre` | `VARCHAR(255)` | No | — | — |
| `descripcion` | `TEXT` | Sí | — | — |
| `precio` | `DECIMAL(10, 2)` | No | — | Validación mayor o igual a `0`. |
| `imagen` | `VARCHAR(255)` | Sí | — | — |
| `estado` | `VARCHAR(255)` | No | `'disponible'` | Valores: `disponible`, `no_disponible`. |
| `created_at` | `TIMESTAMPTZ` | No | — | Timestamp de creación. |
| `updated_at` | `TIMESTAMPTZ` | No | — | Timestamp de actualización. |
| `deleted_at` | `TIMESTAMPTZ` | Sí | — | Baja lógica. |

**Relaciones:** N:M con `categorias`; N:M con `materias_primas`; 1:N con `opcionales` y `detalle_pedidos`; N:M con `pedidos` mediante `producto_pedido`; N:M con `promociones` mediante `promocion_producto`.  
**Baja lógica:** sí.  
**Notas:** no almacena stock. El stock del producto es derivado de su receta.

---

### 4.8 `categoria_producto`

Relación N:M entre productos y categorías.

| Campo | Tipo | Nulo | Default | Restricciones y notas |
|---|---|---|---|---|
| `id_categoria_producto` | `SERIAL` | No | — | PK autoincremental. |
| `id_producto` | `INTEGER` | No | — | FK a `productos.id_producto`; `ON DELETE CASCADE`. |
| `id_categoria` | `INTEGER` | No | — | FK a `categorias.id_categoria`; `ON DELETE CASCADE`. |
| `deleted_at` | `TIMESTAMPTZ` | Sí | — | Baja lógica. |

**Índice único:** `(id_producto, id_categoria)`.  
**Timestamps:** solo `deleted_at`; no tiene `created_at` ni `updated_at`.  
**Relaciones:** N:1 con `productos` y `categorias`.  
**Notas:** no contiene stock ni precios.

---

### 4.9 `opcionales`

Opcionales configurables de un producto.

| Campo | Tipo | Nulo | Default | Restricciones y notas |
|---|---|---|---|---|
| `id_opcional` | `SERIAL` | No | — | PK autoincremental. |
| `nombre` | `VARCHAR(255)` | No | — | — |
| `descripcion` | `TEXT` | Sí | — | — |
| `precio` | `DECIMAL(10, 2)` | No | `0.00` | Precio adicional; validación mayor o igual a `0`. |
| `estado` | `VARCHAR(255)` | No | `'disponible'` | Valores: `disponible`, `no_disponible`. |
| `id_producto` | `INTEGER` | No | — | FK a `productos.id_producto`; `ON DELETE CASCADE`. |
| `created_at` | `TIMESTAMPTZ` | No | — | Timestamp de creación. |
| `updated_at` | `TIMESTAMPTZ` | No | — | Timestamp de actualización. |
| `deleted_at` | `TIMESTAMPTZ` | Sí | — | Baja lógica. |

**Relaciones:** N:1 con `productos`; 1:N con `detalle_pedido_opcionales`.  
**Baja lógica:** sí.  
**Notas:** el precio del opcional se copia en `detalle_pedido_opcionales.precio` al crear el pedido.

---

### 4.10 `banners`

Banners promocionales del catálogo.

| Campo | Tipo | Nulo | Default | Restricciones y notas |
|---|---|---|---|---|
| `id_banner` | `SERIAL` | No | — | PK autoincremental. |
| `titulo` | `VARCHAR(255)` | No | — | — |
| `descripcion` | `TEXT` | Sí | — | — |
| `imagen` | `VARCHAR(500)` | No | — | — |
| `activo` | `BOOLEAN` | No | `true` | — |
| `orden` | `INTEGER` | No | `0` | Validación mayor o igual a `0`. |
| `created_at` | `TIMESTAMPTZ` | No | — | Timestamp de creación. |
| `updated_at` | `TIMESTAMPTZ` | No | — | Timestamp de actualización. |
| `deleted_at` | `TIMESTAMPTZ` | Sí | — | Baja lógica. |

**Relaciones:** ninguna.  
**Baja lógica:** sí.  
**Notas:** el catálogo consume solo banners activos, ordenados por `orden`.

---

### 4.11 `materias_primas`

Insumos utilizados en las recetas.

| Campo | Tipo | Nulo | Default | Restricciones y notas |
|---|---|---|---|---|
| `id_materia_prima` | `SERIAL` | No | — | PK autoincremental. |
| `nombre` | `VARCHAR(255)` | No | — | Único; validación no vacío. |
| `estado` | `VARCHAR(255)` | No | `'disponible'` | Valores: `disponible`, `no_disponible`. |
| `stock_minimo` | `INTEGER` | No | `0` | Validación mayor o igual a `0`. |
| `created_at` | `TIMESTAMPTZ` | No | — | Timestamp de creación. |
| `updated_at` | `TIMESTAMPTZ` | No | — | Timestamp de actualización. |
| `deleted_at` | `TIMESTAMPTZ` | Sí | — | Baja lógica. |

**Relaciones:** N:M con `sucursales` mediante `materia_prima_sucursal`; N:M con `productos` mediante `producto_materia_prima`; 1:N con `reducciones_stock`.  
**Baja lógica:** sí.  
**Notas:** no almacena stock global. El stock depende de la sucursal.

---

### 4.12 `producto_materia_prima`

Receta o BOM de cada producto.

| Campo | Tipo | Nulo | Default | Restricciones y notas |
|---|---|---|---|---|
| `id_producto` | `INTEGER` | No | — | PK y FK a `productos.id_producto`; `ON DELETE CASCADE`. |
| `id_materia_prima` | `INTEGER` | No | — | PK y FK a `materias_primas.id_materia_prima`; `ON DELETE CASCADE`. |
| `cantidad` | `INTEGER` | No | `1` | Unidades de materia prima por unidad de producto; validación mayor o igual a `1`. |
| `deleted_at` | `TIMESTAMPTZ` | Sí | — | Baja lógica. |

**PK compuesta:** `(id_producto, id_materia_prima)`.  
**Timestamps:** solo `deleted_at`; no tiene `created_at` ni `updated_at`.  
**Relaciones:** N:1 con `productos` y `materias_primas`.  
**Notas:** un producto sin filas activas en esta tabla se considera sin receta y, por lo tanto, no disponible para pedidos.

---

### 4.13 `materia_prima_sucursal`

Stock de una materia prima en una sucursal.

| Campo | Tipo | Nulo | Default | Restricciones y notas |
|---|---|---|---|---|
| `id_materia_prima` | `INTEGER` | No | — | PK y FK a `materias_primas.id_materia_prima`; `ON DELETE CASCADE`. |
| `id_sucursal` | `INTEGER` | No | — | PK y FK a `sucursales.id_sucursal`; `ON DELETE CASCADE`. |
| `stock` | `INTEGER` | No | `0` | Validación mayor o igual a `0`. |

**PK compuesta:** `(id_materia_prima, id_sucursal)`.  
**Timestamps:** no.  
**Relaciones:** N:1 con `materias_primas` y `sucursales`.  
**Notas:** si no existe la fila para una combinación, el stock se informa como `0`.

---

### 4.14 `reducciones_stock`

Auditoría de reducciones manuales de stock.

| Campo | Tipo | Nulo | Default | Restricciones y notas |
|---|---|---|---|---|
| `id_reduccion_stock` | `SERIAL` | No | — | PK autoincremental. |
| `id_sucursal` | `INTEGER` | No | — | FK a `sucursales.id_sucursal`; `ON DELETE RESTRICT`. |
| `id_materia_prima` | `INTEGER` | No | — | FK a `materias_primas.id_materia_prima`; `ON DELETE RESTRICT`. |
| `id_empleado` | `INTEGER` | No | — | FK a `empleados.id_empleado`; `ON DELETE RESTRICT`. |
| `cantidad` | `INTEGER` | No | — | Validación mayor o igual a `1`. |
| `stock_anterior` | `INTEGER` | No | — | Validación mayor o igual a `0`. |
| `stock_nuevo` | `INTEGER` | No | — | Validación mayor o igual a `0`. |
| `motivo` | `VARCHAR(255)` | No | — | Validación no vacío. |
| `fecha_hora` | `TIMESTAMPTZ` | No | `NOW()` | Fecha de la reducción. |

**Timestamps:** no; usa `fecha_hora`.  
**Relaciones:** N:1 con `sucursales`, `materias_primas` y `empleados`.  
**Notas:** registra snapshots de stock y usuario. No es un historial general de movimientos de stock; solo cubre reducciones manuales.

---

### 4.15 `promociones`

Promociones compuestas por productos.

| Campo | Tipo | Nulo | Default | Restricciones y notas |
|---|---|---|---|---|
| `id_promocion` | `SERIAL` | No | — | PK autoincremental. |
| `nombre` | `VARCHAR(255)` | No | — | — |
| `descripcion` | `TEXT` | Sí | — | — |
| `imagen` | `VARCHAR(255)` | Sí | — | — |
| `tipo` | `VARCHAR(255)` | No | — | Valores: `PRECIO_FIJO`, `PORCENTAJE`, `DOS_POR_UNO`. |
| `valor` | `DECIMAL(10, 2)` | No | `0.00` | Precio final o porcentaje según el tipo; validación mayor o igual a `0`. |
| `fecha_inicio` | `DATEONLY` | No | — | Inicio de vigencia. |
| `fecha_fin` | `DATEONLY` | No | — | Fin de vigencia. |
| `activa` | `BOOLEAN` | No | `true` | — |
| `created_at` | `TIMESTAMPTZ` | No | — | Timestamp de creación. |
| `updated_at` | `TIMESTAMPTZ` | No | — | Timestamp de actualización. |
| `deleted_at` | `TIMESTAMPTZ` | Sí | — | Baja lógica. |

**Relaciones:** N:M con `productos` mediante `promocion_producto`; 1:N con `detalle_pedidos`.  
**Baja lógica:** sí.  
**Notas:** las promociones son globales; no existe relación `promocion_sucursal`. La vigencia se valida en el servicio usando la zona horaria de Argentina.

---

### 4.16 `promocion_producto`

Productos y cantidades que componen una promoción.

| Campo | Tipo | Nulo | Default | Restricciones y notas |
|---|---|---|---|---|
| `id_promocion_producto` | `SERIAL` | No | — | PK autoincremental. |
| `id_promocion` | `INTEGER` | No | — | FK a `promociones.id_promocion`; `ON DELETE CASCADE`. |
| `id_producto` | `INTEGER` | No | — | FK a `productos.id_producto`; `ON DELETE CASCADE`. |
| `cantidad` | `INTEGER` | No | `1` | Unidades incluidas en el combo; validación mayor o igual a `1`. |
| `deleted_at` | `TIMESTAMPTZ` | Sí | — | Baja lógica. |

**Índice único:** `(id_promocion, id_producto)`.  
**Timestamps:** solo `deleted_at`; no tiene `created_at` ni `updated_at`.  
**Relaciones:** N:1 con `promociones` y `productos`.  
**Notas:** no guarda precio; el precio promocional se calcula al aplicar la promoción.

---

### 4.17 `pedidos`

Cabecera del pedido.

| Campo | Tipo | Nulo | Default | Restricciones y notas |
|---|---|---|---|---|
| `id_pedido` | `SERIAL` | No | — | PK autoincremental. |
| `fecha_hora` | `TIMESTAMPTZ` | No | `NOW()` | Fecha de creación del pedido. |
| `importe` | `DECIMAL(10, 2)` | No | `0.00` | Validación mayor o igual a `0`. |
| `estado` | `VARCHAR(255)` | No | `'Pendiente'` | Valores: `Pendiente`, `Confirmado`, `Preparando`, `Listo`, `En camino`, `Entregado`, `Cancelado`. |
| `id_cliente` | `INTEGER` | No | — | FK a `clientes.id_cliente`; `ON DELETE RESTRICT`. |
| `id_sucursal` | `INTEGER` | Sí | — | FK a `sucursales.id_sucursal`; `ON DELETE SET NULL`. |
| `id_direccion` | `INTEGER` | No | — | FK a `direcciones.id_direccion`; `ON DELETE RESTRICT`. |
| `deleted_at` | `TIMESTAMPTZ` | Sí | — | Baja lógica. |

**Timestamps:** `fecha_hora` funciona como `created_at`; no tiene `updated_at`.  
**Relaciones:** N:1 con `clientes`, `sucursales` y `direcciones`; 1:N con `detalle_pedidos`, `historial_pedidos` y `producto_pedido`.  
**Baja lógica:** sí.  
**Notas:** `id_sucursal` es nullable en el esquema, pero el servicio de pedidos la asigna. El estado `Listo` existe en la validación, aunque el flujo actual no lo utiliza.

---

### 4.18 `detalle_pedidos`

Líneas del pedido con precio histórico.

| Campo | Tipo | Nulo | Default | Restricciones y notas |
|---|---|---|---|---|
| `id_detalle` | `SERIAL` | No | — | PK autoincremental. |
| `id_pedido` | `INTEGER` | No | — | FK a `pedidos.id_pedido`; `ON DELETE CASCADE`. |
| `id_producto` | `INTEGER` | No | — | FK a `productos.id_producto`; `ON DELETE RESTRICT`. |
| `cantidad` | `INTEGER` | No | — | Validación mayor o igual a `1`. |
| `precio` | `DECIMAL(10, 2)` | No | — | Precio histórico de la línea; validación mayor o igual a `0`. |
| `observaciones` | `TEXT` | Sí | — | Observaciones del cliente. |
| `id_promocion` | `INTEGER` | Sí | — | FK a `promociones.id_promocion`; `ON DELETE SET NULL`. |
| `preparado` | `BOOLEAN` | No | `false` | Indica si el ítem fue preparado. |

**Timestamps:** no.  
**Relaciones:** N:1 con `pedidos`, `productos` y `promociones`; 1:N con `detalle_pedido_opcionales`.  
**Notas:** el precio no se reconstruye desde `productos.precio`. Las líneas generadas por una promoción también requieren `id_producto`, porque la columna es `NOT NULL`.

---

### 4.19 `detalle_pedido_opcionales`

Opcionales elegidos en cada línea del pedido.

| Campo | Tipo | Nulo | Default | Restricciones y notas |
|---|---|---|---|---|
| `id_detalle_opcional` | `SERIAL` | No | — | PK autoincremental. |
| `id_detalle` | `INTEGER` | No | — | FK a `detalle_pedidos.id_detalle`; `ON DELETE CASCADE`. |
| `id_opcional` | `INTEGER` | No | — | FK a `opcionales.id_opcional`; `ON DELETE RESTRICT`. |
| `precio` | `DECIMAL(10, 2)` | No | `0.00` | Precio histórico del opcional; validación mayor o igual a `0`. |

**Índice único:** `(id_detalle, id_opcional)`.  
**Timestamps:** no.  
**Relaciones:** N:1 con `detalle_pedidos` y `opcionales`.  
**Notas:** conserva el precio del opcional al momento del pedido.

---

### 4.20 `historial_pedidos`

Evolución histórica de los estados del pedido.

| Campo | Tipo | Nulo | Default | Restricciones y notas |
|---|---|---|---|---|
| `id_historial` | `SERIAL` | No | — | PK autoincremental. |
| `id_pedido` | `INTEGER` | No | — | FK a `pedidos.id_pedido`; `ON DELETE CASCADE`. |
| `estado` | `VARCHAR(255)` | No | — | Sin validación `isIn` en el modelo. |
| `fecha_hora` | `TIMESTAMPTZ` | No | `NOW()` | Fecha del cambio de estado. |

**Timestamps:** no; usa `fecha_hora`.  
**Relaciones:** N:1 con `pedidos`.  
**Notas:** cada cambio de estado genera una fila. La aplicación debe usar los mismos valores que `pedidos.estado`.

---

### 4.21 `producto_pedido`

Relación simple N:M entre productos y pedidos.

| Campo | Tipo | Nulo | Default | Restricciones y notas |
|---|---|---|---|---|
| `id_producto_pedido` | `SERIAL` | No | — | PK autoincremental. |
| `id_producto` | `INTEGER` | No | — | FK a `productos.id_producto`; `ON DELETE CASCADE`. |
| `id_pedido` | `INTEGER` | No | — | FK a `pedidos.id_pedido`; `ON DELETE CASCADE`. |

**Índice único:** `(id_producto, id_pedido)`.  
**Timestamps:** no.  
**Relaciones:** N:1 con `productos` y `pedidos`.  
**Notas:** se conserva por compatibilidad con el modelo original. No guarda cantidad, precio ni opcionales; por eso no reemplaza a `detalle_pedidos`. El controlador de pedidos todavía crea filas con `findOrCreate`.


---

### 4.22 `parametros`

Parámetros operativos configurables desde la administración.

| Campo | Tipo | Nulo | Default | Restricciones y notas |
|---|---|---|---|---|
| `id_parametro` | `SERIAL` | No | — | PK autoincremental. |
| `clave` | `VARCHAR(255)` | No | — | Única; validación no vacío. |
| `valor` | `VARCHAR(255)` | No | — | Valor serializado como string. |
| `tipo` | `VARCHAR(255)` | No | `string` | Valores: `string`, `integer`, `decimal`, `boolean`. |
| `grupo` | `VARCHAR(255)` | No | `general` | Agrupación para la UI. |
| `descripcion` | `VARCHAR(255)` | Sí | — | Texto explicativo. |
| `id_empleado_actualizacion` | `INTEGER` | Sí | — | FK a `empleados.id_empleado`; `ON DELETE SET NULL`. |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | No | — | Timestamps de Sequelize. |

**Timestamps:** sí.  
**Relaciones:** N:1 con `empleados` (último usuario que actualizó).  
**Notas:** los defaults y la metadata viven en `services/parametroService.js`; la tabla solo persiste overrides. No se usan migraciones: `sequelize.sync` crea la tabla.

---

## 5. Relaciones y cardinalidades

| Relación | Cardinalidad | Implementación |
|---|---|---|
| Cliente–Dirección | 1:N | `direcciones.id_cliente`. |
| Cliente–Pedido | 1:N | `pedidos.id_cliente`. |
| Dirección–Pedido | 1:N | `pedidos.id_direccion`. |
| Sucursal–Pedido | 1:N | `pedidos.id_sucursal` (nullable). |
| Sucursal–Empleado | 1:N | `empleados.id_sucursal` (nullable). |
| Sucursal–Horario | 1:N | `sucursal_horarios.id_sucursal`. |
| Producto–Categoría | N:M | `categoria_producto`. |
| Producto–Materia prima | N:M | `producto_materia_prima`, con `cantidad`. |
| Materia prima–Sucursal | N:M | `materia_prima_sucursal`, con `stock`. |
| Producto–Opcional | 1:N | `opcionales.id_producto`. |
| Producto–Pedido | N:M | `producto_pedido`. |
| Pedido–Detalle | 1:N | `detalle_pedidos.id_pedido`. |
| Producto–Detalle | 1:N | `detalle_pedidos.id_producto`. |
| Promoción–Producto | N:M | `promocion_producto`, con `cantidad`. |
| Promoción–Detalle | 1:N | `detalle_pedidos.id_promocion` (nullable). |
| Detalle–Opcional elegido | 1:N | `detalle_pedido_opcionales.id_detalle`. |
| Opcional–Opcional elegido | 1:N | `detalle_pedido_opcionales.id_opcional`. |
| Pedido–Historial | 1:N | `historial_pedidos.id_pedido`. |
| Materia prima–Reducción | 1:N | `reducciones_stock.id_materia_prima`. |
| Sucursal–Reducción | 1:N | `reducciones_stock.id_sucursal`. |
| Empleado–Reducción | 1:N | `reducciones_stock.id_empleado`. |

---

## 6. Estados y valores controlados

| Campo | Valores | Implementación |
|---|---|---|
| `pedidos.estado` | `Pendiente`, `Confirmado`, `Preparando`, `Listo`, `En camino`, `Entregado`, `Cancelado` | `VARCHAR` con validación `isIn`. |
| `historial_pedidos.estado` | Mismos valores esperados que `pedidos.estado` | `VARCHAR` sin validación en el modelo. |
| `empleados.rol` | `ADMIN`, `REPARTIDOR`, `EMPLEADO` | `VARCHAR` con validación `isIn`. |
| `productos.estado` | `disponible`, `no_disponible` | `VARCHAR` con validación `isIn`. |
| `materias_primas.estado` | `disponible`, `no_disponible` | `VARCHAR` con validación `isIn`. |
| `opcionales.estado` | `disponible`, `no_disponible` | `VARCHAR` con validación `isIn`. |
| `sucursales.estado` | `activa`, `inactiva`, `cerrada` | `VARCHAR` con validación `isIn`. |
| `promociones.tipo` | `PRECIO_FIJO`, `PORCENTAJE`, `DOS_POR_UNO` | `VARCHAR` con validación `isIn`. |
| `sucursal_horarios.dia_semana` | `1` a `7` | `SMALLINT` con validación de rango. |
| `detalle_pedidos.preparado` | `true`, `false` | `BOOLEAN`. |

No se usan tipos `ENUM` nativos de PostgreSQL; los valores se controlan con validaciones de Sequelize y lógica de servicio.

---

## 7. Reglas e invariantes

### 7.1 Precio histórico

- `detalle_pedidos.precio` guarda el precio utilizado al crear el pedido.
- `detalle_pedido_opcionales.precio` guarda el precio del opcional al crear el pedido.
- `pedidos.importe` se persiste y se calcula como `SUM(cantidad * precio)`.
- Cambios posteriores en `productos.precio`, `opcionales.precio` o `promociones.valor` no modifican pedidos históricos.
- Las líneas de promoción conservan `id_promocion` para poder reconstruir el combo.

### 7.2 Stock derivado de la receta

El stock no se almacena en `productos` ni en `categoria_producto`. Se calcula por sucursal:

```text
stock_producto(producto, sucursal) =
    min(floor(stock_materia_prima(sucursal) / cantidad_receta))
```

sobre todas las materias primas de la receta.

- Un producto sin filas en `producto_materia_prima` tiene stock `0` y no puede pedirse.
- Una materia prima sin fila en `materia_prima_sucursal` tiene stock `0`.
- `producto_materia_prima.cantidad` debe ser mayor o igual a `1`.
- Al crear un pedido se descuenta stock según la receta.
- Al cancelar un pedido se repone solo el stock no consumido: todo en `Pendiente`/`Confirmado`, solo las líneas con `preparado = false` en `Preparando`, y nada en `En camino`/`Listo`.
- Las reducciones manuales se auditan en `reducciones_stock` con stock anterior, stock nuevo, motivo y empleado.
- No hay una tabla general de movimientos de stock para todos los descuentos y reposiciones.

### 7.3 Pedido, dirección y sucursal

- `pedidos.id_cliente` es obligatorio.
- `pedidos.id_direccion` es obligatorio y debe pertenecer al cliente.
- `pedidos.id_sucursal` es nullable en el esquema, pero la capa de servicio asigna una sucursal válida.
- La sucursal debe estar activa, abierta, dentro de su radio y con stock suficiente.
- La dirección de la sucursal está embebida en `sucursales`; no se usa `direcciones`.
- El pedido no cambia de sucursal después de creado.

### 7.4 Promociones

- Las promociones son globales; no existe `promocion_sucursal`.
- Una promoción se aplica solo si `activa = true` y la fecha local de Argentina está dentro de `fecha_inicio` y `fecha_fin`.
- `promocion_producto` define la composición y las cantidades del combo.
- `detalle_pedidos.id_promocion` identifica las líneas generadas por una promoción.
- El precio promocional se conserva en `detalle_pedidos.precio`.

### 7.5 Baja lógica y direcciones históricas

- `direcciones` usa baja lógica para que los pedidos históricos sigan referenciando la fila.
- No se guarda un snapshot completo de la dirección en `pedidos`; se conserva la FK y la dirección no se borra físicamente.
- `clientes` no tiene baja lógica.
- `detalle_pedidos`, `historial_pedidos`, `detalle_pedido_opcionales` y `producto_pedido` se eliminan en cascada cuando se elimina físicamente un pedido.
- Las restricciones únicas siguen considerando filas con `deleted_at`; la reutilización de categorías y materias primas se resuelve en el servicio.
- Las tablas intermedias editables (`categoria_producto`, `producto_materia_prima`, `promocion_producto`, `sucursal_horarios`) usan baja lógica. Al reemplazar relaciones, las filas removidas se dan de baja y, si se vuelven a agregar, se restauran y actualizan en lugar de crear duplicados.

### 7.6 Importe del pedido

- `pedidos.importe` se calcula como la suma de `cantidad * precio` de sus detalles.
- Si el valor recibido difiere del calculado, el servicio lo autocorrige.
- No existe una entidad de pago ni un estado de pago en el modelo.

### 7.7 Restricciones de unicidad

| Restricción | Tabla | Campos |
|---|---|---|
| Email de cliente | `clientes` | `email`. |
| Email de empleado | `empleados` | `email` (nullable). |
| Nombre de categoría | `categorias` | `nombre`. |
| Nombre de materia prima | `materias_primas` | `nombre`. |
| Producto por categoría | `categoria_producto` | `(id_producto, id_categoria)`. |
| Opcional por detalle | `detalle_pedido_opcionales` | `(id_detalle, id_opcional)`. |
| Producto por pedido | `producto_pedido` | `(id_producto, id_pedido)`. |
| Producto por promoción | `promocion_producto` | `(id_promocion, id_producto)`. |
| Horario por sucursal y día | `sucursal_horarios` | `(id_sucursal, dia_semana)`. |
| Receta por producto y materia prima | `producto_materia_prima` | PK `(id_producto, id_materia_prima)`. |
| Stock por materia prima y sucursal | `materia_prima_sucursal` | PK `(id_materia_prima, id_sucursal)`. |
| Clave de parámetro | `parametros` | `clave` única. |

No hay índices explícitos adicionales en los modelos fuera de las PK y los índices únicos declarados. Las FK no tienen un índice explícito en los modelos.

### 7.8 Límites actuales del modelo

- No hay tablas de pagos, repartidores asignados, calificaciones ni notificaciones.
- No hay una tabla de carrito; el carrito vive en `localStorage`.
- No hay una tabla de snapshot de dirección; el pedido referencia la dirección y esta usa baja lógica.
- `producto_pedido` es redundante respecto de `detalle_pedidos` y no distingue líneas, cantidades ni opcionales.
- `pedidos.estado` incluye `Listo`, pero el flujo actual no lo usa.
- `clientes.dni` no es único.
- `direcciones.latitud`, `direcciones.longitud`, `sucursales.latitud` y `sucursales.longitud` son nullable en el esquema, aunque el negocio las requiera para asignar sucursal.
- `historial_pedidos.estado` no tiene validación `isIn` en el modelo.
- `categorias` no tiene `created_at` ni `updated_at`.
- `pedidos` no tiene `updated_at`.

---

## 8. Acciones referenciales

| FK | Tabla origen | Tabla destino | `ON UPDATE` | `ON DELETE` |
|---|---|---|---|---|
| `id_cliente` | `direcciones` | `clientes` | `CASCADE` | `CASCADE` |
| `id_sucursal` | `empleados` | `sucursales` | `CASCADE` | `SET NULL` |
| `id_cliente` | `pedidos` | `clientes` | `CASCADE` | `RESTRICT` |
| `id_sucursal` | `pedidos` | `sucursales` | `CASCADE` | `SET NULL` |
| `id_direccion` | `pedidos` | `direcciones` | `CASCADE` | `RESTRICT` |
| `id_pedido` | `detalle_pedidos` | `pedidos` | `CASCADE` | `CASCADE` |
| `id_producto` | `detalle_pedidos` | `productos` | `CASCADE` | `RESTRICT` |
| `id_promocion` | `detalle_pedidos` | `promociones` | `CASCADE` | `SET NULL` |
| `id_detalle` | `detalle_pedido_opcionales` | `detalle_pedidos` | `CASCADE` | `CASCADE` |
| `id_opcional` | `detalle_pedido_opcionales` | `opcionales` | `CASCADE` | `RESTRICT` |
| `id_pedido` | `historial_pedidos` | `pedidos` | `CASCADE` | `CASCADE` |
| `id_producto` | `producto_pedido` | `productos` | `CASCADE` | `CASCADE` |
| `id_pedido` | `producto_pedido` | `pedidos` | `CASCADE` | `CASCADE` |
| `id_producto` | `categoria_producto` | `productos` | `CASCADE` | `CASCADE` |
| `id_categoria` | `categoria_producto` | `categorias` | `CASCADE` | `CASCADE` |
| `id_producto` | `producto_materia_prima` | `productos` | `CASCADE` | `CASCADE` |
| `id_materia_prima` | `producto_materia_prima` | `materias_primas` | `CASCADE` | `CASCADE` |
| `id_materia_prima` | `materia_prima_sucursal` | `materias_primas` | `CASCADE` | `CASCADE` |
| `id_sucursal` | `materia_prima_sucursal` | `sucursales` | `CASCADE` | `CASCADE` |
| `id_promocion` | `promocion_producto` | `promociones` | `CASCADE` | `CASCADE` |
| `id_producto` | `promocion_producto` | `productos` | `CASCADE` | `CASCADE` |
| `id_sucursal` | `sucursal_horarios` | `sucursales` | `CASCADE` | `CASCADE` |
| `id_producto` | `opcionales` | `productos` | `CASCADE` | `CASCADE` |
| `id_sucursal` | `reducciones_stock` | `sucursales` | `CASCADE` | `RESTRICT` |
| `id_materia_prima` | `reducciones_stock` | `materias_primas` | `CASCADE` | `RESTRICT` |
| `id_empleado` | `reducciones_stock` | `empleados` | `CASCADE` | `RESTRICT` |
| `id_empleado_actualizacion` | `parametros` | `empleados` | `CASCADE` | `SET NULL` |

---

## 9. Mantenimiento

1. Si cambia un modelo, actualizar este documento y el DER.
2. Verificar que el DER siga reflejando las 21 tablas y sus relaciones.
3. Mantener las reglas de negocio en [`decisiones-negocio.md`](./decisiones-negocio.md).
4. Mantener los endpoints en [`endpoints.md`](./endpoints.md).
5. Si se corrige la tabla de arquitectura, actualizar [`arquitectura.md`](./arquitectura.md); actualmente menciona 11 tablas y lista 15, mientras que el modelo real tiene 21.

---

## 10. Referencias

- [`der-foodapp.md`](./der-foodapp.md): DER en Mermaid.
- [`der-foodapp.drawio`](./der-foodapp.drawio): DER editable.
- [`decisiones-negocio.md`](./decisiones-negocio.md): reglas de negocio y fundamentos.
- [`requerimientos-funcionales.md`](./requerimientos-funcionales.md): comportamiento esperado.
- [`endpoints.md`](./endpoints.md): API REST.
- [`arquitectura.md`](./arquitectura.md): arquitectura técnica.
- [`testing.md`](./testing.md): estrategia y cobertura de pruebas.
- `AGENTS.md` §5: modelo de datos de referencia del proyecto.
