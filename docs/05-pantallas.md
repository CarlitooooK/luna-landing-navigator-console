# 05. Pantallas y controles

Qué hace cada control: la acción del store que dispara, si pide algo a la red y qué cambia en el render. Los textos de interfaz están en inglés (criterio 08 del reto).

## Elementos comunes

| Elemento | Archivo | Qué hace |
| --- | --- | --- |
| Rail (izquierda) | `layout/Rail.tsx` | Cambia de workspace (`setWorkspace`) con View Transition. No toca el fondo |
| Contexto de la TopBar | `layout/TopBar.tsx` › `Context` | Nombre del workspace y del sitio elegido (salvo en History) |
| Ícono de conexión | `layout/ConnectionStatus.tsx` | Aparece solo si no hay `health` y el error es `ERR_NETWORK`. Al pasar el puntero explica la caída, cuenta 20 s y reintenta `init()`. "Retry now" reintenta ya |
| Simple / Detailed | `TopBar` › `DetailToggle` | `setDetail`. Cambia el contenido de Setup, Results y Timeline; no hace red. Oculto en History |
| Origen de datos | `TopBar` › `DataSource` | "Connecting", "Live data", "Degraded" u "Offline". El `title` muestra la URL base |
| Full screen / `F` | `TopBar` y `ConsoleShell` | `toggleFullscreen`. Oculta el rail, cambia la TopBar por una barra flotante (con Simple/Detailed, salvo en History, y el origen de datos) y pliega los paneles en tiras (ver [`01`](01-arquitectura.md)). `F` no actúa si el foco está en un campo |
| Píldoras de escena | `simulate/SceneControls.tsx` | Arriba del área libre en Simulate, Compare y Missions (tabla abajo) |
| Timeline | `timeline/TimelineDock.tsx` | Abajo en Simulate, Compare y Missions, solo con evaluación (tabla abajo) |

### Píldoras de escena

| Estado | Píldoras | Acción |
| --- | --- | --- |
| Sin evaluación | Ninguna (o el error de escena si lo hubo) | — |
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
| Date / Time (UTC) | Ambos | `setConfig({startUtc})` | No |
| Mission length | Ambos | 7, 14 o 29,5 días | No |
| Time step | Detailed | 15, 60 o 120 min | No |
| Solar panels | Simple: resumen que se abre; Detailed: siempre abierto | Área (m²) y eficiencia (%) | No |
| **Run simulation** | Ambos | `evaluate()` ([`01`](01-arquitectura.md)) | Sí: `/evaluate`, `/terrain/patch`, `/psr/nearby` |
| Marcador (bookmark) | Ambos | Guarda la corrida en History (`useHistoryStore.save`) | No |
| "Last run took…" | Ambos | Tiempo de las tres peticiones y número de pasos | — |

Clic en un pin o en la superficie del globo equivale a elegir en Setup (`SITE_CLICKED` / `GLOBE_CLICKED`), salvo durante la escena de alunizaje.

### Results (derecha)

| Estado | Contenido |
| --- | --- |
| Sin corrida | Instrucción para empezar |
| Calculando | Esqueleto y "Tracing the 360° horizon…" |
| Error | `ErrorNotice` por código |
| Desactualizado | Si el sitio o algún parámetro cambió desde la última corrida (`evaluatedFor` del store, `isStale` de `core/utils/stale.ts`): aviso "Out of date. These results are for {sitio}, {fecha}…", resultados al 60 % y la tira plegada dice "Out of date" |
| Simple | Chip de estado y titular llano; "Daylight" y "Talk to Earth" (cuenta atrás y % en vista). La cuenta la decide `countdown()` (`core/utils/countdown.ts`): "until sunset" si el astro está visible al inicio, "until sunrise" o "until Earth rises" si empieza oculto, "No sunlight…" o "Earth never in view" con 0 %, y "No sunset…" o "Earth stays in view" si no se pone. Un porcentaje entre 0 y 1 se muestra "<1%"; "Solar power now" (`power_factor` del paso actual); "Ground" (pendiente y distancia a la PSR) |
| Detailed | Chip y `reasons` del backend (en español); tabla Sol/Tierra del paso actual (estado, azimut, elevación, horizonte, holgura = elevación − horizonte); % visibles, tramo continuo más largo, próximos ocasos; energía (factor actual, promedio, pico en W); terreno (elevación, pendiente, PSR) |

"Solar power now" y la tabla del paso actual cambian con el scrubber. Todo lo demás es el resumen de la corrida.

### Timeline (abajo)

| Control | Simple | Detailed |
| --- | --- | --- |
| Play / Pause | Avanza 4 pasos cada 100 ms. Al final se detiene; si está al final, reinicia | Igual, con velocidad 1×, 4× o 12× |
| Reloj | "Day N of M" y fecha UTC. El eje usa la misma regla (`dayOf`): la hora 72 es "Day 4" en los dos | "T+N h" y fecha UTC |
| Pistas | Sunlight, Earth in view | Sunlight, Earth link, Both (con %) y banderas de Sunset / Earthset |
| Scrubber | Arrastre sobre las pistas (`role="slider"`). Teclado (`sliderStep`): ←/→ un paso, PageUp/PageDown un día, Home/End los extremos. `aria-valuetext` dice "Day N of M, fecha" | Igual; `aria-valuetext` dice "T+N h, fecha" |
| Horizon 360° | — | Silueta de `horizon_profile` con el Sol y la Tierra del paso actual, y debajo el mismo scrubber sin las pistas |

Cada cambio de paso actualiza Results, la luz de la escena local y el Sol y la Tierra del globo. Sin red.

## Compare

| Control | Acción | Red |
| --- | --- | --- |
| Site + Date (UTC) + "Add scenario" | Agrega un escenario a las 00:00 UTC. Máximo 5; rechaza sitio + fecha repetidos | No |
| Ojo de un escenario | `showScenario()`: selecciona sitio y fecha y llama `evaluate()`. El fondo y el timeline pasan a ese escenario | `/evaluate`, `/terrain/patch`, `/psr/nearby` |
| Papelera | Quita el escenario y borra la comparación | No |
| "Compare scenarios" | `compare()` con 2 a 5 escenarios | `/compare` |
| "Rank by" | Reordena la recomendación (Balanced, Power, Earth link). Primero manda el estado del backend | No |
| Matriz "Side by side" | 8 métricas por escenario; "Best" en la mejor si no hay empate | — |

Compare usa la duración y el panel de Setup, pero siempre `step_minutes = 120`.

## History

| Control | Acción | Red |
| --- | --- | --- |
| Buscador y filtros (All, Starred, GO, NO-GO) | Filtra la lista local, agrupada por día UTC ("Today", "Yesterday", fecha) | No |
| Estrella | Marca o desmarca | No |
| Note | Texto libre guardado al escribir | No |
| "Open in Simulate" | Carga sitio, fecha, duración y paso; pasa a Simulate y evalúa | Sí, `evaluate()` |
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
| "Open as a new simulation" | Pasa a Simulate con la misión ya cargada | No |

La escena de alunizaje no se lanza sola desde Missions: tras "Replay" aparece la píldora "Landing scene" como en Simulate.
