# Documentación — Foodapp (BAJON)

## 1. Estado

- **Última actualización:** 2026-11-11.
- **Rama de trabajo:** `sprint5` (sin commit de cierre).
- **Estado del producto:** funcionalidades principales de cliente, empleado y administrador implementadas; Sprint 5 en curso.
- **Fuente de verdad:** código actual de `foodapp-backend` y `foodapp-frontend`.

Este directorio centraliza la documentación funcional, técnica y de identidad visual. La documentación nueva vive en `foodapp-backend/docs/`; el frontend la referencia desde su README cuando corresponde.

---

## 2. Empezar aquí

### Si querés entender el producto

1. [`alcance-funcional.md`](./alcance-funcional.md): qué hace el sistema, actores, módulos y límites.
2. [`decisiones-negocio.md`](./decisiones-negocio.md): reglas de negocio y por qué están así.
3. [`historias-usuario.md`](./historias-usuario.md): necesidades de cada rol y criterios de aceptación.

### Si vas a desarrollar

1. [`arquitectura.md`](./arquitectura.md): componentes, capas y flujos.
2. [`der-foodapp.md`](./der-foodapp.md): modelo de datos.
3. [`endpoints.md`](./endpoints.md): API REST.
4. [`requerimientos-funcionales.md`](./requerimientos-funcionales.md): comportamiento esperado por módulo.
5. [`testing.md`](./testing.md): cómo probar y qué falta.

### Si vas a evaluar o presentar

1. [`alcance-funcional.md`](./alcance-funcional.md).
2. [`incrementos-sprint.md`](./incrementos-sprint.md): evidencia de avance por sprint.
3. [`testing.md`](./testing.md): estado de las pruebas.
4. [`identidad-visual.md`](./identidad-visual.md): marca y criterios de UI.

---

## 3. Documentos

| Documento | Contenido | Estado |
|---|---|---|
| [`alcance-funcional.md`](./alcance-funcional.md) | Propósito, actores, módulos incluidos, fuera de alcance, restricciones y brechas. | Actualizado |
| [`decisiones-negocio.md`](./decisiones-negocio.md) | Decisiones vigentes, fundamentos y consecuencias. | Actualizado |
| [`requerimientos-funcionales.md`](./requerimientos-funcionales.md) | Requerimientos `RF-*` con prioridad y criterios de aceptación. | Actualizado |
| [`historias-usuario.md`](./historias-usuario.md) | Historias `HU-*` con escenarios y trazabilidad a RF. | Actualizado |
| [`incrementos-sprint.md`](./incrementos-sprint.md) | Avance por sprint con evidencia Git, pendientes y deuda. | Actualizado |
| [`testing.md`](./testing.md) | Estrategia, comandos, cobertura, brechas y checklist. | Actualizado |
| [`identidad-visual.md`](./identidad-visual.md) | Marca, tono, logo, paleta, tipografía, componentes y accesibilidad. | Actualizado |
| [`arquitectura.md`](./arquitectura.md) | Arquitectura técnica, capas, comunicación y flujos. | Existente |
| [`der-foodapp.md`](./der-foodapp.md) | DER en Mermaid; versión editable en `.drawio`. | Existente |
| [`endpoints.md`](./endpoints.md) | Endpoints REST, cuerpos, respuestas y códigos. | Existente |

---

## 4. Trazabilidad

```text
Alcance
  └── Decisiones de negocio
        └── Requerimientos funcionales (RF)
              └── Historias de usuario (HU)
                    └── Incrementos por sprint
                          └── Testing
```

Reglas:

- Cada requerimiento tiene un `ID` estable (`RF-*`).
- Cada historia referencia los requerimientos que la sustentan.
- Cada decisión relevante debe poder rastrearse a un requerimiento o a una regla de negocio.
- Cada brecha conocida debe aparecer en [`alcance-funcional.md`](./alcance-funcional.md) y, si afecta pruebas, en [`testing.md`](./testing.md).
- Los cambios de API se documentan en [`endpoints.md`](./endpoints.md), no en los documentos funcionales.

---

## 5. Brechas conocidas

| Brecha | Impacto | Documento |
|---|---|---|
| `Listo` existe en el esquema pero no en el flujo | Estado fantasma | [`decisiones-negocio.md`](./decisiones-negocio.md) |
| Sin tests de frontend | Regresiones no detectadas | [`testing.md`](./testing.md) |
| Sin CI | La suite no corre automáticamente | [`testing.md`](./testing.md) |
| `.env` versionado en frontend | Riesgo de configuración/secretos | [`incrementos-sprint.md`](./incrementos-sprint.md) |
| Logo con PNG embebido en SVG | Pérdida de nitidez en tamaños grandes | [`identidad-visual.md`](./identidad-visual.md) |
| `lang="en"` en HTML | Accesibilidad | [`identidad-visual.md`](./identidad-visual.md) |
| README raíz con comandos heredados | Confusión para nuevos desarrolladores | Este documento y [`testing.md`](./testing.md) |

---

## 6. Documentos heredados

- `../../doc.txt`: contexto histórico del proyecto. **No usar como fuente de verdad.**
- `../README.md`: README raíz del backend, basado en la plantilla original. Contiene comandos que ya no coinciden con `package.json` (`db:init`, `test:watch`) y credenciales de ejemplo con el nombre “Altoque”.
- `../../foodapp-frontend/README.md`: README de Vite, sin documentación funcional.

**Recomendación:** actualizar el README raíz para que apunte a este índice y use los scripts reales.

---

## 7. Convenciones

- **Idioma:** español rioplatense.
- **Marca:** BAJON en textos visibles; Foodapp en nombres de repositorios y claves técnicas.
- **Fechas:** `YYYY-MM-DD` para datos; formato local para UI.
- **Dinero:** indicar moneda y formato; no mezclar `$12.500,00` con `$12500.00` sin criterio.
- **Estados:** `Pendiente`, `Confirmado`, `Preparando`, `En camino`, `Entregado`, `Cancelado`.
- **Roles:** `CLIENTE`, `EMPLEADO`, `ADMIN`.
- **No inventar** fechas de sprint, métricas ni funcionalidades no implementadas.
- **Marcar** claramente lo planificado, lo parcial y lo fuera de alcance.

---

## 8. Cómo mantener la documentación

1. Si cambia una regla de negocio, actualizar [`decisiones-negocio.md`](./decisiones-negocio.md).
2. Si cambia el comportamiento, actualizar [`requerimientos-funcionales.md`](./requerimientos-funcionales.md) y [`historias-usuario.md`](./historias-usuario.md).
3. Si cambia la API, actualizar [`endpoints.md`](./endpoints.md).
4. Si cambia el modelo, actualizar [`der-foodapp.md`](./der-foodapp.md) y el `.drawio`.
5. Si cambia el alcance, actualizar [`alcance-funcional.md`](./alcance-funcional.md).
6. Si se agrega o modifica una prueba, actualizar [`testing.md`](./testing.md).
7. Si se cierra un sprint, actualizar [`incrementos-sprint.md`](./incrementos-sprint.md) con evidencia Git.
8. Si cambia la marca o la UI, actualizar [`identidad-visual.md`](./identidad-visual.md).

---

## 9. Verificación rápida de enlaces

Los enlaces de este índice son relativos a `foodapp-backend/docs/`. Para verificarlos:

```bash
# Desde foodapp-backend/docs
for f in README.md alcance-funcional.md decisiones-negocio.md \
         requerimientos-funcionales.md historias-usuario.md \
         incrementos-sprint.md testing.md identidad-visual.md \
         arquitectura.md der-foodapp.md endpoints.md; do
  test -f "$f" || echo "Falta: $f"
done
```

Los enlaces externos al repositorio usan `../../` para llegar a la raíz del workspace cuando corresponde.
