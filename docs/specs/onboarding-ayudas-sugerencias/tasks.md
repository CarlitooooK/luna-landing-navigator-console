# Plan de tareas: tour, ayudas "?" y sugerencias

Cada tarea es un commit (Conventional Commits en español) y cita la sección de [`design.md`](design.md) que implementa y los hallazgos de [`audit.md`](audit.md) que cierra.

**Validación de cada tarea:** `npx tsc -b`, `npx oxlint src` y `npx vitest run`. No se corre `build`. Las pruebas son de lógica pura en entorno `node` (`vite.config.ts:11`). Lo visual se verifica con capturas contra el Backend oficial (D8 y D13 en `README.md`). El mock ya no se usa. El estado offline se prueba apuntando `VITE_API_BASE_URL` a un puerto sin servidor. Los errores que el backend sí produce se provocan con entradas inválidas (`ERR_INVALID_COORDINATES`, `ERR_DATE_OUT_OF_RANGE`, `ERR_INVALID_PAYLOAD`). Los que no se pueden provocar a voluntad (`ERR_UPSTREAM_SERVICE`, `ERR_TERRAIN_UNAVAILABLE`) se cubren con las pruebas de `nextStep()`.

**Orden.** Primero las correcciones de las que dependen las tres piezas (bloque A). Después las ayudas (B), las sugerencias (C) y al final el tour (D), que apunta a todo lo anterior. Dentro de cada bloque las tareas sin dependencia se pueden hacer en cualquier orden.

## Bloque A: correcciones base

### A1. `fix(textos)`: interfaz en inglés y sin jerga de desarrollo
- **Spec:** 4.4. **Cierra:** A-04 (parcial), A-14, X-03, C-07, S-01, D12.
- **Cambios:** `index.html` con `lang="en"`. Los textos de la tabla 4.4 en `SetupPanel.tsx`, `ComparePanels.tsx`, `SceneControls.tsx` y `ResultsPanel.tsx`, incluido "Landing date" en lugar de "Date" y el reemplazo de "None" en Compare.
- **Aceptación:**
  - `grep -rn "POST /\|from the API\|from the backend" src` no encuentra texto visible.
  - "Ground slope" y "Permanent shadow" son los únicos términos para la pendiente y la sombra permanente.
  - Setup dice "Landing date" y "Landing time (UTC)"; Compare dice "Landing date (UTC)".
- **Pruebas:** ninguna nueva; las 27 actuales siguen pasando.

### A2. `fix(setup)`: buscador de sitios como combobox accesible
- **Spec:** 4.1. **Cierra:** A-02 (P0).
- **Cambios:**
  - Función pura `moveActive(index, key, count)` en `src/features/simulate/combobox.ts`.
  - `SiteSearch` con `aria-activedescendant`, cierre por `focusout` y lista inicial de seis sitios.
- **Aceptación:**
  - Solo con teclado: Tab al buscador, ↓ ↓, Enter, y el sitio queda elegido.
  - Esc cierra la lista y, con la lista cerrada, borra el texto.
  - Con el ratón el comportamiento no cambia.
- **Pruebas:** `combobox.test.ts`: ↓ y ↑ con vuelta al inicio y al final, Home y End, lista vacía, índice −1 al abrir.

### A3. `fix(results)`: las cuentas atrás no dicen lo contrario de los datos
- **Spec:** 3.4. **Cierra:** A-05, A-06.
- **Cambios:**
  - Función pura `countdown(body, summary, timeline)` en `src/core/utils/countdown.ts`. Devuelve `{ kind: 'until-set' | 'until-rise' | 'never' | 'always', hours }`.
  - `Countdown` de Simple y la fila "Next set" de Detailed la usan. Los porcentajes entre 0 y 1 se muestran como "<1%".
- **Aceptación (Backend oficial, 2026-12-01, 14 días, 60 min):**
  - Chang'e 4 (2019-01-03) lee "Earth never in view".
  - Peak Near Shackleton lee "13d 7h until Earth rises", no "Earth stays in view".
  - Apollo 11 lee "N hours until sunrise", no "No sunset in this window".
  - Shackleton Rim lee "1 hour until sunset" y "Sunlit <1% of the mission".
- **Pruebas:** `countdown.test.ts` cubre las cuatro filas de la tabla de 3.4 para el Sol y para la Tierra, el orden entre ellas (la fila 1 gana a la 2) y el redondeo "<1%".

### A4. `feat(store)`: marcar los resultados desactualizados
- **Spec:** 3.2, fila "Resultados desactualizados". **Cierra:** A-07.
- **Cambios:**
  - `evaluatedFor` en `useMissionStore` (sitio, inicio, duración, paso y paneles de la última `evaluate()`).
  - Función pura `isStale(current, evaluatedFor)`.
  - Results atenuado al 60 % con el rótulo "Out of date".
- **Aceptación:** cambiar el sitio, la fecha o la duración después de evaluar muestra "Out of date". Volver a los mismos valores lo quita.
- **Pruebas:** `isStale` con cada campo cambiado, con todos iguales y con `evaluatedFor = null`.

### A5. `fix(timeline)`: el slider se puede usar con teclado
- **Spec:** 4.2. **Cierra:** T-01, T-03.
- **Cambios:**
  - Funciones puras `sliderStep(key, index, count, stepsPerDay)` y `dayOf(index, hoursPerStep)` en `src/core/utils/timeline.ts`.
  - `aria-valuetext` en el slider.
  - El scrubber también se puede usar en la pestaña "Horizon 360°".
- **Aceptación:**
  - Home, End, PageUp y PageDown funcionan.
  - El reloj y el eje dicen el mismo día en la hora 72.
- **Pruebas:** se amplía `timeline.test.ts`.

### A6. `fix(layout)`: la pantalla completa conserva el nivel de detalle y el origen de datos
- **Spec:** 4.3. **Cierra:** F-01.
- **Aceptación:** con `F`, la barra flotante muestra Simple/Detailed y el chip de origen de datos ("Live data", "Degraded" u "Offline"). Captura a 1440 × 900 sin desbordes.
- **Pruebas:** ninguna (solo presentación).

### A7. `feat(history)`: guardar avisa y no duplica
- **Spec:** 4.5. **Cierra:** A-10, H-01 (parcial).
- **Cambios:** `isSameRun(a, b)` en `useHistoryStore`; el estado "Saved" en el botón; región `aria-live`; History guarda y restaura los paneles; no se guarda si Results está desactualizado.
- **Aceptación:** dos clics seguidos dejan una sola corrida y el segundo dice "Already in history".
- **Pruebas:** se amplía `useHistoryStore.test.ts` (igual, distinto en cada campo, y paneles no guardados en corridas viejas).

### A8. `fix(store)`: la fecha de alunizaje por defecto cae de día
- **Spec:** D11 en `README.md`.
- **Cambios:** `startUtc` inicial de `useMissionStore.ts:90` pasa de `2026-12-01T00:00:00Z` a `2026-12-13T00:00:00Z`. Se reemplaza el comentario "valor de prueba de docs/07" por la razón del cambio.
- **Aceptación:** al abrir la consola, Setup muestra Dec 13, 2026. Con el Backend oficial, Apollo 11 da GO sin tocar nada.
- **Pruebas:** `time.test.ts` usa `2026-12-01` como dato de entrada de las funciones de formato, no como valor por defecto, así que no cambia. Las 27 pruebas siguen pasando.
- **Aviso al handoff:** `docs/07` del handoff conserva `2026-12-01` como ejemplo de prueba. No se edita, pero en el handoff de vuelta se avisa que la consola ya no arranca con esa fecha.

### A9. `fix(setup)`: la hora de alunizaje en formato de 24 horas
- **Spec:** A-16 en `audit.md`.
- **Cambios:**
  - "Landing time (UTC)" deja `<input type="time">`, que sigue el idioma del sistema, y pasa a un campo de texto `HH:MM` de 24 horas, con `inputmode="numeric"`, `font-mono` y validación al salir.
  - Función pura `parseUtcTime(text)` en `src/core/utils/time.ts`: acepta `H:MM` y `HH:MM` de 00:00 a 23:59; el resto devuelve un error.
- **Aceptación:** con el navegador en `en-US`, las 00:00 UTC se ven como "00:00". Un valor inválido muestra "Use 24-hour time, for example 05:00." y no cambia `startUtc`.
- **Pruebas:** se amplía `time.test.ts`: límites, un dígito en la hora, espacios y valores fuera de rango.

## Bloque B: ayudas "?"

### B1. `refactor(ui)`: `Field` deja de envolver sus controles en un `<label>`
- **Spec:** 2.2. **Cierra:** A-13. **Depende de:** nada.
- **Cambios:** `Field` como `<div>` con `<label htmlFor>` o `<span id>` y `aria-labelledby`; nueva propiedad `help?: HelpId`. Se actualizan todos los usos (`SetupPanel`, `ComparePanels`).
- **Aceptación:**
  - Un clic en el texto "Mission length" no cambia la duración.
  - Cada campo sigue teniendo nombre accesible: se revisa en el árbol de accesibilidad de Chromium.
- **Pruebas:** ninguna (estructura); `tsc` detecta los usos rotos.

### B2. `feat(help)`: catálogo de textos de ayuda
- **Spec:** 2.3, 2.4 y 2.5. **Depende de:** nada.
- **Cambios:** `src/features/help/glossary.ts` con un `HelpId` por entrada (`term`, `text`, `try?`, `group`) y los textos exactos de las tablas.
- **Aceptación:** los textos coinciden carácter por carácter con `design.md`. Las entradas marcadas "pendiente" (`psr`, `power`) llevan un comentario que cita la pregunta "Revisión de los textos científicos" del handoff (`README.md`).
- **Pruebas:** `glossary.test.ts`:
  - Ids únicos.
  - Todos los textos en una o dos frases, con 220 caracteres como máximo.
  - Todo `group` existe en el orden del glosario.
  - Ningún texto contiene un número seguido de `°`, `%` o `h` salvo los de la lista permitida: rangos del contrato y valores de "Try". Es la salvaguarda contra umbrales inventados.

### B3. `feat(ui)`: componente `HelpTip` y función `place()`
- **Spec:** 2.1. **Depende de:** B2.
- **Cambios:** `src/ui/HelpTip.tsx` con `popover`, `aria-expanded`, `aria-controls` y el texto oculto para `aria-describedby`; `src/ui/place.ts`, que también usará el tour.
- **Aceptación:**
  - Abre con clic, toque, Enter, Espacio y hover de 150 ms con puntero fino.
  - Cierra con Esc, al hacer clic fuera, al perder el foco y al retirar el puntero.
  - Con `prefers-reduced-motion` no hay animación `drip`.
- **Pruebas:** `place.test.ts` cubre los cuatro lados, el choque con el borde del viewport y un objetivo más grande que la tarjeta.

### B4. `feat(help)`: "?" en Setup, Results, Timeline, barra superior y Compare
- **Spec:** 2.3, 2.4 y 2.5. **Depende de:** B1, B2 y B3.
- **Cambios:**
  - Los "?" de las tablas en cada componente.
  - "Both" pasa a llamarse "Sun + Earth".
  - "Power" pasa a llamarse "Sunlight" en "Rank by".
  - El `title` del origen de datos se sustituye por el "?".
- **Aceptación:**
  - Cada `HelpId` del catálogo, salvo los del glosario puro, tiene al menos un "?" en pantalla.
  - Un lector de pantalla oye la ayuda al enfocar el campo.
  - Las capturas de Simple y Detailed no tienen desbordes.
- **Pruebas:** `usage.test.ts` lee el código con `import.meta.glob` (sin tipos de Node) y comprueba que cada ayuda usada existe y que cada entrada tiene un "?", salvo las del glosario puro (píldoras de escena, explicadas en Help y en el tour).

### B5. `feat(results)`: el porqué del veredicto con `site.checks`
- **Spec:** 2.7. **Cierra:** A-03, A-04. **Depende de:** A1.
- **Cambios:** función pura `verdictReasons(site)`, que devuelve `{ source: 'checks', items }` o `{ source: 'reasons', items, lang: 'es' }`; lista de checks en Simple y en Detailed.
- **Aceptación:**
  - Con v1.2 ("Backend oficial") los checks salen en inglés, con ícono y texto.
  - Con v1.1 ("Producción", o cualquier respuesta sin `checks`), Simple conserva el titular y Detailed rotula "Server notes (in Spanish)". Se prueba en `verdictReasons.test.ts`, sin depender de un ambiente.
- **Pruebas:** `verdictReasons.test.ts` cubre `checks` presentes, vacíos, ausentes y el orden por gravedad.

## Bloque C: sugerencias

### C1. `feat(suggest)`: función `nextStep()` con todos los estados
- **Spec:** 3.2, 3.3, 3.5 y 3.6. **Depende de:** A4 y B5.
- **Cambios:** `src/features/suggest/nextStep.ts`. Recibe un estado mínimo y devuelve `{ id, text, action?, secondary? }`. No toca el store.
- **Aceptación:** cada fila de las tablas de 3.2, 3.3, 3.5 y 3.6 tiene un `id` y un texto idénticos a `design.md`.
- **Pruebas:** `nextStep.test.ts` con un caso por fila (unos 30) y la precedencia de 3.3: `nogo` antes que `caution`; a igual gravedad, pendiente, después Sol, después Tierra.

### C2. `feat(suggest)`: bloque "Next step" en Simulate
- **Spec:** 3.1 y 3.2. **Cierra:** A-08, A-09. **Depende de:** C1.
- **Cambios:**
  - Componente `NextStep` (`raised`, `IconWell`, `ignite` una vez).
  - La regla de una sola tecla luminosa en `SetupPanel`.
  - Región `aria-live="polite"` con el veredicto y la sugerencia.
  - El error de arranque se muestra como "Sin conexión" y no como "Simulation failed".
- **Aceptación:**
  - En cada estado de 3.2 se ve una frase y como máximo un `btn-primary`.
  - Con `prefers-reduced-motion` no hay `ignite`.
  - Captura por estado.
- **Pruebas:** las de C1. Además, `primaryAction(state)` prueba que solo un control recibe `btn-primary`.

### C3. `feat(compare)`: "Compare dates", "Least bad" y sugerencias en Compare
- **Spec:** 3.3 ("Compare dates" y "Compare sites") y 3.6. **Cierra:** C-01, C-02, C-03. **Depende de:** C1 y B4.
- **Cambios:**
  - Función pura `dateVariants(scenario, [7, 14])`.
  - Acciones "Compare dates" y "Compare sites" en el store.
  - "Least bad" cuando el mejor es NO-GO.
  - Carga y error visibles en la fila del ojo.
- **Aceptación:**
  - Desde un CAUTION, "Compare dates" deja tres escenarios (+0, +7 y +14 días), cambia a Compare y lanza `compare()`.
  - Un fallo de `/evaluate` desde el ojo se ve.
- **Pruebas:** `dateVariants` (límite de cinco, duplicados y fechas fuera de 1900–2050). Se amplía `compare.test.ts` para "Least bad".

### C4. `feat(missions)`: veredicto y aviso de discrepancia en Missions
- **Spec:** 3.6 y 4.6. **Cierra:** M-01, M-02. **Depende de:** C1 y B5.
- **Cambios:**
  - `StatusChip` y checks en el brief.
  - Campo `earthNeverInView` en el catálogo.
  - Función pura `missionDisagrees(mission, t0)`.
- **Aceptación:** con el Backend oficial, Chang'e 4 no muestra la nota de discrepancia (los datos coinciden con el registro). El caso con nota se cubre en la prueba de `missionDisagrees`.
- **Pruebas:** `missionDisagrees` en sus cuatro combinaciones.

### C5. `feat(history)`: sugerencias de History
- **Spec:** 3.6. **Depende de:** C1.
- **Aceptación:** el estado vacío y el estado "sin corrida elegida" usan `NextStep`.
- **Pruebas:** las de C1.

## Bloque D: tour y Help

### D1. `feat(help)`: botón Help, glosario y atajos
- **Spec:** 2.6. **Depende de:** B2 y B3.
- **Cambios:** botón en `TopBar` y en `FullscreenBar`; la tecla `?` con la misma guarda que `F`.
- **Aceptación:**
  - `?` abre el popover y Esc lo cierra.
  - El glosario lista todas las entradas por grupo.
  - Los atajos listados existen todos.
- **Pruebas:** `glossaryGroups()` agrupa y ordena; se prueba junto con B2.

### D2. `feat(onboarding)`: estado persistente y `resolveSteps()`
- **Spec:** 1.2, 1.3 y 1.7. **Depende de:** nada.
- **Cambios:**
  - `useOnboardingStore` con `zustand/persist` en `lunar-navigator.onboarding`.
  - Función pura `resolveSteps(state)` y la constante `TOUR_SCENARIO` (Apollo 11, 2026-12-13, 14 días).
  - Lectura de `?tour=0` y `?tour=1`.
- **Aceptación:** la tabla de variantes de 1.3 se cumple fila por fila.
- **Pruebas:** `resolveSteps.test.ts` cubre:
  - las siete variantes;
  - la respuesta cuando `apollo-11` no está en `/sites`;
  - el contador "of 6" cuando falta el paso 5;
  - `?tour=0` y `?tour=1`;
  - los estados `unseen`, `dismissed` y `completed`;
  - la migración desde `version` ausente.

### D3. `feat(onboarding)`: tour con `<dialog>` y foco de luz
- **Spec:** 1.4, 1.5 y 1.6. **Depende de:** A2, A6, B3, C2, D1 y D2.
- **Cambios:**
  - Atributos `data-tour` en las siete anclas.
  - `src/features/onboarding/Tour.tsx`.
  - `ConsoleShell` ignora `F` y `?` con un `dialog[open]`.
  - El tour pone `workspace = 'simulate'` y `fullscreen = false` al iniciar.
- **Aceptación:**
  - Primera visita: aparece tras `init()`.
  - Esc, "Skip tour" y el botón de cierre lo marcan `dismissed`. "Done" lo marca `completed`.
  - El foco vuelve a donde estaba.
  - Sin backend y sin globo no se rompe: se capturan las dos variantes.
  - Con `prefers-reduced-motion` solo hay fundidos.
  - `?tour=0` lo suprime.
- **Pruebas:** las de D2 y `place()`. Se agrega `?tour=0` a la herramienta de capturas para que no tape las demás capturas.

### D4. `docs`: mapa interno al día
- **Depende de:** todo lo anterior.
- **Cambios:**
  - `docs/05-pantallas.md` documenta el tour, los "?", "Next step" y Help.
  - `docs/06-limitaciones-y-pendientes.md` quita lo resuelto y suma lo que quede abierto de [`README.md`](README.md).
  - `CLAUDE.md`, si cambian las reglas de uso.
- **Aceptación:** cada control nuevo aparece en `docs/05`.

## Hallazgos que este plan no cierra

Quedan fuera porque no afectan al entendimiento de la consola o porque dependen de otro repo. Se anotan en `docs/06` en D4.

| Hallazgo | Por qué queda fuera |
| --- | --- |
| A-11, A-12 (validación de paneles y coordenadas) | Robustez de formularios: va en una tarea propia |
| T-02 (leyenda y escala del horizonte) | Entra parcialmente con la ayuda `horizon-360`; la escala del eje es otra tarea |
| T-04 (banderas encimadas) | Presentación del timeline |
| S-01 (visibilidad de la escena), S-03 (terreno sin fuente), S-04 (abanico polar) | Render: `docs/06` y `P-008`. La ayuda `terrain-detail` ya muestra `grid.source` |
| S-02, X-04 (píldoras sin acción y `Segmented` sin flechas) | Accesibilidad de primitivas: tarea propia |
| C-04, C-05, C-06 (matriz de Compare) | Presentación de Compare; la ayuda `rank-by` ya explica el orden |
| H-02, H-03, H-04 (borrado, acciones parecidas, estrella pequeña) | History, fuera del flujo principal de la demo |
| M-03, M-04, M-05 (sobrescritura, siglas, desbordes de fuentes) | Pulido de Missions |
| F-02, F-03 (tiras plegadas, contraste) | Revisar con GPU real y medir contraste |
| X-05 (crédito en español) | Repo del globo: se pide a su equipo |
| X-07 (etiquetas del globo bajo los paneles) | Ajuste del vidrio o del globo: se revisa con GPU real |
| S-05 ("Horizon view" sin guía) | Entra en parte con la ayuda `horizon-view` (B4) y el paso 5 del tour. Indicar hacia dónde está la Tierra fuera de cuadro le toca al globo |
| X-06 (avisos del detector) | Se aceptan como están |
