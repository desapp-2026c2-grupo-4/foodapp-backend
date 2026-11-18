# Identidad visual — BAJON

## 1. Principios

La interfaz busca transmitir **comida rápida, cercanía y velocidad**, con una estética simple y directa:

- **Apettito:** rojo, naranja y marrón; imágenes de comida grandes.
- **Rapidez:** isotipo con líneas de movimiento y microanimación del carrito.
- **Claridad:** tarjetas blancas, bordes suaves y jerarquía tipográfica marcada.
- **Cercanía:** español rioplatense, acciones concretas y mensajes breves.
- **Mobile first:** navegación con hamburguesa y carrito flotante en mobile.

La marca visible es **BAJON**. “Foodapp” queda como nombre interno de los repositorios y claves técnicas.

---

## 2. Marca y tono

### Nombre

- **BAJON**, todo en mayúsculas en el logotipo y el título del documento.
- “Bajón” puede usarse en texto corrido cuando se hable de la marca.
- Evitar “Altoque” en la interfaz y la documentación nueva: es un nombre heredado de la plantilla.

### Personalidad

- Informal, directa, urbana y rioplatense.
- Orientada a la acción: “Pedí”, “Agregá”, “Elegí”, “Tocá el mapa”.
- Sin tecnicismos innecesarios para el cliente.
- Los mensajes administrativos pueden ser más formales, pero deben mantener claridad.

### Voz actual

La UI mezcla voseo (“Tocá”, “Agregá”, “Elegí”) con formas neutras (“Debes”, “Modifica”). **Recomendación:** unificar en voseo rioplatense en toda la experiencia de cliente y usar un registro neutral solo en mensajes técnicos o legales.

### Naming de funciones

| Concepto | Término visible |
|---|---|
| Pedido | Pedido |
| Producto | Producto |
| Combo | Promoción / Combo |
| Local | Sucursal |
| Insumo | Materia prima |
| Personal | Empleado |
| Administrador | Admin / Administrador |
| Cliente | Cliente |

---

## 3. Logotipo e isotipo

### Descripción

El isotipo es una hamburguesa estilizada con líneas de velocidad a la izquierda:

- Pan superior e inferior naranja.
- Líneas de movimiento rojas.
- Queso amarillo ondulado.
- Medallón marrón.
- Semillas blancas en el pan superior.

La imagen transmite movimiento y comida rápida, alineada con el nombre “BAJON”.

### Archivos

| Archivo | Uso |
|---|---|
| `src/assets/isotipo.svg` | Isotipo en la navbar y recursos de la app. |
| `public/favicon.svg` | Favicon del navegador. |

### Uso actual

- Navbar: 32 × 32 px (`w-8 h-8`), junto al texto “BAJON”.
- Color del texto de marca en navbar: `#F8A426`.
- Fondo de navbar: `#241C18`.

### Reglas de uso

- Mantener el isotipo sobre fondo oscuro o claro con contraste suficiente.
- No deformar, rotar ni recolorear.
- No agregar sombras ni contornos.
- Mantener un área de resguardo equivalente al alto de una semilla.
- Usar el isotipo solo, sin texto, en favicon y espacios reducidos.
- Usar isotipo + “BAJON” en la navbar y cabeceras.

### Deuda técnica

El SVG contiene una **imagen PNG embebida en base64** (841 × 579), no trazados vectoriales. Esto limita la nitidez en tamaños grandes y aumenta el peso del archivo. **Recomendación:** obtener una versión vectorial real o exportar un PNG optimizado para los tamaños usados.

---

## 4. Paleta de color

Los tokens están definidos en `src/index.css` con Tailwind 4 (`@theme`).

### Colores de marca

| Token | Hex | Uso |
|---|---|---|
| `primary` | `#E63946` | Acciones principales, precios, enlaces, foco. |
| `primary-dark` | `#C92A2A` | Hover de acciones principales. |
| `accent` | `#F9A826` | Promociones, badges de combo, botón de promo. |
| `text` | `#1F1F1F` | Texto principal. |
| `text-soft` | `#666666` | Texto secundario, ayudas, metadatos. |
| `background` | `#F8F9FA` | Fondo general de la app. |
| `white` | `#FFFFFF` | Tarjetas, modales, inputs. |
| `border` | `#E7E7E7` | Bordes y separadores. |
| `success` | `#2E9D5B` | Confirmaciones, estados entregados, stock disponible. |
| `warning` | `#F9A826` | Alertas suaves, pendientes. |
| `danger` | `#D62828` | Errores, cancelaciones, acciones destructivas. |

### Colores hardcodeados en navbar

| Hex | Uso |
|---|---|
| `#241C18` | Fondo de navbar y panel mobile. |
| `#F8A426` | Texto de marca y hover de enlaces. |
| `#FEFCFB` | Texto principal de navbar. |

**Recomendación:** convertir estos valores en tokens (`--color-nav`, `--color-nav-accent`, `--color-nav-text`) para evitar inconsistencias.

### Reglas

- El rojo es el color de acción principal; no usarlo para decoración extensa.
- El naranja se reserva para promociones y destacados.
- El verde se usa para éxito y disponibilidad.
- El rojo oscuro/danger se usa para errores, cancelaciones y bajas.
- No comunicar estados solo con color: acompañar con texto o icono.
- Evitar combinaciones de rojo sobre naranja o naranja sobre blanco con texto pequeño sin verificar contraste.

---

## 5. Tipografía

### Familia

- **Montserrat**, cargada desde Google Fonts en `index.html`.
- Pesos disponibles: 400, 500, 600, 700, 800.
- Fallback: `sans-serif`.

### Jerarquía actual

| Nivel | Estilo típico | Uso |
|---|---|---|
| Título de página | `text-2xl md:text-3xl font-extrabold` | Catálogo, reportes, clientes. |
| Título de sección | `text-xl font-extrabold` | Promociones, bloques. |
| Título de tarjeta | `font-semibold` / `font-bold` | Producto, promo, sucursal. |
| Cuerpo | `text-sm` | Descripciones y formularios. |
| Secundario | `text-xs text-text-soft` | Ayudas, fechas, metadatos. |
| Etiqueta | `text-[11px]` | Badges y chips. |

### Reglas

- Títulos en extrabold; cuerpo en regular o medium.
- No usar más de tres tamaños tipográficos en una misma tarjeta.
- Evitar mayúsculas sostenidas salvo badges cortos.
- No usar texto gris claro sobre fondo blanco para información importante.
- Mantener longitudes de línea legibles en descripciones.

### Dependencia externa

La tipografía se carga desde Google Fonts. Si no hay conexión, se usa el fallback del sistema. **Recomendación:** self-hostear Montserrat o definir una pila fallback explícita para evitar saltos visuales.

---

## 6. Layout y navegación

### Contenedor

- Ancho máximo habitual: `max-w-6xl`.
- Padding horizontal: `px-4`.
- Fondo general: `bg-background`.
- Tarjetas: `bg-white`, `border border-border`, `rounded-lg`, `shadow-sm`.

### Navbar

- Sticky en la parte superior (`sticky top-0 z-20`).
- Fondo marrón oscuro `#241C18`.
- Isotipo + “BAJON” a la izquierda.
- Enlaces según rol:
  - Cliente: Catálogo, Sucursales, Carrito, Mis pedidos, Perfil.
  - Staff: Pedidos, Productos, Materias primas, Reportes, Catálogo.
  - Admin: agrega Categorías, Sucursales, Promociones, Banners, Clientes, Empleados.
- Carrito destacado en rojo con contador.
- En mobile: botón hamburguesa con `aria-label` y panel desplegable.

### Carrito flotante

- Visible solo en mobile (`md:hidden`).
- Fondo `danger`, texto blanco, forma pill, sombra.
- Animación `cart-bump` de 0.45 s al agregar.
- Muestra contador en badge blanco.

### Páginas

- Título + subtítulo + contenido en tarjetas.
- Formularios en una columna, con labels arriba.
- Tablas en desktop y tarjetas en mobile para listados extensos.
- Modales centrados con overlay y cierre por botón.

---

## 7. Componentes y patrones

### Botones

| Tipo | Estilo |
|---|---|
| Primario | `bg-primary hover:bg-primary-dark text-white rounded-pill` |
| Promoción | `bg-accent hover:bg-amber-600 text-white rounded-pill` |
| Secundario | `bg-white border border-border rounded-pill` |
| Peligro | `bg-danger hover:bg-red-700 text-white rounded-pill` |
| Enlace | `text-primary underline` |

Reglas:

- Altura cómoda para touch (aproximadamente 40–44 px).
- Texto en sentence case, no mayúsculas.
- Un solo botón primario por bloque de decisión.
- Deshabilitar con `disabled:opacity-50` y evitar acciones repetidas.

### Tarjetas

- Producto: borde neutro, sombra suave, hover con sombra.
- Promoción: borde naranja de 2 px para diferenciarla.
- Sucursal: tarjeta seleccionable con borde primario y ring cuando está activa.
- Métrica: fondo blanco, borde, valor grande en primario.

### Badges y estados

`StatusBadge` usa color + texto:

| Estado | Color |
|---|---|
| Pendiente | Ámbar |
| Confirmado | Azul |
| Preparando | Naranja |
| Listo | Violeta (no usado en el flujo actual) |
| En camino | Índigo |
| Entregado | Verde |
| Cancelado | Rojo |

Reglas:

- No usar solo color; el texto siempre está presente.
- Mantener el mismo color para el mismo estado en toda la app.
- `Listo` debe implementarse o eliminarse para evitar un estado fantasma.

### Formularios

- Labels arriba, texto pequeño.
- Inputs con borde `border`, radio `rounded-md`, foco en `border-primary`.
- Mensajes de error en rojo con fondo `bg-red-50`.
- Mensajes de éxito en verde con fondo `bg-green-50`.
- Checkboxes con acento primario.
- Botones de guardar/cancelar en fila, con primario a la derecha.

### Mapas

- Leaflet + OpenStreetMap.
- Marcador personalizado en `src/utils/leafletIcon.js`.
- Mapa de selección de dirección y mapa de sucursales.
- Panel lateral de sucursales en desktop; lista debajo en mobile.
- Siempre mostrar instrucción breve: “Tocá el mapa para ubicar el marcador”.

### Imágenes

- Productos, promociones y banners usan `object-cover`.
- Fallback textual “Sin imagen” si la URL falla.
- Banners con overlay oscuro para asegurar legibilidad del título.
- No usar imágenes con texto incrustado como única fuente de información.

---

## 8. Formatos de contenido

### Dinero

- Se muestra con `$` y dos decimales: `$12.500,00` o `$12500.00` según el componente.
- **Recomendación:** unificar el formato local argentino (`$ 12.500,00`) y centralizar el formateador.

### Fechas y horas

- Fechas en formato local argentino.
- Fechas de reportes en `YYYY-MM-DD` para inputs.
- Zona horaria de referencia: `America/Argentina/Buenos_Aires`.
- Evitar mostrar fechas ISO crudas al usuario.

### Estados y textos

- “En preparación” es la etiqueta visible de `Preparando`.
- “En camino” se muestra con espacio.
- “Cancelado” y “Entregado” en masculino, concordando con “pedido”.
- Evitar abreviaturas técnicas en la UI del cliente.

### Mensajes

- Error: qué pasó y cómo resolverlo.
- Éxito: confirmación breve y siguiente paso.
- Vacío: explicar por qué no hay datos y ofrecer una acción.
- Carga: “Cargando…”, no spinners sin texto en pantallas completas.

---

## 9. Responsive

- Mobile first con Tailwind.
- Breakpoints usados: `sm`, `md`, `lg`.
- Navbar: enlaces en desktop, hamburguesa en mobile.
- Tablas: versión de tarjetas en mobile y tabla en desktop.
- Catálogo: grilla de 1 columna en mobile y varias en desktop.
- Reportes: bloques apilados en mobile.
- Mapas: altura reducida en mobile y mayor en desktop.
- Carrito: botón flotante en mobile.

Reglas:

- No ocultar información crítica en mobile; reorganizarla.
- Evitar scroll horizontal en tablas.
- Probar en 360 px, 768 px y 1280 px como mínimo.

---

## 10. Accesibilidad

### Lo que ya existe

- `alt` en el isotipo y en imágenes de productos.
- `aria-label` en el botón hamburguesa.
- Labels asociados a inputs en la mayoría de formularios.
- Estados con texto además de color.
- Foco visible en inputs y checkboxes.

### Deuda detectada

| Tema | Problema | Recomendación |
|---|---|---|
| Idioma | `index.html` declara `lang="en"` | Cambiar a `lang="es"`. |
| Contraste | Texto blanco sobre `accent` en tamaños pequeños | Verificar WCAG AA y oscurecer el naranja si hace falta. |
| Foco | Algunos botones no tienen `focus-visible` explícito | Agregar estilos de foco consistentes. |
| Modales | No se detecta trap de foco ni cierre con Escape | Implementar foco inicial, trap y Escape. |
| Formularios | Mensajes de error no siempre asociados con `aria-describedby` | Vincular errores a inputs. |
| Mapas | Información depende de interacción visual | Proveer lista textual de sucursales y direcciones. |
| Movimiento | No se respeta `prefers-reduced-motion` | Desactivar `cart-bump` y transiciones. |
| Imágenes | Falta `width`/`height` en algunas imágenes | Reservar espacio para evitar saltos. |

---

## 11. Consistencia y deuda visual

| Tema | Estado actual | Acción sugerida |
|---|---|---|
| Tokens de navbar | Colores hardcodeados | Mover a `@theme`. |
| Formato de dinero | Distintos formateadores | Centralizar utilidad. |
| Voz | Mezcla voseo/neutro | Unificar en voseo para cliente. |
| `Listo` | Badge sin flujo | Implementar o eliminar. |
| Logo | PNG embebido en SVG | Obtener vector real. |
| Tipografía | Google Fonts externo | Self-host o fallback explícito. |
| Estados vacíos | Textos dispares | Definir plantilla común. |
| Iconografía | Emojis, texto y SVG mezclados | Definir set de iconos. |
| Modales | Sin foco gestionado | Mejorar accesibilidad. |
| Modo oscuro | No existe | No implementar sin requerimiento. |

---

## 12. Aplicación a documentación y comunicación

- Usar “BAJON” como nombre visible en README, presentaciones y material de marca.
- Usar “Foodapp” solo para nombrar repositorios, paquetes o claves internas.
- Mantener la paleta y la tipografía en capturas, diapositivas y mockups.
- No usar el logo sobre fondos de bajo contraste.
- No inventar submarcas ni variantes del logo sin aprobación.
- En documentos Markdown no se aplican colores ni tipografía; la identidad se refleja en capturas y material exportado.

---

## 13. Checklist de revisión visual

- [ ] La pantalla usa los tokens de color definidos.
- [ ] Hay un solo botón primario por bloque.
- [ ] Los estados tienen texto además de color.
- [ ] Los textos usan voseo consistente en cliente.
- [ ] El dinero y las fechas tienen formato uniforme.
- [ ] La vista funciona en 360 px, 768 px y 1280 px.
- [ ] Las imágenes tienen `alt` y fallback.
- [ ] El foco es visible y el modal se puede cerrar con Escape.
- [ ] El contraste cumple AA para texto pequeño.
- [ ] No se usa “Altoque” en la interfaz nueva.
- [ ] El logo no está deformado ni recoloreado.
