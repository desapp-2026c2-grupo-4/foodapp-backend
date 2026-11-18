# Incrementos por sprint — Foodapp (BAJON)

## 1. Criterio de este documento

El proyecto no registra fechas formales de inicio y fin de sprint. Las fechas que aparecen aquí son **fechas de commits** tomadas del historial Git y sirven como evidencia de cuándo se integró cada incremento, no como calendario oficial.

- Repositorios: `foodapp-backend` y `foodapp-frontend`.
- Ramas observadas: `feature/basic-api`, `sprint2`, `sprint3`, `sprint4`, `sprint5` y `develop`.
- Al 2026-11-11, `sprint5` apunta al merge de `sprint4`; el trabajo de Sprint 5 está en el árbol de trabajo sin commit.
- La planificación original de sprints y objetivos está en [`AGENTS.md`](../../AGENTS.md).

Estados:

- **Entregado:** integrado en la rama principal/develop.
- **En curso:** implementado en el árbol de trabajo, sin cierre de sprint.
- **Pendiente:** planificado, sin implementación completa.
- **Diferido:** fuera del alcance de la primera versión.

---

## 2. Resumen cronológico

| Sprint | Duración planificada | Evidencia Git | Fecha de integración | Foco principal | Estado |
|---|---|---|---|---|---|
| Sprint 1 | 3 semanas | `dd96fba endpoints sprint 1` | 2026-09-08 | Base backend, modelos, API inicial, carrito/catálogo inicial | Entregado |
| Sprint 2 | 2 semanas | `3d3a4f4 agregado registro, estadisticas, abm productos y categorias` | 2026-09-23 | Registro, clientes, categorías, productos, promociones, reportes, panel admin inicial | Entregado |
| Sprint 3 | 2 semanas | `428ecfc add CRUD empleados, banner, map & tests` | 2026-10-07 | Auth, empleados, direcciones, banners, stock, mapas, primeros tests | Entregado |
| Sprint 4 | 3 semanas | `6cb34f1 cambio en asignacion de sucursal, implementacion de materias primas, baja logica` | 2026-10-29 | Materias primas, recetas, asignación de sucursal, horarios, baja lógica, seguridad, suite de tests | Entregado |
| Sprint 5 | 2 a 3 semanas | Sin commit de cierre | En curso | Reportes, recuperación de contraseña, administración de clientes, sucursales públicas, documentación, estabilización | En curso |

---

## 3. Sprint 1 — Base del sistema

**Objetivo original:** establecer la base del backend, la base de datos, la autenticación y la estructura inicial.

**Entregado según evidencia:**

- Estructura inicial del backend con Express, Sequelize y PostgreSQL.
- Modelos base: `Cliente`, `Direccion`, `Sucursal`, `Categoria`, `Producto`, `CategoriaProducto`, `Pedido`, `DetallePedido`, `HistorialPedido`, `ProductoPedido`, `ProductoSucursal`.
- Endpoints iniciales de productos, sucursales y pedidos.
- Seed y sincronización de base de datos.
- Documentación inicial de arquitectura y endpoints.
- Frontend inicial con carrito y catálogo.

**Diferido respecto de la planificación:**

- La autenticación completa no se integró en este sprint; llegó en Sprint 3.
- El modelo de stock por producto/sucursal se reemplazó luego por materias primas y recetas.
- La aplicación de repartidor quedó fuera de alcance.

**Criterio de cierre:** el backend responde endpoints básicos y el frontend puede listar productos y armar un carrito.

---

## 4. Sprint 2 — Clientes, catálogo y administración inicial

**Objetivo original:** implementar clientes, direcciones y sucursales; iniciar catálogo y carrito.

**Entregado según evidencia:**

- Registro de clientes y contexto de autenticación en frontend.
- CRUD administrativo inicial de productos y categorías.
- Opcionales por producto.
- Promociones con productos y cantidades.
- Primeros reportes y panel administrativo.
- Historial de pedidos del cliente.
- Mejoras de UI en catálogo, carrito, perfil y páginas administrativas.
- Servicios de categoría, cliente, opcional, promoción y sucursal en frontend.

**Diferencias respecto de la planificación:**

- Las direcciones con mapa y la autenticación completa se consolidaron en Sprint 3.
- La asignación de sucursal por distancia y stock se completó en Sprint 4.
- El CRUD de sucursales se amplió luego con horarios y radio de cobertura.

**Criterio de cierre:** un cliente puede registrarse, ver catálogo y el administrador puede gestionar productos, categorías y promociones básicas.

---

## 5. Sprint 3 — Autenticación, empleados, banners y mapas

**Objetivo original:** consolidar autenticación, roles, direcciones, sucursales y catálogo.

**Entregado según evidencia:**

- Login con JWT, hash bcrypt y roles `CLIENTE`, `EMPLEADO`, `ADMIN`.
- CRUD de empleados.
- CRUD de direcciones de clientes.
- CRUD de banners.
- Stock inicial por sucursal.
- Servicio de sucursales y cálculo de distancia.
- Mapa para seleccionar direcciones y visualizar sucursales.
- Filtros de pedidos y mejoras en la vista de empleado.
- Primeros tests de auth, clientes, pedidos y stock.
- Middlewares de autenticación, autorización y ownership.

**Diferido o corregido después:**

- La asignación de sucursal considerando stock y horarios se completó en Sprint 4.
- La baja lógica y la reutilización de nombres se consolidaron en Sprint 4.
- La cobertura de tests se amplió significativamente en Sprint 4.

**Criterio de cierre:** cliente y empleado pueden autenticarse; el administrador gestiona empleados, banners y direcciones; el catálogo muestra mapas.

---

## 6. Sprint 4 — Materias primas, stock derivado y operación

**Objetivo original:** completar el ciclo del pedido, stock, asignación de sucursal, historial y seguimiento.

**Entregado según evidencia:**

- Materias primas y recetas (`ProductoMateriaPrima`).
- Stock por materia prima y sucursal (`MateriaPrimaSucursal`).
- Stock derivado del producto a partir de la receta.
- Asignación de sucursal por cercanía, radio, horario y stock.
- Horarios por sucursal con cruce de medianoche.
- Baja lógica de entidades y liberación de emails de empleados.
- Autorización por rol y alcance de sucursal.
- Reducción manual de stock con auditoría.
- Mejoras de carrito: persistencia por usuario, fusión de invitado, repetición de pedido.
- Página de materias primas y alertas de bajo stock.
- Suite de tests ampliada: pedidos, promociones, seguridad, bajas lógicas, horarios, productos, sucursales.
- Actualización de DER, arquitectura y endpoints.

**Diferido o pendiente:**

- La cancelación de pedidos por cliente quedó con una brecha de autorización.
- El estado `Listo` no se incorporó al flujo operativo.
- La edición de direcciones no se implementó.
- Los reportes avanzados y la recuperación de contraseña quedaron para Sprint 5.

**Criterio de cierre:** un pedido se crea con sucursal asignada, descuenta stock por receta, avanza por estados y queda auditado; el administrador gestiona materias primas y stock.

---

## 7. Sprint 5 — Reportes, estabilización y documentación

**Objetivo original:** completar administración, reportes, promociones, tests, correcciones, validaciones y documentación.

**En curso en el árbol de trabajo (sin commit de cierre):**

- Backend de reportes: ventas, estados, tiempos, cancelaciones, sucursales, productos, clientes, promociones e impacto.
- Frontend de reportes con filtros, gráficos y tablas.
- Recuperación de contraseña con email + DNI y token temporal.
- Administración de clientes con listado, detalle y segmentación.
- Página pública de sucursales con mapa y horarios.
- Mejoras de perfil, login, registro y checkout.
- Reducción de stock con motivo y auditoría.
- Documentación funcional: alcance, decisiones, requerimientos, historias, sprints, testing e identidad visual.
- Ajustes de tests y schemas.

**Pendiente para cerrar Sprint 5:**

- Corregir la cancelación de pedidos por cliente o retirar la acción de la UI.
- Ejecutar y estabilizar la suite completa de backend.
- Agregar pruebas de frontend o documentar formalmente su ausencia.
- Revisar consistencia de documentación y enlaces.
- Completar criterios de aceptación de reportes y recuperación de contraseña.
- Decidir si `Listo` se implementa o se elimina del modelo.
- Resolver el uso de `.env` versionado en frontend.

**Criterio de cierre propuesto:** el administrador puede consultar reportes, el cliente puede recuperar su contraseña, la administración de clientes y sucursales está completa, y la suite de pruebas pasa sin fallos.

---

## 8. Trazabilidad sprint → módulos

| Módulo | Sprint 1 | Sprint 2 | Sprint 3 | Sprint 4 | Sprint 5 |
|---|---|---|---|---|---|
| Autenticación | Base | Registro | Login/JWT/roles | Ownership | Recuperación |
| Clientes | Modelo | Registro/consulta | Direcciones | Baja lógica | Admin y segmentación |
| Catálogo | Productos | Categorías/opcionales | Banners/mapas | Recetas/stock | Ajustes UI |
| Promociones | Modelo | CRUD | — | Validaciones | Reportes |
| Carrito | Inicial | Persistencia | Checkout | Fusión/repetir | Ajustes |
| Pedidos | Modelo/API | Historial | Filtros/empleado | Asignación/estados/stock | Reportes |
| Sucursales | Modelo/API | CRUD inicial | Mapa | Horarios/radio | Página pública |
| Stock | Producto-sucursal | — | Stock inicial | Materias primas/recetas/auditoría | Reportes/alertas |
| Empleados | — | Modelo | CRUD | Baja lógica | — |
| Reportes | — | Iniciales | Ampliación | — | Suite completa |
| Documentación | Arquitectura/endpoints | Endpoints | Endpoints | DER/arquitectura | Documentación funcional |

---

## 9. Deuda y riesgos al cierre del Sprint 4

| Tema | Impacto | Estado |
|---|---|---|
| Cancelación de cliente con `requireStaff` | La acción visible en la UI devolvía `403` | Resuelto: cliente cancela hasta `En camino` |
| `Listo` en esquema sin uso | Confusión de estados | Pendiente de decisión |
| Sin tests de frontend | Regresiones no detectadas | Pendiente |
| `.env` versionado en frontend | Riesgo de configuración/secretos | Pendiente |
| Fechas de sprint no registradas | Trazabilidad histórica limitada | Documentado con Git |
| Promociones por sucursal | No implementadas | Diferido |
| App de repartidor | No implementada | Diferido |
| Pagos online | No implementados | Diferido |
| Envío real de emails | No implementado | Diferido |

Las brechas funcionales se detallan en [`alcance-funcional.md`](./alcance-funcional.md) y las reglas afectadas en [`decisiones-negocio.md`](./decisiones-negocio.md).
