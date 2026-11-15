# 05. Pantallas y controles

Qué hace cada control: la acción del store que dispara, si pide algo a la red y qué cambia en el render. Los textos de interfaz están en inglés (criterio 08 del reto).

## Elementos comunes

| Elemento | Archivo | Qué hace |
| --- | --- | --- |
| Rail (izquierda) | `layout/Rail.tsx` | Cambia de workspace (`setWorkspace`) con View Transition. No toca el fondo |
| Contexto de la TopBar | `layout/TopBar.tsx` › `Context` | Nombre del workspace y del sitio elegido (salvo en History) |
| Ícono de conexión | `layout/ConnectionStatus.tsx` | Aparece solo si no hay `health` y el error es `ERR_NETWORK`. Al pasar el puntero explica la caída, cuenta 20 s y reintenta `init()`. "Retry now" reintenta ya |
| Simple / Detailed | `TopBar` › `DetailToggle` | `setDetail`. Cambia el contenido de Setup, Results y Compare; no hace red. El timeline no cambia: va siempre en Detailed. Oculto en History |
| Origen de datos | `TopBar` › `DataSource` | "Connecting", "Live data", "Degraded" u "Offline". El `title` muestra la URL base |
| Full screen / `F` | `TopBar` y `ConsoleShell` | `toggleFullscreen`. Oculta el rail, cambia la TopBar por una barra flotante (con Simple/Detailed, salvo en History, el origen de datos y Help) y pliega los paneles en tiras (ver [`01`](01-arquitectura.md)). `F` no actúa si el foco está en un campo ni con un `<dialog>` abierto (`hotkeyFor`, `help/shortcuts.ts`) |
| Help / `?` | `help/HelpMenu.tsx` | Popover de 360 px con "Take the tour" (relanza el tour en el paso 2), el glosario por grupo (`glossaryGroups()`, el mismo texto de los "?", grupos plegables) y los atajos (`SHORTCUTS`). En la barra de pantalla completa el botón solo lleva el ícono y la tecla. `?` lo abre o lo cierra con la misma guarda que `F`; Esc y el clic fuera lo cierran (`popover="auto"`). No hace red |
| Píldoras de escena | `simulate/SceneControls.tsx` | Arriba del área libre en Simulate, Compare y Missions (tabla abajo) |
| Timeline | `timeline/TimelineDock.tsx` | Abajo en Simulate, Compare y Missions, solo con evaluación (tabla abajo) |

### Píldoras de escena

| Estado | Píldoras | Acción |
| --- | --- | --- |
| Globo listo (siempre) | "Recenter" | `recenter()` → `RECENTER`: vuelve a ver la Luna completa sin perder el sitio elegido, y la Luna gira sola |
| Globo listo, fuera del horizonte | "Grid on/off" y "Elevation on/off" (`MapControls`) | `toggleLayer('grid' \| 'elevation')` → `SET_CONFIG`. Apagadas por defecto. La elevación en color no llega más al sur de −85° |
| Sin evaluación | Solo las de mapa (o el error de escena si lo hubo) | — |
| Evaluado, globo listo, `viewMode = 'globe'` | "Horizon view" y "Landing scene" | `requestHorizon()` → el globo baja al suelo del sitio; `requestLanding()` → escena en el globo |
| Vista de horizonte pedida | Fase ("Drag to look around · scrub the timeline") y "Back to globe" | `clearHorizon()` → `EXIT_HORIZON`, vuelo de regreso a la esfera. La bandera persiste entre corridas: Compare, History y Missions llevan el horizonte al sitio nuevo |
| Evaluado, con `terrain`, `viewMode = 'globe'` | "Terrain detail" | `showSite()` → escena local encima del globo |
| `viewMode = 'site'` | "Back to globe" ("Global view" sin `VITE_GLOBE_URL`) | `backToGlobe()`; también pausa la reproducción |
| Escena pedida | Fase + telemetría (informativa) y "Exit scene" | `clearLanding()` → `STOP_LANDING_SCENE` y vuelo al sitio |

## Simulate

### Setup (izquierda)

| Control | Modo | Acción | Red |
| --- | --- | --- | --- |
| "Search N sites" | Simple | Filtra `/sites` por nombre o categoría (máx. 6) y `select()`. Al enfocarlo muestra los primeros seis. Teclado (combobox de ARIA APG): ↑ ↓ Home End recorren las opciones, Enter elige, Esc cierra la lista y, ya cerrada, borra el texto. Se cierra cuando el foco sale del buscador (`combobox.ts`) | No. En el globo: `SELECT_SITE` |
| Tarjeta del sitio | Simple | Muestra nombre, categoría y coordenadas (`fmtCoord`, longitud 0–360 E) | — |
| Catalog / Custom | Detailed | Elige entre selector de sitios y coordenadas libres | — |
| Selector "Site" | Detailed › Catalog | `select()` | No |
| Latitude / Longitude | Detailed › Custom | Valida `[-90, 90]` y `[-180, 360]` (D-010) y hace `select()` de un "Custom pin" en cada cambio válido | No |
| Landing date / Landing time (UTC) | Ambos | `setConfig({startUtc})`. La hora es un campo de texto de 24 horas (`HH:MM`, `parseUtcTime`), validado al salir o con Enter; no usa `<input type="time">` porque sigue el formato de 12 horas del sistema | No |
| Mission length | Ambos | 7, 14 o 29,5 días | No |
| Time step | Detailed | 15, 60 o 120 min | No |
| Solar panels | Simple: resumen que se abre; Detailed: siempre abierto | Área (m²) y eficiencia (%) | No |
| **Run simulation** | Ambos | `evaluate()` ([`01`](01-arquitectura.md)) | Sí: `/evaluate`, `/terrain/patch`, `/psr/nearby` |
| Marcador (bookmark) | Ambos | Guarda la corrida en History (`useHistoryStore.save`), con sus paneles. Dice "Saved to history." o, si ya existe una igual (`isSameRun`), "Already in history." sin duplicarla. Deshabilitado si Results está desactualizado | No |
| "Last run took…" / "Computed in…" | Ambos | Simple: tiempo de las peticiones. Detailed: tiempo y número de muestras | — |

Clic en un pin o en la superficie del globo equivale a elegir en Setup (`SITE_CLICKED` / `GLOBE_CLICKED`), salvo durante la escena de alunizaje.

### Results (derecha)

| Estado | Contenido |
| --- | --- |
| Sin corrida | Solo "Next step": sin sitio, "Browse sites" o "Replay a real mission"; con sitio, "Ready: {sitio}, {fecha}, {n} days." |
| Calculando | Esqueleto y "Tracing the 360° horizon…" |
| Error | "Simulation failed" y "Next step" con la frase y la acción del código (`nextStepSimulate`). Sin conexión (sin `/health` y `ERR_NETWORK`) no dice "Simulation failed": dice que el servidor no responde y ofrece "Retry now" |
| Desactualizado | Si el sitio o algún parámetro cambió desde la última corrida (`evaluatedFor` del store, `isStale` de `core/utils/stale.ts`): aviso "Out of date. These results are for {sitio}, {fecha}…", resultados al 60 % y la tira plegada dice "Out of date" |
| Simple | Chip de estado y titular llano; "Daylight" y "Talk to Earth" (cuenta atrás y % en vista). La cuenta la decide `countdown()` (`core/utils/countdown.ts`): "until sunset" si el astro está visible al inicio, "until sunrise" o "until Earth rises" si empieza oculto, "No sunlight…" o "Earth never in view" con 0 %, y "No sunset…" o "Earth stays in view" si no se pone. Un porcentaje entre 0 y 1 se muestra "<1%"; "Solar power now" (`power_factor` del paso actual); "Ground" (pendiente y distancia a la PSR) |
| Detailed | Chip y el porqué del veredicto (`verdictReasons` de `core/utils/verdict.ts`): con `site.checks`, "{n} checks from the server", del más grave al menos grave, con ícono y `message` en inglés; sin ellos (v1.1), `reasons` con el rótulo "Server notes (in Spanish)" y `lang="es"`. En Simple, los checks reemplazan al párrafo genérico del titular; tabla Sol/Tierra del paso actual (estado, azimut, elevación, horizonte, holgura = elevación − horizonte); % visibles, tramo continuo más largo, próximos ocasos; energía (factor actual, promedio, pico en W); terreno (elevación, pendiente, PSR) |

**Next step** (`features/suggest/`): al final de Results, una sola sugerencia con su acción (`nextStepSimulate`, `useStepActions`). Con resultados vigentes o con un error, su acción es la tecla luminosa y "Run simulation" baja a secundario (`stepIsPrimary`). "Compare dates" agrega el sitio actual en su fecha, +7 y +14 días, pasa a Compare y compara (`compareDates`); "Compare sites" agrega el escenario actual y enfoca el sitio de Compare (`compareSites`). Una región `aria-live` anuncia el veredicto y la sugerencia.

"Solar power now" y la tabla del paso actual cambian con el scrubber. Todo lo demás es el resumen de la corrida.

### Timeline (abajo)

El timeline va **siempre en Detailed**, con Simple o con Detailed: es donde se elige la velocidad y la vista de abajo (decisión del usuario, 2026-11-15).

| Control | Comportamiento |
| --- | --- |
| Play / Pause | Avanza 1, 4 (por defecto) o 12 pasos cada 100 ms ("Playback speed"). Al final se detiene; si está al final, reinicia |
| Reloj | "T+N h" y fecha UTC |
| Pistas | Sunlight, Earth link y Sun + Earth, cada una con su "?" y su %, y banderas de Sunset / Earthset |
| Scrubber | Arrastre sobre las pistas (`role="slider"`). Teclado (`sliderStep`): ←/→ un paso, PageUp/PageDown un día, Home/End los extremos. `aria-valuetext` dice "T+N h, fecha" |
| Vista de abajo ("Bottom view") | "Timeline" (las pistas) o "Horizon 360°": silueta de `horizon_profile` con el Sol y la Tierra del paso actual, y debajo el mismo scrubber sin las pistas |

Cada cambio de paso actualiza Results, la luz de la escena local y el Sol y la Tierra del globo. Sin red.

### Ayudas "?"

Cada término y número tiene un "?" (`features/help/Help.tsx`, textos en `features/help/glossary.ts`): campos de Setup, chip de veredicto, métricas de Results Simple y filas de Detailed, pistas del timeline y Horizon 360°, Simple/Detailed, origen de datos y Compare ("Scenarios" y "Rank by"). Abre con clic, toque, Enter o Espacio, y con hover de 150 ms si el puntero es fino; cierra con Esc o clic fuera. Dentro de un `Field`, el texto también se lee al enfocar el campo (`aria-describedby`). Las píldoras de escena no llevan "?": se explican en el glosario de Help y en el tour.

## Compare

| Control | Acción | Red |
| --- | --- | --- |
| Site + Landing date (UTC) + "Add scenario" | Agrega un escenario a las 00:00 UTC. Máximo 5; rechaza sitio + fecha repetidos | No |
| Ojo de un escenario | `showScenario()`: selecciona sitio y fecha y llama `evaluate()`. El fondo y el timeline pasan a ese escenario. La fila dice "Loading on the globe…" mientras carga y avisa si falla | `/evaluate`, `/terrain/patch`, `/psr/nearby` |
| Papelera | Quita el escenario y borra la comparación | No |
| "Compare scenarios" | `compare()` con 2 a 5 escenarios. Es la tecla luminosa mientras haya algo que comparar | `/compare` |
| Next step | `nextStepCompare`: sin escenarios, "Add the current simulation"; con uno, "Add +7 days"; comparado, "Open in Simulate" con el primero del ranking, o "Add a scenario" si todos son NO-GO. En ese caso el rótulo "Recommended" pasa a "Least bad · still NO-GO" | Según la acción |
| "Rank by" | Reordena la recomendación (Balanced, Sunlight, Earth link). Primero manda el estado del backend | No |
| Matriz "Side by side" | Filas según Simple/Detailed (tabla abajo). "Best" en la mejor de las filas con barra, si no hay empate. Sin ocaso nunca dice "None" | — |

Compare usa la duración y el panel de Setup, pero siempre `step_minutes = 120`.

### Simple y Detailed en Compare

Mismos datos de `/compare` en los dos modos; cambia cuánto se muestra y cómo se dice (C-06 del audit). Los términos siguen a Results: "Daylight" y "Talk to Earth" en Simple, "Sunlight" y "Earth link" en Detailed.

| Parte | Simple | Detailed |
| --- | --- | --- |
| Matriz | 4 filas: Daylight y Talk to Earth (porcentaje entero, `pctWhole`), First sunset en días (`setCellPlain`: "In 3 days", "No sunset in this window", "Rises later") y Ground slope | 11 filas: Sunlight y Earth link (un decimal), Longest daylight y Longest link (h), First sunset y First Earthset (h, `setCell`), Peak power (W), Average factor (`avg_power_factor`), Ground slope, Elevation (m) y Nearest PSR (km, distancia al borde) |
| Fila de escenario | Sitio, veredicto y fecha | Además la hora UTC y las coordenadas (`fmtCoord`) |
| "Recommended" | Fecha, el veredicto con el título de Results ("A good place to land"…), Sol y Tierra en porcentaje entero y por qué gana según "Rank by" | Fecha, veredicto, porcentajes con un decimal, la regla del orden ("Ranked by verdict, then sunlight % + Earth link %.") y el puntaje del ganador (`score`) |

## History

| Control | Acción | Red |
| --- | --- | --- |
| Next step (estado vacío) | `nextStepHistory`: "Save a run from Simulate to keep it here." con "Start a simulation", que pasa a Simulate y enfoca el buscador de sitios | No |
| Next step (sin corrida elegida) | "Pick a run to see its summary." en el panel derecho, sin acción | — |
| Buscador y filtros (All, Starred, GO, NO-GO) | Filtra la lista local, agrupada por día UTC ("Today", "Yesterday", fecha) | No |
| Estrella | Marca o desmarca | No |
| Note | Texto libre guardado al escribir | No |
| "Open in Simulate" | Carga sitio, fecha, duración, paso y, si la corrida los guardó, los paneles; pasa a Simulate y evalúa | Sí, `evaluate()` |
| "Duplicate and edit" | Carga los parámetros y pasa a Simulate sin evaluar | No |
| "Add to Compare" | Agrega el escenario y pasa a Compare | No |
| "Delete run" | Borra la corrida | No |

History no tiene píldoras de escena ni timeline.

## Missions

| Control | Acción | Red |
| --- | --- | --- |
| Buscador y región | Filtra el catálogo estático de 7 alunizajes | No |
| Tarjeta de misión | `pickMission()`; muestra fecha, región, coordenadas, resumen y fuentes | No |
| "Replay landing window" | Selecciona el sitio de la misión (`id: mission:<id>`), fija el inicio en la hora en punto anterior al alunizaje y 14 días, y evalúa | Sí, `evaluate()` |
| "Conditions at touchdown" | Sol, Tierra y pendiente del paso 0 de esa evaluación | — |
| Veredicto del brief | `StatusChip` con "?" y la lista de checks (`VerdictList`, la misma de Results) de la ventana de 14 días | — |
| Nota de discrepancia | Solo si el catálogo afirma `earthNeverInView` y `summary.earth_visible_pct > 0` (`missionDisagrees`). Avisa, no decide quién tiene razón | — |
| Next step "Open as a new simulation" | Aparece tras el replay (`nextStepMissions`). Pasa a Simulate con la misión ya cargada; "Replay again" queda como botón secundario | No |

La escena de alunizaje no se lanza sola desde Missions: tras "Replay" aparece la píldora "Landing scene" como en Simulate.

### Vista de horizonte al simular

"Run simulation" (Simulate), "Replay landing window" (Missions), "Run again" / "Try again" del Next step y la acción del paso 2 del tour pasan por `simulate/runSimulation.ts`. Con el globo listo, este arma `horizonNext` antes de `evaluate()` y, al llegar la evaluación, el puente pide la vista de horizonte en lugar de volar sobre el sitio. Compare y History no la arman: siguen volando al sitio. Sin globo (`loading` o `unavailable`) no se arma nada.

El suelo sigue la luz del paso del timeline con un fundido de 350 ms. Sin Sol sobre el horizonte queda en penumbra (la mitad del brillo diurno), nunca en negro.

## Tour

Siete pasos (seis sin píldoras de escena) en `features/onboarding/`: `Tour.tsx` los pinta, `steps.ts` decide cuáles y con qué texto (`resolveSteps`) y `useOnboardingStore` guarda si ya se vio (ver [`01`](01-arquitectura.md)). Es un `<dialog>` modal: trampa de foco, Esc, la página inerte detrás. Un foco de luz marca el ancla `data-tour` del paso: el resto se atenúa y el ancla lleva un contorno del color del Sol que respira (`tour-breathe`, solo opacidad, 2,4 s). Es un único marco siempre montado que viaja de un ancla a la siguiente en 560 ms (`--ease-out`), recortado a la ventana. Sin ancla (o si no mide nada) se encoge a un punto en el centro, el contorno se apaga y la tarjeta va centrada sobre el velo.

| Paso | Ancla | Acción del paso | Red |
| --- | --- | --- | --- |
| 1. Find a safe place to land on the Moon | — | "Take the tour" · "Skip" | No |
| 2. Where, when, run | `setup` | Sin sitio: "Try Apollo 11" (`select` + `setConfig` con `TOUR_SCENARIO`). Con sitio: "Run simulation" o "Run again" (`evaluate`). Sin backend: ninguna, con nota | Sí, `evaluate()` |
| 3. The verdict, and why | `results` | — | — |
| 4. Time is the main control | `timeline`, o centrada sin evaluación | "Play" / "Pause" (`setPlaying`) | No |
| 5. See it on the ground | `scene` (fila de píldoras) | "Horizon view" (`requestHorizon`) con el globo listo. Si el horizonte ya está abierto (lo abrió el paso 2), describe la vista y no lleva botón. Sin globo solo describe "Terrain detail" o "Global view". Se omite sin píldoras | No |
| 6. Two levels of detail | `detail` | "Show Detailed" / "Show Simple" (`setDetail`) | No |
| 7. Where to go next | `rail` | "Done" | No |

| Situación | Comportamiento |
| --- | --- |
| Primera visita (`unseen`) | Se abre en el paso 1 cuando `init()` terminó, bien o mal, y 700 ms después (entrada de los paneles) |
| Esc, "Skip tour", "Skip" o la X | Cierra y guarda `dismissed` |
| "Done" | Cierra y guarda `completed` |
| Help › "Take the tour" o `?tour=1` | Abre en el paso 2, sea cual sea el estado guardado |
| `?tour=0` | No se abre solo; no toca `localStorage`. Lo usa la herramienta de capturas |
| Al abrir | Pasa a Simulate y sale de pantalla completa (`startTour`) |
| Al cerrar | El foco vuelve a donde estaba; si se lanzó desde Help en pantalla completa, al botón Help de la TopBar |
| Mientras está abierto | `F` y `?` no actúan (`hotkeyFor` con `dialog[open]`) |
| `prefers-reduced-motion` | El marco salta de lugar sin viajar, el contorno no respira y solo se funde (150 ms); la tarjeta entra sin `condense` |

"Next" nunca depende de haber pulsado la acción del paso: el tour se puede recorrer leyendo.

