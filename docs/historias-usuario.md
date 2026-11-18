# Historias de usuario — Foodapp (BAJON)

## 1. Convenciones

- **ID:** identificador estable de la historia.
- **Prioridad:** `Must`, `Should`, `Could`.
- **Formato:** “Como [actor], quiero [acción] para [beneficio]”.
- **Criterios:** escenarios verificables, no detalles de implementación.
- **RF:** requerimientos relacionados en [`requerimientos-funcionales.md`](./requerimientos-funcionales.md).

Los escenarios usan `Dado / Cuando / Entonces` cuando aportan precisión. Las historias describen el comportamiento esperado del sistema actual, salvo las brechas indicadas.

---

## 2. Autenticación y cuenta

### HU-AUTH-01 — Registro de cliente

- **Prioridad:** Must
- **Historia:** Como visitante, quiero registrarme con mis datos para poder pedir a domicilio.
- **Criterios:**
  - Dado un visitante con nombre, apellido, DNI, email y contraseña válidos, cuando se registra, entonces accede como `CLIENTE` y recibe un token.
  - Dado un email ya registrado, cuando intenta registrarse, entonces ve un mensaje de email en uso.
  - Dada una contraseña de menos de 6 caracteres, cuando intenta registrarse, entonces el sistema la rechaza.
- **RF:** RF-AUTH-01, RF-AUTH-08.

### HU-AUTH-02 — Inicio de sesión

- **Prioridad:** Must
- **Historia:** Como usuario registrado, quiero iniciar sesión para acceder a las funciones de mi rol.
- **Criterios:**
  - Dado un cliente con credenciales válidas, cuando inicia sesión, entonces es redirigido al catálogo.
  - Dado un empleado o administrador con credenciales válidas, cuando inicia sesión, entonces accede al panel correspondiente.
  - Dadas credenciales inválidas, cuando intenta ingresar, entonces ve un mensaje genérico sin revelar si el email existe.
- **RF:** RF-AUTH-02, RF-AUTH-09.

### HU-AUTH-03 — Cierre de sesión

- **Prioridad:** Must
- **Historia:** Como usuario autenticado, quiero cerrar sesión para proteger mi cuenta en un dispositivo compartido.
- **Criterios:**
  - Dado un usuario autenticado, cuando cierra sesión, entonces se eliminan token y usuario del navegador.
  - Dado un usuario que cerró sesión, cuando intenta abrir una ruta privada, entonces vuelve al inicio de sesión.
- **RF:** RF-AUTH-03, RF-AUTH-09.

### HU-AUTH-04 — Recuperación de contraseña

- **Prioridad:** Must
- **Historia:** Como usuario, quiero recuperar mi contraseña verificando mi identidad para volver a acceder.
- **Criterios:**
  - Dado un email y DNI que coinciden, cuando solicita la recuperación, entonces recibe un token temporal.
  - Dados datos que no coinciden, cuando solicita la recuperación, entonces no se revela si la cuenta existe.
  - Dado un token vencido, cuando intenta restablecer, entonces el sistema lo rechaza.
- **RF:** RF-AUTH-04, RF-AUTH-05.

### HU-AUTH-05 — Cambio de contraseña autenticado

- **Prioridad:** Must
- **Historia:** Como cliente, quiero cambiar mi contraseña conociendo la actual para mantener mi cuenta segura.
- **Criterios:**
  - Dada la contraseña actual correcta y una nueva válida, cuando confirma, entonces puede iniciar sesión con la nueva.
  - Dada una contraseña actual incorrecta, cuando intenta cambiar, entonces el sistema rechaza la operación.
- **RF:** RF-AUTH-06.

### HU-AUTH-06 — Acceso denegado por rol

- **Prioridad:** Must
- **Historia:** Como sistema, quiero impedir que un rol acceda a funciones ajenas para proteger la información.
- **Criterios:**
  - Dado un cliente autenticado, cuando intenta abrir una ruta administrativa, entonces ve acceso denegado y no recibe datos.
  - Dado un empleado de una sucursal, cuando intenta operar otra sucursal, entonces el backend lo rechaza.
- **RF:** RF-AUTH-09, RF-SEG-02, RF-SEG-04.

---

## 3. Cliente y direcciones

### HU-CLI-01 — Ver y editar perfil

- **Prioridad:** Must
- **Historia:** Como cliente, quiero consultar y actualizar mis datos para mantener mi información correcta.
- **Criterios:**
  - Dado un cliente autenticado, cuando abre su perfil, entonces ve nombre, apellido, DNI, email y direcciones.
  - Dado un cambio de nombre, apellido o DNI válido, cuando guarda, entonces el cambio persiste.
  - Dado un intento de cambiar el email, cuando guarda, entonces el email no se modifica.
- **RF:** RF-CLI-01, RF-AUTH-07.

### HU-CLI-02 — Administrar clientes

- **Prioridad:** Must
- **Historia:** Como administrador, quiero consultar y editar clientes para dar soporte y mantener la base.
- **Criterios:**
  - Dado un administrador, cuando busca un cliente, entonces ve sus datos y métricas de compra.
  - Dado un cliente existente, cuando edita datos permitidos, entonces los cambios se reflejan en el listado.
  - Dado un cliente con pedidos, cuando abre su detalle, entonces ve direcciones, productos frecuentes e historial.
- **RF:** RF-CLI-02, RF-CLI-03, RF-CLI-04, RF-CLI-05.

### HU-CLI-03 — Segmentar clientes

- **Prioridad:** Should
- **Historia:** Como administrador, quiero ver segmentos de clientes para orientar acciones comerciales.
- **Criterios:**
  - Dado un cliente sin pedidos entregados, cuando se lista, entonces aparece como “Sin pedidos”.
  - Dado un cliente con 3 o más pedidos entregados, entonces aparece como “Recurrente”.
  - Dado un cliente sin pedidos en más de 30 días, entonces aparece como “Inactivo”.
- **RF:** RF-CLI-03.

### HU-DIR-01 — Gestionar direcciones

- **Prioridad:** Must
- **Historia:** Como cliente, quiero administrar mis direcciones para elegir dónde recibir cada pedido.
- **Criterios:**
  - Dado un cliente autenticado, cuando crea una dirección con coordenadas, entonces aparece en su listado.
  - Dada una dirección propia, cuando la elimina, entonces deja de aparecer para nuevos pedidos.
  - Dada una dirección de otro cliente, cuando intenta consultarla o eliminarla, entonces el sistema la trata como inexistente.
- **RF:** RF-DIR-01, RF-DIR-02, RF-DIR-03.

### HU-DIR-02 — Crear dirección en el checkout

- **Prioridad:** Should
- **Historia:** Como cliente, quiero agregar una dirección nueva al confirmar el pedido para no salir del flujo de compra.
- **Criterios:**
  - Dado un checkout sin direcciones, cuando completa el formulario y guarda, entonces la dirección queda seleccionada.
  - Dada una dirección sin coordenadas, cuando intenta guardarla, entonces ve un error y no puede continuar.
- **RF:** RF-DIR-04, RF-DIR-05.

### HU-DIR-03 — Ubicar dirección en mapa

- **Prioridad:** Should
- **Historia:** Como cliente, quiero marcar mi ubicación en un mapa para que la entrega llegue correctamente.
- **Criterios:**
  - Dado el formulario de dirección, cuando selecciona un punto, entonces se completan latitud y longitud.
  - Dado un punto seleccionado, cuando el geocodificador responde, entonces se completan calle, altura, ciudad y provincia.
- **RF:** RF-DIR-06.

---

## 4. Catálogo y contenido

### HU-CAT-01 — Explorar catálogo

- **Prioridad:** Must
- **Historia:** Como visitante, quiero explorar productos y categorías para decidir qué pedir.
- **Criterios:**
  - Dado un visitante, cuando abre el catálogo, entonces ve productos disponibles agrupados por categoría.
  - Dado un producto, cuando abre su detalle, entonces ve descripción, precio, categorías y opcionales.
- **RF:** RF-CAT-01, RF-CAT-02, RF-CAT-08.

### HU-CAT-02 — Filtrar catálogo

- **Prioridad:** Must
- **Historia:** Como visitante, quiero filtrar por categoría, precio y promociones para encontrar rápido lo que busco.
- **Criterios:**
  - Dadas una o más categorías seleccionadas, cuando aplica el filtro, entonces solo ve productos de esas categorías.
  - Dado un rango de precio válido, cuando aplica, entonces ve productos dentro del rango.
  - Dado el filtro “Solo promociones”, entonces ve promociones y no la grilla de productos.
- **RF:** RF-CAT-13, RF-CAT-14.

### HU-CAT-03 — Ver banners

- **Prioridad:** Must
- **Historia:** Como visitante, quiero ver promociones destacadas para conocer ofertas vigentes.
- **Criterios:**
  - Dado que existen banners activos, cuando abre el catálogo, entonces se muestran ordenados por `orden`.
  - Dado un banner inactivo, cuando se carga el catálogo, entonces no se muestra.
- **RF:** RF-CAT-09.

### HU-CAT-04 — Administrar productos

- **Prioridad:** Must
- **Historia:** Como administrador, quiero crear y modificar productos para mantener el catálogo actualizado.
- **Criterios:**
  - Dado un producto con nombre, precio y categorías válidas, cuando se guarda, entonces aparece en el catálogo.
  - Dado un producto con receta, cuando se guarda, entonces el stock se calcula con sus materias primas.
  - Dado un producto sin receta, entonces se muestra como no disponible para pedidos.
- **RF:** RF-CAT-03, RF-CAT-04, RF-CAT-05, RF-CAT-06.

### HU-CAT-05 — Administrar opcionales

- **Prioridad:** Must
- **Historia:** Como administrador, quiero definir opcionales por producto para ofrecer extras.
- **Criterios:**
  - Dado un producto, cuando agrega un opcional con precio, entonces aparece en el catálogo.
  - Dado un opcional inactivo, entonces no se ofrece al cliente.
  - Dado un pedido con opcionales, entonces el detalle conserva nombre y precio del opcional.
- **RF:** RF-CAT-07, RF-CAT-08, RF-PED-07.

### HU-CAT-06 — Administrar categorías

- **Prioridad:** Must
- **Historia:** Como administrador, quiero gestionar categorías para organizar el catálogo.
- **Criterios:**
  - Dada una categoría nueva, cuando se crea, entonces puede asignarse a productos.
  - Dada una categoría con productos, cuando se da de baja, entonces deja de mostrarse en el catálogo público.
- **RF:** RF-CAT-02, RF-CAT-03, RF-CAT-04.

### HU-CAT-07 — Administrar banners

- **Prioridad:** Must
- **Historia:** Como administrador, quiero controlar los banners del catálogo para destacar contenido.
- **Criterios:**
  - Dado un banner nuevo con imagen y título, cuando se guarda, entonces puede mostrarse en el catálogo.
  - Dado un banner activo, cuando se desactiva, entonces deja de mostrarse.
  - Dados varios banners, cuando se cambia el orden, entonces el catálogo respeta el nuevo orden.
- **RF:** RF-CAT-10.

### HU-CAT-08 — Ver sucursales en mapa

- **Prioridad:** Should
- **Historia:** Como cliente, quiero ver las sucursales y sus horarios para saber cuál me conviene.
- **Criterios:**
  - Dado un visitante, cuando abre sucursales, entonces ve tarjetas con dirección, teléfono, horarios y estado.
  - Dado un mapa, cuando se carga, entonces muestra marcadores de sucursales activas.
- **RF:** RF-CAT-15, RF-SUC-04, RF-SUC-07.

---

## 5. Promociones

### HU-PROM-01 — Ver promociones vigentes

- **Prioridad:** Must
- **Historia:** Como cliente, quiero ver combos vigentes para aprovechar ofertas.
- **Criterios:**
  - Dada una promoción activa dentro de su vigencia, cuando se consulta, entonces aparece como vigente.
  - Dada una promoción vencida o inactiva, entonces no se muestra en el catálogo.
  - Dado un combo, entonces se muestra su precio promocional y los productos incluidos.
- **RF:** RF-CAT-11, RF-CAT-12.

### HU-PROM-02 — Administrar promociones

- **Prioridad:** Must
- **Historia:** Como administrador, quiero crear y modificar combos para gestionar la oferta comercial.
- **Criterios:**
  - Dado un combo con productos y cantidades válidas, cuando se guarda, entonces aparece en la administración.
  - Dado un combo con un producto inexistente, cuando se guarda, entonces se rechaza sin dejar datos parciales.
  - Dado un cambio de fechas o valor, cuando se guarda, entonces el catálogo refleja la nueva vigencia o precio.
- **RF:** RF-CAT-12, RF-CAT-11.

### HU-PROM-03 — Activar o desactivar promoción

- **Prioridad:** Must
- **Historia:** Como administrador, quiero activar o desactivar combos para controlar su disponibilidad sin eliminarlos.
- **Criterios:**
  - Dado un combo activo, cuando se desactiva, entonces deja de ofrecerse.
  - Dado un combo inactivo, cuando se activa y está en vigencia, entonces vuelve a ofrecerse.
- **RF:** RF-CAT-12, RF-CAT-11.

### HU-PROM-04 — Comprar un combo

- **Prioridad:** Must
- **Historia:** Como cliente, quiero agregar un combo al carrito para comprarlo como una unidad.
- **Criterios:**
  - Dado un combo vigente, cuando lo agrega, entonces se crea un ítem de promoción con su precio.
  - Dado un combo en el carrito, cuando cambia la cantidad, entonces el total se actualiza.
  - Dado un pedido con combo, entonces el detalle conserva `id_promocion` y el precio promocional por línea.
- **RF:** RF-CAR-02, RF-PED-02, RF-PED-07, RF-PED-08.

---

## 6. Carrito y checkout

### HU-CAR-01 — Agregar producto al carrito

- **Prioridad:** Must
- **Historia:** Como cliente, quiero agregar productos con opcionales y observaciones para personalizar mi pedido.
- **Criterios:**
  - Dado un producto disponible, cuando lo agrega, entonces aparece en el carrito con cantidad 1.
  - Dados dos productos iguales con los mismos opcionales, entonces se acumula la cantidad.
  - Dados dos productos iguales con opcionales distintos, entonces se muestran como ítems separados.
  - Dada una observación, entonces se conserva en el ítem.
- **RF:** RF-CAR-01, RF-CAR-04, RF-CAR-05.

### HU-CAR-02 — Editar carrito

- **Prioridad:** Must
- **Historia:** Como cliente, quiero modificar cantidades y quitar ítems para ajustar mi compra.
- **Criterios:**
  - Dado un ítem, cuando aumenta o reduce la cantidad, entonces el total se recalcula.
  - Dado un ítem, cuando lo elimina, entonces desaparece y el total se actualiza.
  - Dado un carrito con ítems, cuando lo vacía, entonces queda vacío y el total es 0.
- **RF:** RF-CAR-03, RF-CAR-04.

### HU-CAR-03 — Conservar carrito entre sesiones

- **Prioridad:** Must
- **Historia:** Como visitante, quiero conservar mi carrito al recargar o iniciar sesión para no perder mi selección.
- **Criterios:**
  - Dado un carrito con ítems, cuando recarga la página, entonces los ítems siguen ahí.
  - Dado un carrito de invitado y un cliente que inicia sesión, entonces los ítems se fusionan en el carrito del cliente.
  - Dado un cambio de usuario, entonces no se mezclan carritos de clientes distintos.
- **RF:** RF-CAR-05, RF-CAR-06.

### HU-CAR-04 — Confirmar pedido

- **Prioridad:** Must
- **Historia:** Como cliente, quiero confirmar mi pedido indicando dirección para recibirlo en el lugar correcto.
- **Criterios:**
  - Dado un carrito con ítems y una dirección válida, cuando confirma, entonces se crea el pedido y se vacía el carrito.
  - Dada una dirección de otro cliente, entonces el pedido se rechaza.
  - Dado un error de stock o sucursal, entonces el carrito se conserva y se muestra el motivo.
- **RF:** RF-CAR-07, RF-PED-01, RF-PED-03, RF-PED-04.

### HU-CAR-05 — Ver confirmación

- **Prioridad:** Should
- **Historia:** Como cliente, quiero ver la confirmación de mi pedido para saber que se registró.
- **Criterios:**
  - Dado un pedido creado, entonces la confirmación muestra número, sucursal e importe.
  - Dado un pedido con coordenadas, entonces muestra distancia y tiempo estimado.
  - Dado un pedido sin coordenadas, entonces no muestra un tiempo estimado.
- **RF:** RF-CAR-09, RF-PED-06.

### HU-CAR-06 — Repetir pedido

- **Prioridad:** Should
- **Historia:** Como cliente, quiero repetir un pedido anterior para ahorrar tiempo.
- **Criterios:**
  - Dado un pedido histórico, cuando elige repetir, entonces el carrito se reconstruye con sus ítems.
  - Dado un producto ya no disponible, entonces se avisa y no se agrega.
  - Dada una promoción no vigente, entonces se agregan sus productos sueltos.
- **RF:** RF-CAR-08, RF-PED-21.

---

## 7. Pedidos y seguimiento

### HU-PED-01 — Ver historial propio

- **Prioridad:** Must
- **Historia:** Como cliente, quiero consultar mis pedidos para revisar compras anteriores y su estado.
- **Criterios:**
  - Dado un cliente autenticado, cuando abre “Mis pedidos”, entonces ve solo sus pedidos.
  - Dado un pedido propio, cuando abre el detalle, entonces ve productos, importe, dirección, estado e historial.
  - Dado un pedido de otro cliente, entonces el acceso es denegado.
- **RF:** RF-PED-10, RF-PED-13.

### HU-PED-02 — Seguir estado

- **Prioridad:** Must
- **Historia:** Como cliente, quiero ver el estado actual y la línea de tiempo para saber cómo avanza mi pedido.
- **Criterios:**
  - Dado un pedido, entonces se muestra su estado actual.
  - Dado un pedido con historial, entonces se muestran los estados con fecha y hora.
  - Dado un pedido entregado, entonces no se ofrece avanzar el estado.
- **RF:** RF-PED-13, RF-PED-15.

### HU-PED-03 — Cancelar pedido

- **Prioridad:** Should
- **Historia:** Como cliente, quiero cancelar un pedido activo para no recibirlo si cambié de opinión.
- **Criterios:**
  - Dado un pedido en `Pendiente`, `Confirmado`, `Preparando` o `En camino`, entonces la interfaz muestra “Cancelar pedido”.
  - Dado un pedido en `Listo`, `Entregado` o `Cancelado`, entonces no se ofrece cancelar.
  - Dado un pedido cancelado, entonces se repone el stock no consumido según el estado y los ítems preparados, y el estado queda en el historial.
- **RF:** RF-PED-17, RF-PED-18, RF-PED-20.

### HU-PED-04 — Gestionar pedidos como empleado

- **Prioridad:** Must
- **Historia:** Como empleado, quiero ver y avanzar los pedidos de mi sucursal para operar la cocina y la entrega.
- **Criterios:**
  - Dado un empleado con sucursal, entonces solo ve pedidos de esa sucursal.
  - Dado un pedido en `Confirmado`, cuando avanza, entonces pasa a `Preparando`.
  - Dado un pedido en `Preparando` con todos los ítems preparados, entonces pasa a `En camino`.
  - Dado un pedido en `En camino`, cuando avanza, entonces pasa a `Entregado`.
- **RF:** RF-PED-11, RF-PED-14, RF-PED-16.

### HU-PED-05 — Marcar ítems preparados

- **Prioridad:** Must
- **Historia:** Como empleado, quiero marcar ítems preparados para reflejar el avance real de la cocina.
- **Criterios:**
  - Dado un pedido en `Preparando`, cuando marca un ítem, entonces queda preparado.
  - Dado un pedido fuera de `Preparando`, entonces no se permite marcar ítems.
  - Dados todos los ítems preparados, entonces el pedido avanza automáticamente a `En camino`.
- **RF:** RF-PED-16.

### HU-PED-06 — Administrar pedidos

- **Prioridad:** Must
- **Historia:** Como administrador, quiero consultar y dar de baja pedidos para mantener el historial ordenado.
- **Criterios:**
  - Dado un administrador, cuando filtra por sucursal o cliente, entonces ve los pedidos correspondientes.
  - Dado un pedido, cuando lo da de baja, entonces deja de aparecer en listados.
  - Dado un pedido dado de baja, entonces sigue contando para estadísticas.
- **RF:** RF-PED-12, RF-PED-19.

---

## 8. Sucursales y operación

### HU-SUC-01 — Administrar sucursales

- **Prioridad:** Must
- **Historia:** Como administrador, quiero crear y modificar sucursales para mantener la red de entrega.
- **Criterios:**
  - Dada una sucursal con dirección y coordenadas, cuando se guarda, entonces aparece en el listado.
  - Dados horarios válidos, cuando se guardan, entonces se reflejan en el estado operativo.
  - Dado un radio fuera de 0.1–100 km, entonces se rechaza.
- **RF:** RF-SUC-01, RF-SUC-02, RF-SUC-05, RF-SUC-06.

### HU-SUC-02 — Dar de baja sucursal

- **Prioridad:** Must
- **Historia:** Como administrador, quiero dar de baja una sucursal para dejar de operarla sin perder historial.
- **Criterios:**
  - Dada una sucursal activa, cuando se da de baja, entonces no se ofrece para nuevos pedidos.
  - Dados pedidos históricos de la sucursal, entonces siguen siendo consultables.
- **RF:** RF-SUC-03.

### HU-SUC-03 — Asignación automática

- **Prioridad:** Must
- **Historia:** Como cliente, quiero que el sistema elija la sucursal más conveniente para recibir mi pedido.
- **Criterios:**
  - Dada una dirección dentro del radio de una sucursal abierta con stock, entonces el pedido se asigna a la más cercana.
  - Dada una dirección fuera de todo radio, entonces el pedido se rechaza.
  - Dada una sucursal cerrada o sin stock, entonces no se elige.
- **RF:** RF-PED-04, RF-PED-05.

---

## 9. Stock y materias primas

### HU-STK-01 — Administrar materias primas

- **Prioridad:** Must
- **Historia:** Como administrador, quiero gestionar materias primas para definir los insumos del negocio.
- **Criterios:**
  - Dada una materia prima nueva, cuando se crea, entonces puede asignarse a recetas.
  - Dado un nombre existente, cuando se crea, entonces se reutiliza el registro existente.
  - Dada una materia prima con stock mínimo, entonces se marca bajo stock cuando corresponde.
- **RF:** RF-STK-01, RF-STK-09.

### HU-STK-02 — Consultar stock

- **Prioridad:** Must
- **Historia:** Como empleado, quiero consultar el stock de mi sucursal para saber qué insumos hay.
- **Criterios:**
  - Dado un empleado con sucursal, cuando abre stock, entonces ve materias primas, stock y mínimo.
  - Dado un empleado sin sucursal, entonces no puede consultar.
  - Dado un producto, entonces se muestra su stock derivado según receta.
- **RF:** RF-STK-02, RF-STK-06, RF-STK-07, RF-SEG-04.

### HU-STK-03 — Reponer stock

- **Prioridad:** Must
- **Historia:** Como empleado, quiero agregar stock para registrar ingresos de insumos.
- **Criterios:**
  - Dada una materia prima y una cantidad válida, cuando repone, entonces el stock aumenta.
  - Dado un insumo sin fila en la sucursal, cuando repone, entonces se crea con esa cantidad.
- **RF:** RF-STK-03.

### HU-STK-04 — Reducir stock con motivo

- **Prioridad:** Must
- **Historia:** Como empleado, quiero registrar mermas o roturas para mantener el stock real.
- **Criterios:**
  - Dada una reducción válida con motivo, entonces el stock disminuye y queda auditoría.
  - Dada una cantidad mayor al stock, entonces se rechaza y no se modifica.
  - Dado el historial, entonces se ven las últimas reducciones de la sucursal (default 20, configurable).
- **RF:** RF-STK-04, RF-STK-05, RF-STK-08.

### HU-STK-05 — Descontar stock al pedir

- **Prioridad:** Must
- **Historia:** Como sistema, quiero descontar insumos al crear un pedido para reflejar el consumo real.
- **Criterios:**
  - Dado un pedido con stock suficiente, entonces se descuenta según receta.
  - Dado un pedido sin stock suficiente, entonces no se crea y se hace rollback.
  - Dado un pedido cancelado, entonces se repone lo descontado solo para los ítems no preparados; en `En camino`/`Listo` no se repone.
- **RF:** RF-PED-09, RF-PED-17.

---

## 10. Empleados

### HU-EMP-01 — Administrar empleados

- **Prioridad:** Must
- **Historia:** Como administrador, quiero crear y modificar empleados para gestionar la operación.
- **Criterios:**
  - Dado un empleado con rol válido, cuando se crea, entonces puede iniciar sesión.
  - Dada una sucursal existente, entonces se asigna correctamente.
  - Dado un email duplicado, entonces se rechaza.
- **RF:** RF-EMP-01, RF-EMP-02, RF-EMP-03, RF-EMP-05.

### HU-EMP-02 — Dar de baja empleado

- **Prioridad:** Must
- **Historia:** Como administrador, quiero dar de baja empleados para bloquear accesos sin perder historial.
- **Criterios:**
  - Dado un empleado activo, cuando se da de baja, entonces no puede iniciar sesión.
  - Dado un administrador, cuando intenta darse de baja a sí mismo, entonces se rechaza.
  - Dado un email liberado, entonces puede usarse en un nuevo empleado.
- **RF:** RF-EMP-04.

---

## 11. Reportes

### HU-REP-01 — Ver resumen operativo

- **Prioridad:** Must
- **Historia:** Como administrador, quiero ver indicadores de ventas y pedidos para tomar decisiones.
- **Criterios:**
  - Dado un rango de fechas, entonces ve pedidos, ventas, ticket promedio y entregados.
  - Dado un filtro de sucursal, entonces los indicadores se limitan a esa sucursal.
  - Dado un rango inválido, entonces se muestra un error.
- **RF:** RF-REP-01, RF-REP-05, RF-REP-13, RF-REP-14.

### HU-REP-02 — Analizar pedidos por estado

- **Prioridad:** Must
- **Historia:** Como administrador, quiero ver la distribución por estado para detectar cuellos de botella.
- **Criterios:**
  - Dado un período, entonces ve cantidad y porcentaje por estado.
  - Dado un empleado, entonces solo ve datos de su sucursal.
- **RF:** RF-REP-02, RF-REP-13.

### HU-REP-03 — Medir tiempos de entrega

- **Prioridad:** Must
- **Historia:** Como administrador, quiero conocer el tiempo promedio de entrega para evaluar la operación.
- **Criterios:**
  - Dados pedidos entregados, entonces ve el promedio en minutos y horas.
  - Dado un período sin entregas, entonces se informa que no hay datos.
- **RF:** RF-REP-03.

### HU-REP-04 — Analizar cancelaciones

- **Prioridad:** Must
- **Historia:** Como administrador, quiero ver cancelaciones para identificar problemas.
- **Criterios:**
  - Dado un período, entonces ve total, porcentaje, serie diaria y detalle.
  - Dado un filtro de sucursal, entonces se respeta el alcance.
- **RF:** RF-REP-04.

### HU-REP-05 — Ver productos más vendidos

- **Prioridad:** Must
- **Historia:** Como administrador, quiero conocer los productos más vendidos para ajustar el menú y el stock.
- **Criterios:**
  - Dados pedidos entregados, entonces se agrupan por producto y sucursal.
  - Dado un producto sin ventas, entonces aparece en el reporte de productos con cero.
- **RF:** RF-REP-06, RF-REP-10.

### HU-REP-06 — Analizar clientes

- **Prioridad:** Must
- **Historia:** Como administrador, quiero identificar clientes frecuentes, nuevos e inactivos para acciones comerciales.
- **Criterios:**
  - Dados clientes con pedidos entregados, entonces se ordenan por cantidad y gasto.
  - Dado un período, entonces se cuentan clientes nuevos por primer pedido entregado.
  - Dados `dias`, entonces se listan clientes inactivos.
- **RF:** RF-REP-07, RF-REP-08, RF-REP-09.

### HU-REP-07 — Medir promociones

- **Prioridad:** Should
- **Historia:** Como administrador, quiero saber el impacto de las promociones para decidir si continúan.
- **Criterios:**
  - Dadas promociones vendidas, entonces se ven combos, unidades y facturación.
  - Dado el impacto, entonces se muestra la participación sobre ventas entregadas.
- **RF:** RF-REP-11, RF-REP-12.

---

## 12. Historias técnicas transversales

### HU-TEC-01 — Errores consistentes

- **Prioridad:** Must
- **Historia:** Como consumidor de la API, quiero errores claros y consistentes para manejarlos en el frontend.
- **Criterios:**
  - Dado un error de validación, entonces la respuesta incluye `{error}` y un código `400`.
  - Dado un error interno, entonces no se expone el stack trace en producción.
- **RF:** RNF-01, RNF-02.

### HU-TEC-02 — Operaciones atómicas

- **Prioridad:** Must
- **Historia:** Como sistema, quiero que las operaciones multi-tabla sean atómicas para evitar datos incompletos.
- **Criterios:**
  - Dado un fallo al guardar una receta, entonces el producto no queda a medio actualizar.
  - Dado un fallo al crear un pedido, entonces no quedan detalles ni descuentos de stock parciales.
- **RF:** RNF-03.

### HU-TEC-03 — Documentación mantenible

- **Prioridad:** Should
- **Historia:** Como equipo, queremos documentación actualizada para facilitar el desarrollo y la evaluación.
- **Criterios:**
  - Dado un cambio de alcance, entonces se actualizan los documentos afectados.
  - Dado un nuevo endpoint, entonces se documenta en `endpoints.md` y se vincula desde el índice.
- **RF:** RNF-08.

---

## 13. Trazabilidad resumida

| Módulo | Historias | Requerimientos principales |
|---|---|---|
| Autenticación | HU-AUTH-01 a 06 | RF-AUTH-01 a 10 |
| Clientes y direcciones | HU-CLI-01 a 03, HU-DIR-01 a 03 | RF-CLI-01 a 05, RF-DIR-01 a 06 |
| Catálogo y contenido | HU-CAT-01 a 08 | RF-CAT-01 a 15 |
| Promociones | HU-PROM-01 a 04 | RF-CAT-11, RF-CAT-12, RF-CAR-02, RF-PED-02 |
| Carrito y checkout | HU-CAR-01 a 06 | RF-CAR-01 a 09, RF-PED-01, RF-PED-03 |
| Pedidos | HU-PED-01 a 06 | RF-PED-01 a 21 |
| Sucursales | HU-SUC-01 a 03 | RF-SUC-01 a 08, RF-PED-04 |
| Stock | HU-STK-01 a 05 | RF-STK-01 a 09, RF-PED-09, RF-PED-17 |
| Empleados | HU-EMP-01 a 02 | RF-EMP-01 a 05 |
| Reportes | HU-REP-01 a 07 | RF-REP-01 a 14 |
| Transversales | HU-TEC-01 a 03 | RNF-01 a 08 |
