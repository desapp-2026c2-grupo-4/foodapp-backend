# Requerimientos funcionales — Foodapp (BAJON)

## 1. Convenciones

- **ID:** identificador estable del requerimiento.
- **Prioridad:** `Must` (imprescindible), `Should` (importante), `Could` (deseable).
- **Actor:** rol que origina o consume la funcionalidad.
- **Criterio de aceptación:** condición verificable y breve. El detalle de pruebas está en [`testing.md`](./testing.md).
- **Estado:** implementado en el código actual, salvo que se indique lo contrario.

Los requerimientos se agrupan por módulo y se relacionan con las historias de [`historias-usuario.md`](./historias-usuario.md).

---

## 2. Autenticación y cuentas

| ID | Prioridad | Actor | Requerimiento | Criterio de aceptación |
|---|---|---|---|---|
| RF-AUTH-01 | Must | Visitante | Registrarse como cliente con nombre, apellido, DNI, email y contraseña. | `POST /api/auth/register` devuelve `201` con token y usuario `CLIENTE`; email duplicado devuelve `409`; contraseña menor a 6 devuelve `400`. |
| RF-AUTH-02 | Must | Visitante | Iniciar sesión con email y contraseña, tanto cliente como empleado. | `POST /api/auth/login` devuelve token y usuario con su rol; credenciales inválidas devuelven `401` sin distinguir email inexistente. |
| RF-AUTH-03 | Must | Cliente/Empleado/Admin | Cerrar sesión desde el frontend. | El token y el usuario se eliminan de `localStorage`; las rutas protegidas redirigen al inicio. |
| RF-AUTH-04 | Must | Visitante | Recuperar contraseña verificando email y DNI. | `POST /api/auth/password/recuperar` devuelve un `resetToken` de 15 minutos si los datos coinciden; si no, devuelve `400` sin revelar la causa. |
| RF-AUTH-05 | Must | Visitante | Restablecer contraseña con token temporal. | `POST /api/auth/password/restablecer` actualiza el hash y permite login con la nueva contraseña; token inválido o vencido devuelve `400`. |
| RF-AUTH-06 | Must | Cliente | Cambiar contraseña autenticado con la contraseña actual. | `PUT /api/clientes/:id/password` valida la actual; incorrecta devuelve `401`; nueva menor a 6 devuelve `400`. |
| RF-AUTH-07 | Must | Sistema | No permitir cambiar el email de un cliente. | `PUT /api/clientes/:id` ignora o rechaza `email`; el email sigue siendo la credencial de acceso. |
| RF-AUTH-08 | Must | Sistema | Almacenar contraseñas con bcrypt y no exponerlas. | La base guarda hash; las respuestas de clientes y empleados no incluyen `password`. |
| RF-AUTH-09 | Must | Sistema | Diferenciar roles y proteger rutas. | El backend devuelve `401` sin token y `403` cuando el rol o alcance no autoriza; el frontend redirige o muestra acceso denegado. |
| RF-AUTH-10 | Should | Sistema | Migrar contraseñas antiguas en texto plano al primer login exitoso. | Un registro legado se actualiza a hash bcrypt sin cambiar la contraseña del usuario. |

---

## 3. Clientes y direcciones

| ID | Prioridad | Actor | Requerimiento | Criterio de aceptación |
|---|---|---|---|---|
| RF-CLI-01 | Must | Cliente | Consultar y editar el perfil propio. | `GET /api/clientes/:id` y `PUT /api/clientes/:id` funcionan para el propio cliente; otro cliente recibe `403`. |
| RF-CLI-02 | Must | Admin | Crear, listar y consultar clientes. | `POST/GET /api/clientes` requieren `ADMIN`; las respuestas no incluyen contraseñas. |
| RF-CLI-03 | Must | Admin | Ver resumen de compras por cliente. | `GET /api/clientes/resumen` devuelve pedidos totales, entregados, activos, cancelados, gasto, ticket promedio, primera/última compra y sucursal favorita. |
| RF-CLI-04 | Must | Admin | Actualizar datos de un cliente. | `PUT /api/clientes/:id` permite nombre, apellido, tipo y DNI; email no se modifica; DNI vacío se rechaza. |
| RF-CLI-05 | Must | Admin | Consultar el detalle de un cliente con sus direcciones e historial. | La vista administrativa muestra datos, métricas, direcciones, productos más pedidos y pedidos del cliente. |
| RF-DIR-01 | Must | Cliente/Admin | Listar las direcciones de un cliente. | `GET /api/clientes/:id/direcciones` devuelve solo las direcciones del cliente; el cliente solo puede consultar las propias. |
| RF-DIR-02 | Must | Cliente/Admin | Crear una dirección con calle, altura, ciudad, provincia y coordenadas. | `POST /api/clientes/:id/direcciones` devuelve `201`; sin coordenadas o campos obligatorios devuelve `400`. |
| RF-DIR-03 | Must | Cliente/Admin | Dar de baja una dirección. | `DELETE /api/clientes/:id/direcciones/:idDireccion` hace baja lógica y devuelve confirmación; una dirección de otro cliente devuelve `404`. |
| RF-DIR-04 | Must | Cliente | Seleccionar la dirección de entrega al confirmar un pedido. | El checkout exige una dirección; el backend valida que pertenezca al cliente y devuelve `400` si no coincide. |
| RF-DIR-05 | Should | Cliente | Crear una dirección nueva desde el checkout o el perfil. | La nueva dirección queda disponible para el pedido y en el listado del perfil. |
| RF-DIR-06 | Should | Cliente | Ubicar la dirección en un mapa y autocompletar datos. | El mapa permite seleccionar coordenadas y completa calle, altura, ciudad, provincia y código postal cuando el geocodificador responde. |

---

## 4. Catálogo, categorías y contenido

| ID | Prioridad | Actor | Requerimiento | Criterio de aceptación |
|---|---|---|---|---|
| RF-CAT-01 | Must | Visitante/Cliente | Listar y consultar productos públicamente. | `GET /api/productos` y `GET /api/productos/:id` devuelven productos con categorías, receta y opcionales; no exponen stock. |
| RF-CAT-02 | Must | Visitante/Cliente | Listar y consultar categorías públicamente. | `GET /api/categorias` y `GET /api/categorias/:id` devuelven categorías con sus productos. |
| RF-CAT-03 | Must | Admin | Crear, modificar y dar de baja productos. | `POST/PUT/DELETE /api/productos` requieren `ADMIN`; se validan nombre y precio; las relaciones se actualizan en transacción. |
| RF-CAT-04 | Must | Admin | Asignar una o más categorías a un producto. | `categorias` acepta un array de ids; una categoría inexistente devuelve `404` y no deja el producto a medio crear. |
| RF-CAT-05 | Must | Admin | Definir la receta de un producto con materias primas y cantidades. | `materiasPrimas` acepta `{id_materia_prima, cantidad}` con cantidad entera mayor o igual a 1; una receta inválida devuelve `400`. |
| RF-CAT-06 | Must | Admin | Gestionar el estado del producto. | Solo se aceptan `disponible` y `no_disponible`; el catálogo deshabilita la compra si no está disponible. |
| RF-CAT-07 | Must | Admin | Gestionar opcionales por producto. | `POST /api/productos/:id/opcionales`, `PUT/DELETE /api/opcionales/:id` permiten nombre, descripción, precio y estado. |
| RF-CAT-08 | Must | Visitante/Cliente | Ver opcionales y su precio adicional en el catálogo. | El producto muestra checkboxes de opcionales; el precio adicional se suma al agregar al carrito. |
| RF-CAT-09 | Must | Visitante/Cliente | Ver banners activos en el catálogo. | `GET /api/banners?activo=true` devuelve solo activos, ordenados por `orden`; el catálogo los muestra en carrusel. |
| RF-CAT-10 | Must | Admin | Crear, modificar, activar/desactivar y dar de baja banners. | Las mutaciones requieren `ADMIN`; se validan título e imagen; la baja es lógica. |
| RF-CAT-11 | Must | Visitante/Cliente | Ver promociones activas y vigentes. | `GET /api/promociones` devuelve `vigente`; el catálogo muestra solo promociones vigentes. |
| RF-CAT-12 | Must | Admin | Crear, modificar, activar/desactivar y dar de baja promociones. | Las mutaciones requieren `ADMIN`; se validan tipo, valor, fechas y productos; la operación es transaccional. |
| RF-CAT-13 | Must | Visitante/Cliente | Filtrar productos por categoría y rango de precio. | El catálogo permite seleccionar varias categorías y definir precio mínimo/máximo; los resultados se actualizan en pantalla. |
| RF-CAT-14 | Should | Visitante/Cliente | Ver solo promociones. | El filtro “Solo promociones” oculta la sección de productos y muestra las promociones vigentes. |
| RF-CAT-15 | Should | Visitante/Cliente | Ver sucursales en mapa. | La vista de sucursales muestra tarjetas, horarios, estado operativo, radio y marcadores en OpenStreetMap. |

---

## 5. Carrito

| ID | Prioridad | Actor | Requerimiento | Criterio de aceptación |
|---|---|---|---|---|
| RF-CAR-01 | Must | Visitante/Cliente | Agregar un producto al carrito con cantidad, opcionales y observaciones. | El ítem se agrega o acumula si coincide producto y opcionales; el total se actualiza. |
| RF-CAR-02 | Must | Visitante/Cliente | Agregar una promoción como combo. | El combo se agrega como ítem con su precio promocional y detalle de productos; se puede cambiar la cantidad. |
| RF-CAR-03 | Must | Visitante/Cliente | Modificar cantidad y observaciones, eliminar ítems y vaciar el carrito. | Los cambios se reflejan en pantalla y en el total; vaciar deja el carrito en 0 y persiste el estado vacío. |
| RF-CAR-04 | Must | Visitante/Cliente | Calcular el total del carrito. | El total suma productos, opcionales y promociones según cantidad. |
| RF-CAR-05 | Must | Sistema | Persistir el carrito en el navegador por usuario. | El carrito sobrevive a recargas; cada cliente/empleado tiene su clave; el invitado usa una clave separada. |
| RF-CAR-06 | Must | Sistema | Fusionar el carrito de invitado al iniciar sesión como cliente. | Los ítems coincidentes suman cantidad; los exclusivos se agregan; el carrito guest se elimina. |
| RF-CAR-07 | Must | Cliente | Confirmar el pedido desde el carrito. | El checkout exige cliente y dirección, crea el pedido y vacía el carrito; si falla, el carrito se conserva. |
| RF-CAR-08 | Should | Cliente | Repetir un pedido histórico. | El carrito se reconstruye con productos, opcionales, cantidades y observaciones; si la promoción no está vigente, se agregan sus productos sueltos. |
| RF-CAR-09 | Should | Cliente | Ver un resumen del pedido confirmado. | La confirmación muestra número, sucursal, importe y tiempo estimado cuando hay coordenadas. |

---

## 6. Pedidos

| ID | Prioridad | Actor | Requerimiento | Criterio de aceptación |
|---|---|---|---|---|
| RF-PED-01 | Must | Cliente/Admin | Crear un pedido con cliente, dirección y detalles. | `POST /api/pedidos` devuelve `201`, estado `Pendiente` por defecto, importe calculado e historial inicial. |
| RF-PED-02 | Must | Cliente/Admin | Incluir productos sueltos o promociones en el detalle. | Cada detalle acepta `id_producto` o `id_promocion` (excluyentes) y cantidad mayor o igual a 1. |
| RF-PED-03 | Must | Cliente | Elegir una dirección de entrega existente. | El backend valida que la dirección pertenezca al cliente; si no, devuelve `400`. |
| RF-PED-04 | Must | Sistema | Asignar una sucursal automáticamente. | Sin `id_sucursal`, se elige la activa, abierta, dentro del radio y con stock suficiente, priorizando la más cercana. |
| RF-PED-05 | Must | Cliente/Admin | Enviar una sucursal explícita. | Si se envía, debe existir, estar activa, abierta y dentro de su radio; si no, devuelve `409` o `400` según el caso. |
| RF-PED-06 | Must | Sistema | Calcular distancia y tiempo estimado. | La respuesta incluye `distancia_km` y `tiempo_estimado_min`; si faltan coordenadas, ambos son `null`. |
| RF-PED-07 | Must | Sistema | Guardar precio histórico, opcionales y observaciones en el detalle. | `DetallePedido` conserva cantidad, precio, observaciones, `id_promocion` y opcionales con su precio. |
| RF-PED-08 | Must | Sistema | Calcular y persistir el importe del pedido. | `importe = SUM(cantidad * precio)`; si un valor manual difiere, se autocorrige. |
| RF-PED-09 | Must | Sistema | Descontar stock según la receta al crear el pedido. | Si no hay stock suficiente, el pedido no se crea y se hace rollback; si alcanza, el stock disminuye. |
| RF-PED-10 | Must | Cliente | Consultar solo sus pedidos. | `GET /api/pedidos` filtra por `id_cliente`; un cliente no puede consultar pedidos ajenos. |
| RF-PED-11 | Must | Empleado | Consultar pedidos de su sucursal. | `GET /api/pedidos` filtra por `id_sucursal` del empleado; no puede consultar otra sucursal. |
| RF-PED-12 | Must | Admin | Consultar todos los pedidos y filtrar por cliente o sucursal. | `GET /api/pedidos` acepta filtros; el admin no está limitado por sucursal. |
| RF-PED-13 | Must | Cliente/Empleado/Admin | Ver el detalle de un pedido con productos, opcionales, promoción, historial, distancia y tiempo estimado. | `GET /api/pedidos/:id` y `/detalles` respetan permisos y devuelven importe calculado. |
| RF-PED-14 | Must | Empleado/Admin | Avanzar el estado del pedido en un solo sentido. | `PUT /api/pedidos/:id` permite solo el siguiente estado del flujo; retroceder o saltear devuelve `400`. |
| RF-PED-15 | Must | Sistema | Registrar cada cambio de estado en el historial. | Se crea un `HistorialPedido` con estado y fecha/hora en cada transición. |
| RF-PED-16 | Must | Empleado/Admin | Marcar ítems como preparados. | Solo en estado `Preparando`; al quedar todos preparados, el pedido avanza a `En camino`. |
| RF-PED-17 | Must | Sistema | Reponer stock al cancelar según lo preparado. | Al pasar a `Cancelado` se repone todo en `Pendiente`/`Confirmado`, solo las líneas con `preparado = false` en `Preparando`, y nada en `En camino`/`Listo`. Se registra el estado en el historial. |
| RF-PED-18 | Must | Sistema | Hacer terminal el estado cancelado. | Un pedido cancelado no puede volver a otro estado; un pedido entregado no puede cancelarse. |
| RF-PED-19 | Must | Admin | Dar de baja lógicamente un pedido. | `DELETE /api/pedidos/:id` lo oculta de listados, pero permanece en la base para estadísticas. |
| RF-PED-20 | Should | Cliente | Cancelar un pedido activo desde el historial. | El cliente puede cancelar sus pedidos en `Pendiente`, `Confirmado`, `Preparando` o `En camino`; `PUT /api/pedidos/:id` acepta solo `{estado:"Cancelado"}` y valida ownership. |
| RF-PED-21 | Should | Cliente | Repetir un pedido desde el historial. | El carrito se reconstruye y se redirige al checkout con los ítems disponibles. |

---

## 7. Administración de sucursales

| ID | Prioridad | Actor | Requerimiento | Criterio de aceptación |
|---|---|---|---|---|
| RF-SUC-01 | Must | Admin | Crear una sucursal con dirección, coordenadas, teléfono, estado, radio y horarios. | `POST /api/sucursales` devuelve `201` con horarios ordenados y `abierta_ahora`; campos obligatorios faltantes devuelven `400`. |
| RF-SUC-02 | Must | Admin | Modificar una sucursal y reemplazar sus horarios. | `PUT /api/sucursales/:id` actualiza campos; si llega `horarios`, reemplaza el conjunto completo. |
| RF-SUC-03 | Must | Admin | Dar de baja lógicamente una sucursal. | `DELETE /api/sucursales/:id` la oculta; las referencias históricas se conservan. |
| RF-SUC-04 | Must | Visitante/Cliente | Consultar sucursales públicamente sin stock. | `GET /api/sucursales` devuelve datos, horarios y `abierta_ahora`, pero no materias primas ni stock. |
| RF-SUC-05 | Must | Admin | Configurar radio de cobertura. | `radio_km` acepta valores entre 0.1 y 100; fuera de rango devuelve `400`. |
| RF-SUC-06 | Must | Admin | Configurar horarios por día. | Se acepta un horario por día (1-7), sin días duplicados y con apertura distinta al cierre. |
| RF-SUC-07 | Should | Sistema | Calcular si la sucursal está abierta. | `abierta_ahora` es verdadero solo si `estado = activa` y el horario actual contiene el momento; sin horarios se considera abierta. |
| RF-SUC-08 | Should | Admin | Visualizar y editar la ubicación en mapa. | El formulario permite seleccionar coordenadas y autocompletar la dirección. |

---

## 8. Materias primas y stock

| ID | Prioridad | Actor | Requerimiento | Criterio de aceptación |
|---|---|---|---|---|
| RF-STK-01 | Must | Admin | Crear, listar, consultar, modificar y dar de baja materias primas. | El nombre es único; se aceptan estados `disponible`/`no_disponible` y `stock_minimo` mayor o igual a 0. |
| RF-STK-02 | Must | Staff | Consultar stock de una sucursal. | `GET /api/stock?sucursal=` devuelve materias primas con stock, stock mínimo y `bajo_stock`; sin sucursal devuelve `404`. |
| RF-STK-03 | Must | Staff | Agregar stock a una materia prima en una sucursal. | `POST /api/stock` suma cantidad entera mayor o igual a 1 y crea la fila si no existe. |
| RF-STK-04 | Must | Staff | Reducir stock manualmente con motivo. | `POST /api/stock/reducciones` exige cantidad entera, motivo de al menos 3 caracteres y stock suficiente; registra snapshots y usuario. |
| RF-STK-05 | Must | Staff | Consultar historial de reducciones de una sucursal. | `GET /api/stock/reducciones?sucursal=` devuelve las últimas reducciones (default 20, configurable con `historial_reducciones_limit`) con materia prima, empleado y motivo. |
| RF-STK-06 | Must | Staff | Consultar stock derivado de un producto. | `GET /api/productos/:id/stock?sucursal=` devuelve `min(floor(stock/cantidad))`; sin receta devuelve 0. |
| RF-STK-07 | Must | Staff | Ver disponibilidad de productos por sucursal. | `GET /api/productos?sucursal=` adjunta `stock` derivado solo para staff con alcance de sucursal. |
| RF-STK-08 | Must | Sistema | No permitir stock negativo. | Una reducción mayor al stock disponible devuelve `409` y no modifica el stock. |
| RF-STK-09 | Should | Staff | Recibir alerta visual de bajo stock. | La tabla de stock marca `bajo_stock` cuando el stock es menor al mínimo configurado. |

---

## 9. Empleados

| ID | Prioridad | Actor | Requerimiento | Criterio de aceptación |
|---|---|---|---|---|
| RF-EMP-01 | Must | Admin | Crear empleados con nombre, apellido, rol, email, contraseña y sucursal opcional. | `POST /api/empleados` devuelve `201` sin contraseña; rol inválido o sucursal inexistente devuelve `400`/`404`. |
| RF-EMP-02 | Must | Admin | Listar y consultar empleados sin exponer contraseñas. | `GET /api/empleados` y `/:id` incluyen sucursal y datos públicos. |
| RF-EMP-03 | Must | Admin | Modificar datos, rol, sucursal y contraseña de un empleado. | `PUT /api/empleados/:id` actualiza campos; email duplicado devuelve `409`; contraseña se hashea. |
| RF-EMP-04 | Must | Admin | Dar de baja lógicamente un empleado. | `DELETE /api/empleados/:id` lo oculta, bloquea login y libera el email; no puede darse de baja a sí mismo. |
| RF-EMP-05 | Must | Admin | Asignar empleados a una sucursal. | `id_sucursal` debe existir; un empleado sin sucursal no puede operar stock, pedidos ni reportes. |

---

## 10. Reportes

| ID | Prioridad | Actor | Requerimiento | Criterio de aceptación |
|---|---|---|---|---|
| RF-REP-01 | Must | Staff/Admin | Consultar pedidos por día. | Devuelve fecha, total, entregados, cancelados y ventas; usa rango de fechas y filtro de sucursal. |
| RF-REP-02 | Must | Staff/Admin | Consultar pedidos por estado. | Devuelve todos los estados con cantidad y porcentaje. |
| RF-REP-03 | Must | Staff/Admin | Consultar tiempo promedio de entrega. | Calcula promedio entre creación y primer estado `Entregado`; devuelve minutos, horas y pedidos considerados. |
| RF-REP-04 | Must | Staff/Admin | Consultar pedidos cancelados. | Devuelve total, porcentaje, serie por día y detalle de hasta 100 pedidos. |
| RF-REP-05 | Must | Staff/Admin | Consultar resumen por sucursal. | Incluye sucursales sin pedidos con valores en cero; ventas y ticket solo de entregados. |
| RF-REP-06 | Must | Staff/Admin | Consultar productos vendidos por sucursal. | Solo cuenta pedidos entregados y agrupa por sucursal/producto. |
| RF-REP-07 | Must | Staff/Admin | Consultar clientes top. | Ordena por pedidos entregados y gasto; permite límite entre 1 y 50. |
| RF-REP-08 | Must | Staff/Admin | Consultar clientes nuevos. | Calcula por primer pedido entregado en el rango y permite agrupar por día, semana o mes. |
| RF-REP-09 | Must | Staff/Admin | Consultar clientes inactivos. | Usa `dias` (1-365) y devuelve último pedido, días inactivo y entregados. |
| RF-REP-10 | Must | Staff/Admin | Consultar reporte de productos. | Incluye productos sin ventas y excluye pedidos no entregados; devuelve unidades, facturación y cantidad de pedidos. |
| RF-REP-11 | Must | Staff/Admin | Consultar reporte de promociones. | Devuelve combos vendidos, facturación, pedidos y ticket promedio. |
| RF-REP-12 | Must | Staff/Admin | Consultar impacto de promociones. | Devuelve pedidos, unidades, facturación de promoción y participación sobre ventas entregadas. |
| RF-REP-13 | Must | Staff/Admin | Filtrar reportes por rango de fechas y sucursal. | `desde`/`hasta` en `YYYY-MM-DD`; rango invertido devuelve `400`; empleado solo su sucursal. |
| RF-REP-14 | Must | Admin | Consultar reportes de cualquier sucursal o de todas. | El admin puede omitir `id_sucursal` o enviar cualquiera existente. |

---

## 11. Seguridad y autorización

| ID | Prioridad | Actor | Requerimiento | Criterio de aceptación |
|---|---|---|---|---|
| RF-SEG-01 | Must | Sistema | Exigir token en rutas privadas. | Sin token o con token inválido/expirado devuelve `401`. |
| RF-SEG-02 | Must | Sistema | Aplicar roles en endpoints. | `ADMIN` para mutaciones administrativas; `ADMIN`/`EMPLEADO` para staff; `CLIENTE` para operaciones de cliente. |
| RF-SEG-03 | Must | Sistema | Aplicar ownership de cliente. | Un cliente no puede consultar ni modificar datos, direcciones o pedidos de otro cliente. |
| RF-SEG-04 | Must | Sistema | Aplicar alcance por sucursal a empleados. | Un empleado sin sucursal no opera; no puede consultar ni modificar otra sucursal. |
| RF-SEG-05 | Must | Sistema | No exponer stock en endpoints públicos. | Productos y sucursales públicos no incluyen stock; el stock exige staff y sucursal autorizada. |
| RF-SEG-06 | Must | Sistema | No confiar en el frontend para autorización. | Las restricciones se validan en el backend aunque la UI oculte acciones. |
| RF-SEG-07 | Should | Sistema | Limpiar la sesión ante `401`. | El frontend elimina token/usuario y emite evento de sesión no autorizada. |

---

## 12. Requerimientos no funcionales mínimos

| ID | Prioridad | Requerimiento | Criterio de aceptación |
|---|---|---|---|
| RNF-01 | Must | Respuestas REST en JSON y errores con `{error: "..."}`. | Los errores no devuelven stack trace en producción. |
| RNF-02 | Must | Validar entradas con Joi. | Los cuerpos y queries inválidos devuelven `400` con mensaje descriptivo. |
| RNF-03 | Must | Usar transacciones en operaciones multi-tabla. | Productos/recetas, sucursales/horarios, promociones/productos y pedidos/detalles/stock no quedan incompletos si falla una parte. |
| RNF-04 | Must | Mantener consistencia de fechas y zona horaria. | Horarios, promociones y reportes usan la zona configurada, por defecto Argentina. |
| RNF-05 | Must | Interfaz responsive. | Las vistas principales funcionan en mobile y desktop; el menú se adapta con hamburguesa. |
| RNF-06 | Should | Accesibilidad básica. | Imágenes con `alt`, botones con `aria-label` cuando corresponde, foco visible y contraste revisado. |
| RNF-07 | Should | Rendimiento de stock. | El cálculo de stock de varios productos evita consultas por producto y usa mapas en memoria. |
| RNF-08 | Should | Mantener documentación actualizada. | Cambios de alcance, reglas o endpoints se reflejan en `docs/`. |
