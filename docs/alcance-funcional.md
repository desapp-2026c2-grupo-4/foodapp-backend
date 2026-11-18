# Alcance funcional — Foodapp (BAJON)

## 1. Propósito

Este documento define qué funcionalidades cubre la plataforma, quiénes la usan y qué queda fuera del alcance de la versión actual. Es la referencia para validar requerimientos, historias de usuario e incrementos.

La documentación técnica complementaria está en:

- [`arquitectura.md`](./arquitectura.md)
- [`der-foodapp.md`](./der-foodapp.md)
- [`endpoints.md`](./endpoints.md)

---

## 2. Descripción del producto

BAJON es una plataforma de pedidos y delivery para una cadena de casas de comidas rápidas. El sistema permite que un cliente consulte el catálogo, arme un carrito, elija una dirección y realice un pedido. El backend asigna una sucursal según cobertura, distancia, horario y stock, y el personal de la sucursal gestiona la preparación y el avance del pedido.

La solución es un **monolito modular** con:

- Un frontend React con vistas diferenciadas para cliente, empleado y administrador.
- Un backend REST con Node.js, Express, Sequelize y PostgreSQL.
- Autenticación JWT y autorización por roles.
- Persistencia del carrito en el navegador, separada por usuario.

---

## 3. Actores y roles

| Actor | Acceso | Responsabilidades principales |
|---|---|---|
| Visitante | Catálogo, promociones, banners, login y registro | Consultar productos y promociones, registrarse como cliente y armar un carrito temporal. |
| Cliente | Rutas de cliente autenticado | Gestionar su perfil y direcciones, comprar, consultar sus pedidos y repetir un pedido. |
| Empleado | Rutas de personal, limitadas a su sucursal | Gestionar pedidos de su sucursal, marcar ítems preparados, avanzar estados, consultar stock y reportes de su sucursal. |
| Administrador | Rutas administrativas globales | Gestionar catálogo, categorías, materias primas, stock, sucursales, promociones, banners, empleados, clientes y reportes. |
| Repartidor | Rol previsto en el modelo de empleados | No tiene aplicación ni flujo operativo implementado en esta versión. |

> El rol `REPARTIDOR` puede existir como valor de `Empleado.rol`, pero no hay pantallas, asignación de entregas ni seguimiento de repartidor implementados.

---

## 4. Funcionalidades incluidas

### 4.1 Acceso y cuentas

- Registro público de clientes con nombre, apellido, DNI, email y contraseña.
- Login de clientes y empleados con email y contraseña.
- Logout del lado del cliente.
- Recuperación de contraseña mediante email + DNI y token temporal.
- Restablecimiento de contraseña con token.
- Cambio de contraseña autenticado con contraseña actual.
- Sesión persistida en `localStorage` y cierre automático ante respuestas `401`.
- Roles `CLIENTE`, `EMPLEADO`, `ADMIN` y `REPARTIDOR` en el modelo; la aplicación usa los tres primeros.
- Protección de rutas del frontend y de endpoints del backend por rol y alcance.

### 4.2 Clientes y direcciones

- Consulta y edición del perfil propio del cliente.
- Email inmutable como credencial de acceso.
- Alta, listado y baja lógica de direcciones del cliente.
- Selección de una dirección existente o alta de una nueva durante el checkout.
- Geocodificación y selección de ubicación mediante mapa (Nominatim/OpenStreetMap).
- Administración de clientes: listado, búsqueda, resumen de compras, detalle e historial.

### 4.3 Catálogo y contenido

- Listado y detalle público de productos.
- Categorías con relación N:M con productos.
- Productos con descripción, precio, imagen, estado, categorías, receta y opcionales.
- Opcionales por producto con precio adicional.
- Promociones compuestas por productos y cantidades.
- Banners activos en el catálogo, ordenables y administrables.
- Filtros de catálogo por categoría, rango de precio y visualización de promociones.
- Disponibilidad de producto según estado y receta.

### 4.4 Carrito

- Agregado de productos con cantidad, opcionales y observaciones.
- Agregado de promociones como combo.
- Modificación de cantidades, observaciones y eliminación de ítems.
- Cálculo de total con opcionales y promociones.
- Persistencia en `localStorage` por cliente, empleado o invitado.
- Fusión del carrito de invitado con el carrito del cliente al iniciar sesión.
- Confirmación del pedido desde el carrito y vaciado posterior.
- Repetición de un pedido histórico reconstruyendo el carrito.

### 4.5 Pedidos

- Creación de pedidos con cliente, dirección y detalles.
- Detalles de producto suelto o promoción, con cantidad, precio histórico y observaciones.
- Asignación automática de sucursal o validación de una sucursal explícita.
- Cálculo de importe a partir de los detalles.
- Descuento transaccional de stock según la receta.
- Historial de estados por pedido.
- Flujo operativo de estados en un solo sentido.
- Confirmación de ítems preparados por parte del personal.
- Cálculo de distancia y tiempo estimado de entrega.
- Consulta de pedidos según rol: cliente propios, empleado de su sucursal, administrador todos.
- Cancelación de pedidos por el cliente hasta `En camino`, con reposición de stock según el estado y los ítems preparados.
- Baja lógica de pedidos por parte del administrador.
- Repetición de pedidos desde el historial del cliente.

### 4.6 Stock y materias primas

- CRUD de materias primas con estado y stock mínimo.
- Stock por materia prima y sucursal.
- Cálculo de stock derivado de producto a partir de la receta.
- Alta manual de stock.
- Reducción manual de stock con motivo, usuario y snapshots anterior/nuevo.
- Historial de las últimas reducciones manuales por sucursal.
- Alerta visual de bajo stock.
- Productos sin receta se consideran no disponibles y no pueden pedirse.

### 4.7 Sucursales y cobertura

- CRUD de sucursales con dirección embebida.
- Coordenadas de sucursal para cálculo de distancia.
- Radio de cobertura configurable por sucursal.
- Horarios por día con posibilidad de rangos que cruzan medianoche.
- Estado operativo `activa`, `inactiva` o `cerrada`.
- Cálculo de `abierta_ahora` según estado y horario en zona horaria de Argentina.
- Vista pública de sucursales con mapa y horarios.
- Selección de sucursal en la administración y validación de cobertura al crear pedidos.

### 4.8 Administración

- CRUD de productos, categorías, materias primas, sucursales, promociones, banners y empleados.
- Gestión de recetas y opcionales por producto.
- Gestión de stock por sucursal.
- Consulta de clientes y métricas de compra.
- Reportes de pedidos, sucursales, productos, clientes y promociones.
- Filtros por sucursal, rango de fechas, agrupación, límite y días de inactividad.
- Baja lógica y reactivación de entidades cuando corresponde.
- Restricciones para evitar que un administrador se dé de baja a sí mismo.

### 4.9 Reportes

El backend expone reportes para personal y administración:

- Pedidos por día.
- Pedidos por estado.
- Tiempo promedio de entrega.
- Pedidos cancelados.
- Resumen por sucursal.
- Productos vendidos por sucursal.
- Clientes top.
- Clientes nuevos.
- Clientes inactivos.
- Reporte de productos.
- Reporte de promociones.
- Impacto de promociones.

Los empleados solo pueden consultar datos de su sucursal. Los administradores pueden consultar todas o filtrar por sucursal.

---

## 5. Fuera de alcance de esta versión

Las siguientes funcionalidades no están implementadas o no forman parte del alcance actual:

- Aplicación o flujo operativo para repartidores.
- Asignación de repartidor a pedidos y seguimiento en tiempo real.
- Pagos online, integración con pasarelas de pago o facturación electrónica.
- Envío real de emails; la recuperación de contraseña devuelve un token al frontend.
- Notificaciones push, email o SMS.
- Calificaciones de productos, pedidos o sucursales.
- Promociones específicas por sucursal; las promociones son globales.
- Cupones, códigos promocionales o reglas de descuento combinadas.
- Gestión de múltiples carritos simultáneos para un mismo usuario.
- Edición de direcciones existentes; solo alta, listado y baja.
- Edición de pedidos por parte del cliente después de crearlos.
- Edición de la sucursal de un pedido una vez creado.
- Microservicios, mensajería asíncrona o arquitectura event-driven.
- Internacionalización; la interfaz está en español y usa pesos argentinos.

---

## 6. Restricciones y supuestos

- **Base de datos:** PostgreSQL.
- **ORM:** Sequelize.
- **Autenticación:** JWT con expiración configurable (`JWT_EXPIRES_IN`, por defecto `12h`).
- **Contraseñas:** bcrypt con salt rounds 10; nunca se devuelven en las respuestas.
- **Zona horaria:** `America/Argentina/Buenos_Aires` por defecto para horarios, promociones y reportes.
- **Moneda:** pesos argentinos, formato `$` con dos decimales.
- **Idioma:** español rioplatense en la interfaz.
- **Persistencia del carrito:** navegador del usuario; no hay carrito persistido en el backend.
- **Cobertura:** un pedido se asigna a una sucursal activa, abierta, dentro de su radio y con stock suficiente.
- **Stock:** se controla por materia prima y sucursal; el stock del producto es derivado.
- **Historial:** los pedidos conservan precios, promociones, opcionales y referencias históricas mediante baja lógica.
- **Seguridad:** las restricciones del frontend son de experiencia de usuario; la autorización real está en el backend.

---

## 7. Brechas y limitaciones conocidas

Estas situaciones están presentes en el código actual y deben considerarse al planificar correcciones:

1. **Estado `Listo`:** existe en el esquema y en el badge, pero el flujo lineal usado por empleados es `Pendiente → Confirmado → Preparando → En camino → Entregado`. `Listo` no se utiliza en la operación actual.
2. **Direcciones:** no hay endpoint de edición; para corregir una dirección el cliente debe darla de baja y crear otra.
3. **Recuperación de contraseña:** no se envía un correo; el token se muestra/retorna al frontend para completar el cambio.
4. **Promociones por sucursal:** no implementadas; todas las promociones son globales.
5. **Aplicación de repartidor:** no implementada.
6. **Pruebas de frontend:** no hay framework automatizado; la validación es build, lint y pruebas manuales.

---

## 8. Criterios de aceptación globales

La versión actual se considera funcional cuando:

- Un visitante puede ver el catálogo y las promociones activas.
- Un cliente puede registrarse, iniciar sesión, cargar una dirección y confirmar un pedido.
- El backend asigna una sucursal válida y descuenta stock según la receta.
- El cliente puede consultar el pedido y su historial.
- Un empleado puede ver los pedidos de su sucursal y avanzar estados.
- Un administrador puede gestionar el catálogo, el stock, las sucursales y las promociones.
- Los reportes respetan el rol y el alcance por sucursal.
- Las pruebas del backend pasan y el frontend compila.

El detalle verificable está en [`requerimientos-funcionales.md`](./requerimientos-funcionales.md), [`historias-usuario.md`](./historias-usuario.md) y [`testing.md`](./testing.md).
