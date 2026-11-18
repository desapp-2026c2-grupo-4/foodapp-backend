# Decisiones de negocio — Foodapp (BAJON)

## 1. Cómo leer este documento

Cada decisión describe una regla vigente en el código actual, su fundamento y las consecuencias prácticas. No reemplaza el detalle técnico de [`arquitectura.md`](./arquitectura.md), [`der-foodapp.md`](./der-foodapp.md) ni [`endpoints.md`](./endpoints.md).

Estados usados:

- **Vigente:** implementado y utilizado por el sistema.
- **Parcial:** existe una parte, pero falta completar el flujo.
- **Fuera de alcance:** previsto o posible, pero no implementado.

---

## 2. Identidad, acceso y seguridad

### D-01 — Registro público solo para clientes

- **Decisión:** `POST /api/auth/register` siempre crea un `Cliente` con rol `CLIENTE`. No permite elegir rol.
- **Fundamento:** evitar escalamiento de privilegios desde el registro público.
- **Consecuencia:** los empleados y administradores se crean desde la administración (`POST /api/empleados`) y requieren rol `ADMIN`.
- **Estado:** Vigente.

### D-02 — Email único y credencial de acceso

- **Decisión:** el email identifica al usuario para login. No puede repetirse entre clientes y empleados. Para clientes es inmutable.
- **Fundamento:** evitar ambigüedad en el login y cuentas duplicadas.
- **Consecuencia:** `PUT /api/clientes/:id` rechaza cambios de email; la administración de empleados valida que el email no pertenezca a un cliente.
- **Estado:** Vigente.

### D-03 — DNI obligatorio para clientes

- **Decisión:** el registro y el alta administrativa de clientes requieren DNI. También se usa para recuperar contraseña.
- **Fundamento:** verificación básica de identidad y recuperación de cuenta.
- **Consecuencia:** el DNI se normaliza a dígitos para comparar en la recuperación. No se valida unicidad de DNI en el modelo actual.
- **Estado:** Vigente.

### D-04 — Contraseñas con bcrypt

- **Decisión:** las contraseñas se almacenan con bcrypt (salt rounds 10). Nunca se devuelven en respuestas.
- **Fundamento:** seguridad básica de credenciales.
- **Consecuencia:** existe migración automática de contraseñas antiguas en texto plano al primer login exitoso.
- **Estado:** Vigente.

### D-05 — Sesión con JWT

- **Decisión:** el login devuelve un JWT con `id_cliente` o `id_empleado` y rol. La expiración por defecto es de 12 horas.
- **Fundamento:** autenticación stateless y simple para el alcance del proyecto.
- **Consecuencia:** el frontend guarda token y usuario en `localStorage`; ante `401` limpia la sesión.
- **Estado:** Vigente.

### D-06 — Recuperación de contraseña con email + DNI

- **Decisión:** se verifica email y DNI; si coinciden, se emite un token temporal de 15 minutos con propósito `password_reset`.
- **Fundamento:** evitar recuperación solo con email y no revelar si la cuenta existe cuando el DNI no coincide.
- **Consecuencia:** el token se devuelve al frontend; no hay envío de email. Un token de sesión normal no sirve para restablecer contraseña.
- **Estado:** Vigente.

### D-07 — Autorización en backend, no solo en frontend

- **Decisión:** los roles y el alcance por sucursal se validan con middlewares y utilidades de autorización en el backend.
- **Fundamento:** las rutas del frontend son solo una ayuda de navegación.
- **Consecuencia:** un cliente no puede acceder a datos de otro cliente; un empleado no puede operar otra sucursal; las mutaciones administrativas requieren `ADMIN`.
- **Estado:** Vigente.

---

## 3. Clientes y direcciones

### D-08 — Un cliente puede tener múltiples direcciones

- **Decisión:** `Cliente 1:N Direccion`. Cada dirección pertenece a un cliente.
- **Fundamento:** una misma persona puede pedir a domicilio, trabajo u otra ubicación.
- **Consecuencia:** el checkout permite elegir entre direcciones existentes o crear una nueva.
- **Estado:** Vigente.

### D-09 — La dirección de entrega se selecciona explícitamente

- **Decisión:** el pedido guarda `id_direccion`. El backend valida que la dirección pertenezca al cliente.
- **Fundamento:** evitar entregas a direcciones de terceros o a la primera dirección por defecto.
- **Consecuencia:** no se asume una dirección única ni se elige automáticamente por el backend.
- **Estado:** Vigente.

### D-10 — Coordenadas obligatorias para asignar sucursal

- **Decisión:** la creación de direcciones exige latitud y longitud. La asignación de sucursal falla si faltan coordenadas.
- **Fundamento:** la distancia se calcula con Haversine y necesita ambos puntos.
- **Consecuencia:** el frontend usa un mapa y geocodificación para completar los datos.
- **Estado:** Vigente.

### D-11 — Baja lógica de direcciones

- **Decisión:** al eliminar una dirección se marca como eliminada, no se borra físicamente.
- **Fundamento:** preservar pedidos históricos que la referencian.
- **Consecuencia:** los pedidos incluyen direcciones con `paranoid: false`; no se duplica un snapshot completo de la dirección en el pedido.
- **Estado:** Vigente.

### D-12 — No hay edición de direcciones

- **Decisión:** el cliente puede crear, listar y dar de baja direcciones; no puede editarlas.
- **Fundamento:** simplificar el alcance inicial.
- **Consecuencia:** para corregir una dirección se debe crear una nueva y dar de baja la anterior.
- **Estado:** Vigente; posible mejora futura.

---

## 4. Catálogo, categorías y opcionales

### D-13 — Producto N:M categoría

- **Decisión:** un producto puede pertenecer a varias categorías mediante `categoria_producto`.
- **Fundamento:** un mismo producto puede aparecer en más de una agrupación comercial.
- **Consecuencia:** el catálogo muestra todas las categorías del producto y los filtros permiten seleccionar varias.
- **Estado:** Vigente.

### D-14 — El stock no vive en la categoría ni en el producto

- **Decisión:** el stock se controla por materia prima y sucursal. El stock del producto es derivado de la receta.
- **Fundamento:** evitar inconsistencias y permitir recetas compartidas entre productos.
- **Consecuencia:** `Categoria_Producto` no contiene stock; `Producto` tampoco. El stock se calcula con `min(floor(stock_materia / cantidad_receta))`.
- **Estado:** Vigente.

### D-15 — Producto sin receta no es vendible

- **Decisión:** si un producto no tiene materias primas asignadas, su stock derivado es 0 y el backend rechaza pedidos con `409`.
- **Fundamento:** no se puede producir sin insumos definidos.
- **Consecuencia:** la administración muestra “Sin receta (no disponible)” y el catálogo deshabilita la compra si el producto no está disponible.
- **Estado:** Vigente.

### D-16 — Estados de producto

- **Decisión:** `Producto.estado` solo admite `disponible` o `no_disponible`.
- **Fundamento:** simplificar la disponibilidad comercial.
- **Consecuencia:** el catálogo muestra el estado y el botón de agregar se deshabilita si no está disponible.
- **Estado:** Vigente.

### D-17 — Opcionales por producto con precio adicional

- **Decisión:** cada producto puede tener opcionales con nombre, descripción, precio y estado. Al pedir, solo se aceptan opcionales que pertenezcan al producto.
- **Fundamento:** permitir extras sin crear productos separados.
- **Consecuencia:** el precio del detalle incluye el precio base más los opcionales seleccionados; el pedido guarda la relación y el precio del opcional.
- **Estado:** Vigente.

### D-18 — Banners ordenables y activables

- **Decisión:** los banners tienen `activo` y `orden`; el catálogo consume solo activos y los ordena por `orden`.
- **Fundamento:** controlar el contenido destacado sin cambios de código.
- **Consecuencia:** el administrador puede activar, desactivar, ordenar y dar de baja banners.
- **Estado:** Vigente.

---

## 5. Promociones

### D-19 — Promociones globales compuestas

- **Decisión:** una promoción agrupa uno o más productos con cantidades. No hay relación con sucursal en esta versión.
- **Fundamento:** el enunciado prioriza promociones generales y evita complejidad innecesaria.
- **Consecuencia:** la misma promoción aplica a todas las sucursales. Si se requiere alcance por sucursal, deberá agregarse una relación N:M.
- **Estado:** Vigente; promociones por sucursal fuera de alcance.

### D-20 — Tipos de promoción

- **Decisión:** se admiten `PRECIO_FIJO`, `PORCENTAJE` y `DOS_POR_UNO`.
- **Fundamento:** cubrir precio final, descuento porcentual y 2x1 con una misma estructura.
- **Consecuencia:** `PORCENTAJE` exige valor mayor a 0 y menor o igual a 100; `PRECIO_FIJO` usa el valor como precio final del conjunto; `DOS_POR_UNO` calcula por pares.
- **Estado:** Vigente.

### D-21 — Vigencia por fecha y estado

- **Decisión:** una promoción se considera vigente solo si `activa = true` y la fecha local de Argentina está entre `fecha_inicio` y `fecha_fin`, inclusive.
- **Fundamento:** evitar aplicar promociones vencidas o desactivadas.
- **Consecuencia:** el catálogo filtra por `vigente`; al crear un pedido, el backend vuelve a validar la vigencia.
- **Estado:** Vigente.

### D-22 — Precio promocional distribuido por línea

- **Decisión:** el precio del combo se calcula con los precios actuales y se distribuye entre las líneas del detalle en centavos, ajustando el residual para que la suma sea exacta.
- **Fundamento:** conservar trazabilidad por producto y evitar diferencias de redondeo.
- **Consecuencia:** cada línea de promoción guarda su precio unitario y `id_promocion`; el pedido puede reconstruirse aunque la promoción cambie después.
- **Estado:** Vigente.

### D-23 — Promoción inválida no se aplica

- **Decisión:** si la promoción no existe o no está vigente, el backend rechaza el pedido con error.
- **Fundamento:** no vender combos fuera de condiciones.
- **Consecuencia:** al repetir un pedido, si la promoción ya no está vigente, el frontend agrega sus productos sueltos para no perder el pedido.
- **Estado:** Vigente.

---

## 6. Stock y materias primas

### D-24 — Stock por materia prima y sucursal

- **Decisión:** el stock pertenece a la combinación `(id_materia_prima, id_sucursal)`.
- **Fundamento:** cada sucursal tiene su propia disponibilidad de insumos.
- **Consecuencia:** una materia prima sin fila en una sucursal se informa con stock 0.
- **Estado:** Vigente.

### D-25 — Receta con cantidades enteras por unidad

- **Decisión:** `Producto_Materia_Prima.cantidad` es un entero mayor o igual a 1 y representa unidades de insumo por unidad de producto.
- **Fundamento:** simplificar el cálculo de stock y evitar fracciones no controladas.
- **Consecuencia:** las recetas se reemplazan completas al modificar un producto y se validan dentro de una transacción.
- **Estado:** Vigente.

### D-26 — Stock derivado del producto

- **Decisión:** `stock_producto = min(floor(stock_materia_prima / cantidad_receta))` sobre todas las materias primas de la receta.
- **Fundamento:** reflejar la capacidad real de producción con los insumos disponibles.
- **Consecuencia:** el endpoint de stock de producto y el listado administrativo usan esta fórmula. No se almacena un stock de producto.
- **Estado:** Vigente.

### D-27 — Descuento y reposición por receta

- **Decisión:** al crear un pedido se descuenta stock de las materias primas según la receta. Al cancelar se repone solo lo no consumido: en `Pendiente`/`Confirmado` se repone todo; en `Preparando`, solo las líneas con `preparado = false`; en `En camino`/`Listo` no se repone nada.
- **Fundamento:** mantener consistencia entre pedidos y stock sin devolver insumos que ya fueron utilizados en la preparación.
- **Consecuencia:** ambas operaciones se ejecutan en transacción. Si no alcanza el stock, el pedido no se crea y se hace rollback.
- **Estado:** Vigente.

### D-28 — Reducción manual auditada

- **Decisión:** el personal puede reducir stock manualmente indicando motivo. Se guarda usuario, cantidad, stock anterior, stock nuevo y fecha.
- **Fundamento:** registrar mermas, roturas o ajustes operativos.
- **Consecuencia:** el historial muestra las últimas `historial_reducciones_limit` reducciones de la sucursal (default 20). El stock no puede quedar negativo.
- **Estado:** Vigente.

### D-29 — Stock mínimo y bajo stock

- **Decisión:** cada materia prima puede definir `stock_minimo` (default configurable `stock_minimo_default`). Si el stock actual es menor, se marca `bajo_stock`.
- **Fundamento:** alertar reposición sin bloquear la operación.
- **Consecuencia:** la administración muestra una alerta visual; no se impide vender por estar por debajo del mínimo si aún hay unidades suficientes.
- **Estado:** Vigente.

### D-30 — Baja lógica y reutilización de nombres

- **Decisión:** categorías, materias primas, productos, sucursales, promociones, banners y opcionales usan baja lógica cuando el modelo lo permite. Las tablas intermedias editables (`categoria_producto`, `producto_materia_prima`, `promocion_producto`, `sucursal_horarios`) también usan baja lógica y restauran la fila existente al volver a agregar la relación. Categorías y materias primas reutilizan el registro si se vuelve a crear el mismo nombre.
- **Fundamento:** preservar historial y evitar duplicados.
- **Consecuencia:** los registros dados de baja no aparecen en listados, pero pueden seguir resolviendo referencias históricas.
- **Estado:** Vigente.

---

## 7. Sucursales, cobertura y horarios

### D-31 — Dirección de sucursal embebida

- **Decisión:** la dirección de una sucursal se guarda en la propia entidad `Sucursal`, no en `Direccion`.
- **Fundamento:** la dirección de una sucursal no pertenece a un cliente.
- **Consecuencia:** `Sucursal` incluye calle, altura, ciudad, provincia, código postal, latitud y longitud.
- **Estado:** Vigente.

### D-32 — Radio de cobertura configurable

- **Decisión:** cada sucursal define `radio_km` entre 0.1 y 100; el valor por defecto es 2 km.
- **Fundamento:** modelar zonas de entrega distintas.
- **Consecuencia:** una sucursal solo puede asignarse si la dirección está dentro de su radio.
- **Estado:** Vigente.

### D-33 — Asignación automática de sucursal

- **Decisión:** si el pedido no trae `id_sucursal`, el backend elige la sucursal activa, abierta, dentro de su radio y con stock suficiente para todo el pedido, priorizando la menor distancia.
- **Fundamento:** asignar automáticamente la opción más cercana viable.
- **Consecuencia:** si no hay candidata, el pedido se rechaza con `409`. La distancia se calcula con Haversine.
- **Estado:** Vigente.

### D-34 — Validación de sucursal explícita

- **Decisión:** si el pedido trae `id_sucursal`, debe existir, estar activa, abierta, tener coordenadas y estar dentro de su radio.
- **Fundamento:** permitir elección explícita sin romper las reglas de cobertura.
- **Consecuencia:** no se valida stock de la sucursal explícita en esa función; el descuento posterior falla si no alcanza. La sucursal no puede cambiarse por `PUT`.
- **Estado:** Vigente.

### D-35 — Horarios por día y cruce de medianoche

- **Decisión:** cada sucursal tiene hasta un horario por día (1 = lunes, 7 = domingo). Si el cierre es menor o igual a la apertura, el rango cruza medianoche.
- **Fundamento:** representar horarios nocturnos sin estructuras adicionales.
- **Consecuencia:** una sucursal sin horarios se considera abierta siempre; una sucursal inactiva nunca está abierta.
- **Estado:** Vigente.

### D-36 — Zona horaria de Argentina

- **Decisión:** horarios, promociones y reportes usan `America/Argentina/Buenos_Aires` por defecto.
- **Fundamento:** alinear fechas comerciales y operativas con la ubicación del negocio.
- **Consecuencia:** la zona se puede configurar con `SCHEDULE_TIMEZONE`.
- **Estado:** Vigente.

---

## 8. Pedidos, precios e historial

### D-37 — Pedido con una dirección y una sucursal

- **Decisión:** cada pedido guarda `id_cliente`, `id_direccion` e `id_sucursal`.
- **Fundamento:** la entrega se realiza a una dirección concreta desde una sucursal concreta.
- **Consecuencia:** el pedido no puede tener múltiples direcciones ni cambiar de sucursal después de creado.
- **Estado:** Vigente.

### D-38 — Precio histórico en el detalle

- **Decisión:** `DetallePedido.precio` guarda el precio utilizado al crear el pedido, incluyendo opcionales cuando corresponda.
- **Fundamento:** reconstruir pedidos históricos sin depender del precio actual del producto.
- **Consecuencia:** el importe del pedido se calcula como `SUM(cantidad * precio)` y se autocorrige si difiere.
- **Estado:** Vigente.

### D-39 — Promoción identificada en el detalle

- **Decisión:** las líneas generadas por una promoción guardan `id_promocion`.
- **Fundamento:** conservar la relación con la promoción aplicada y su precio promocional.
- **Consecuencia:** el pedido muestra el combo y el reporte de promociones puede calcular unidades y facturación.
- **Estado:** Vigente.

### D-40 — Flujo de estados en un solo sentido

- **Decisión:** el flujo operativo es `Pendiente → Confirmado → Preparando → En camino → Entregado`. No se permite retroceder ni saltear estados.
- **Fundamento:** evitar estados incoherentes y mantener trazabilidad.
- **Consecuencia:** cada cambio genera un registro en `HistorialPedido`. `Listo` existe en el esquema, pero no se usa en el flujo actual.
- **Estado:** Vigente.

### D-41 — Confirmación de ítems preparados

- **Decisión:** solo se pueden marcar ítems como preparados cuando el pedido está en `Preparando`. Cuando todos los ítems están preparados, el pedido avanza automáticamente a `En camino`.
- **Fundamento:** reflejar el avance real de la cocina.
- **Consecuencia:** el cambio genera historial y se refleja en la vista del empleado.
- **Estado:** Vigente.

### D-42 — Cancelación y reposición de stock

- **Decisión:** un cliente puede cancelar su propio pedido en `Pendiente`, `Confirmado`, `Preparando` o `En camino`; el personal puede cancelar en cualquier estado no terminal, incluido `Listo`. Al cancelar se repone solo el stock de los ítems no preparados: `Pendiente`/`Confirmado` reponen todo, `Preparando` repone las líneas con `preparado = false`, y `En camino`/`Listo` no reponen. El estado se agrega al historial.
- **Fundamento:** liberar los insumos que todavía no se usaron y no devolver los que ya se consumieron en la preparación.
- **Consecuencia:** `Cancelado` es terminal. El cliente solo puede enviar `{estado:"Cancelado"}` sobre pedidos propios; no puede avanzar estados ni modificar el importe.
- **Estado:** Parcial.

### D-43 — Baja lógica de pedidos

- **Decisión:** el administrador puede dar de baja un pedido; deja de mostrarse en listados, pero persiste para estadísticas.
- **Fundamento:** preservar información histórica y auditoría.
- **Consecuencia:** los reportes filtran `deleted_at IS NULL`; las referencias históricas se resuelven con `paranoid: false`.
- **Estado:** Vigente.

### D-44 — Tiempo estimado de entrega

- **Decisión:** `tiempo_estimado_min = ceil(tiempo_base_entrega_min + (distancia_km / velocidad_urbana_kmh) * 60)`. Los valores se configuran en `/api/parametros` (defaults: 20 minutos y 40 km/h).
- **Fundamento:** dar una referencia simple al cliente.
- **Consecuencia:** si faltan coordenadas de dirección o sucursal, `distancia_km` y `tiempo_estimado_min` son `null`. No es un seguimiento en tiempo real.
- **Estado:** Vigente.

### D-45 — Sin pago online

- **Decisión:** el checkout crea el pedido sin procesar pagos.
- **Fundamento:** el alcance actual no incluye pasarela de pago.
- **Consecuencia:** el pedido queda en estado `Pendiente`; el pago se resuelve fuera del sistema.
- **Estado:** Fuera de alcance.

---

## 9. Carrito y experiencia del cliente

### D-46 — Carrito en el navegador

- **Decisión:** el carrito se persiste en `localStorage` con `{ version: 1, items }`.
- **Fundamento:** evitar complejidad de carrito server-side y mantener el carrito entre recargas.
- **Consecuencia:** no se comparte entre dispositivos. Si el almacenamiento falla o el JSON es inválido, se usa un carrito vacío en memoria.
- **Estado:** Vigente.

### D-47 — Carrito separado por usuario

- **Decisión:** se usan claves `foodapp_cart_guest`, `foodapp_cart_cliente_<id_cliente>` y `foodapp_cart_empleado_<id_empleado>`.
- **Fundamento:** evitar mezclar carritos entre sesiones.
- **Consecuencia:** al cambiar de usuario, el proveedor remonta el estado interno y carga la clave correspondiente.
- **Estado:** Vigente.

### D-48 — Fusión de carrito invitado al iniciar sesión

- **Decisión:** al entrar como cliente, el carrito de invitado se fusiona con el del cliente por `_key`; se suman cantidades y se conservan observaciones no vacías.
- **Fundamento:** no perder lo que el visitante agregó antes de autenticarse.
- **Consecuencia:** los ítems exclusivos del invitado se agregan; luego se elimina la clave guest.
- **Estado:** Vigente.

### D-49 — Identidad de ítem por producto + opcionales

- **Decisión:** dos productos iguales con distintos opcionales son ítems separados; el mismo producto con los mismos opcionales se acumula.
- **Fundamento:** el precio y la preparación dependen de los opcionales.
- **Consecuencia:** la clave `_key` se arma con `id_producto` y los ids de opcionales ordenados.
- **Estado:** Vigente.

### D-50 — Repetición de pedido

- **Decisión:** al repetir un pedido se reconstruye el carrito con productos, opcionales, cantidades y observaciones. Las promociones se agrupan y se vuelven a cargar si siguen vigentes; si no, se agregan sus productos sueltos.
- **Fundamento:** facilitar la recompra sin perder información.
- **Consecuencia:** los precios se recalculan con el catálogo actual; no se reutiliza el precio histórico para la nueva compra.
- **Estado:** Vigente.

---

## 10. Reportes y administración

### D-51 — Ventas solo con pedidos entregados

- **Decisión:** los reportes de ventas, facturación, ticket promedio y clientes top consideran solo pedidos `Entregado`.
- **Fundamento:** evitar contar pedidos cancelados o en curso como ventas consolidadas.
- **Consecuencia:** los reportes de cancelaciones y estados sí incluyen pedidos cancelados o activos según corresponda.
- **Estado:** Vigente.

### D-52 — Rango de fechas por defecto

- **Decisión:** si no se envían fechas, los reportes usan los últimos `reporte_dias_default` días inclusive hasta hoy (default 30). El rango máximo se controla con `reporte_dias_max` (default 365).
- **Fundamento:** dar una ventana de consulta útil sin configuración.
- **Consecuencia:** `desde` no puede ser posterior a `hasta`; las fechas se interpretan en zona horaria de Argentina. Los rankings usan `reporte_limite_default`/`reporte_limite_max` y el detalle de cancelados usa `reporte_cancelados_limit`.
- **Estado:** Vigente.

### D-53 — Alcance de reportes por rol

- **Decisión:** un empleado solo consulta reportes de su sucursal; un administrador puede consultar todas o filtrar por sucursal.
- **Fundamento:** separar responsabilidades y evitar fuga de datos entre sucursales.
- **Consecuencia:** un empleado sin sucursal asignada no puede consultar reportes.
- **Estado:** Vigente.

### D-54 — Segmentación de clientes

- **Decisión:** la administración clasifica clientes como “Sin pedidos”, “Recurrente” (`pedidos_cliente_recurrente` o más entregados, default 3), “Activo”, “Inactivo” (más de `dias_cliente_inactivo` días sin pedido, default 30) y “Con cancelaciones”.
- **Fundamento:** facilitar la lectura comercial de la base de clientes.
- **Consecuencia:** los segmentos se calculan en el frontend a partir del resumen de clientes y de los parámetros vigentes.
- **Estado:** Vigente.

### D-55 — Baja de empleados y reutilización de email

- **Decisión:** un empleado se da de baja lógicamente y su email se libera. Un administrador no puede darse de baja a sí mismo.
- **Fundamento:** permitir reutilizar cuentas y evitar bloqueos operativos.
- **Consecuencia:** el empleado dado de baja no puede iniciar sesión; su registro histórico permanece.
- **Estado:** Vigente.

### D-56 — Parámetros operativos configurables

- **Decisión:** los valores operativos que antes estaban fijos en código se administran desde `/api/parametros` y la pantalla `/admin/parametros`: tiempo base y velocidad de entrega, radio de cobertura por defecto, stock mínimo por defecto, límite del historial de reducciones, umbrales de segmentación de clientes y rangos/límites de reportes.
- **Fundamento:** permitir ajustes operativos sin despliegues y mantener una única fuente de verdad.
- **Consecuencia:** `services/parametroService.js` define defaults y metadata, cachea los valores y valida rangos/relaciones. `GET` está disponible para staff; `PUT` requiere `ADMIN`. No se exponen secretos ni configuración técnica (JWT, bcrypt, CORS, base de datos) en esta tabla.
- **Estado:** Vigente.

---

## 11. Resumen de decisiones que no deben cambiarse sin revisar el alcance

- Stock por materia prima y sucursal; stock de producto derivado de receta.
- Asignación de sucursal por cercanía, radio, horario y stock.
- Precio histórico en `DetallePedido` y relación con promoción.
- Flujo de estados en un solo sentido con historial.
- Promociones globales con vigencia.
- Carrito en navegador, separado por usuario y fusionado al iniciar sesión.
- Autorización real en backend, con alcance por sucursal.
- Reportes de ventas basados en pedidos entregados.

Cualquier cambio en estas reglas debe reflejarse en [`requerimientos-funcionales.md`](./requerimientos-funcionales.md), [`historias-usuario.md`](./historias-usuario.md), [`endpoints.md`](./endpoints.md) y en las pruebas correspondientes.
