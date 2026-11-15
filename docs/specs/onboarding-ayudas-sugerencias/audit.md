# Audit UX: Lunar Navigator Console

Recorrido de la consola el 2026-11-14, rama `feat/simulacion-en-globo` (`29ba38b`). La spec que resuelve estos hallazgos está en [`design.md`](design.md); el plan, en [`tasks.md`](tasks.md); las preguntas abiertas, en [`README.md`](README.md).

## Método

- **Revisión de código** de todo `src/` (salvo `src/types/api.d.ts`, que es generado). Las líneas citadas se verificaron leyendo el archivo.
- **Recorrido en navegador** con `playwright-core`, un headless shell y render por software, a 1440 × 900, con el globo local en el 5174.
  - **Primera pasada (mock):** cubrió todos los flujos. Se descartó para la evidencia de datos porque el proceso del mock era viejo (arrancó a las 16:24, antes de la sincronización de las 20:29: `reasons` con umbral de DTE del 50 % y sin `checks`). Además, el mock es sintético: el Sol nunca se pone (`contexto-sesiones/iniciativas/lunar-globe-renderer/CONOCIMIENTO.md` del handoff).
  - **Segunda pasada (Backend oficial, v1.3):** la evidencia de [`evidencia/`](evidencia/) sale de aquí, salvo e06 (teclado) y e07 (offline), que no dependen de los datos. El mock ya no se usa (D13 en `README.md`).
  - **Offline:** se probó contra un puerto sin servidor.
- **Consultas directas** a `/sites` y `/evaluate` del Backend oficial con `curl`, para los 13 sitios en la fecha por defecto y para cuatro sitios en fechas de diciembre (ver D3 y D11 en `README.md`).
- **Detector de impeccable** (`impeccable detect --json src`).
- **Evidencia:** las capturas están en [`evidencia/`](evidencia/) y se citan como `eNN`. Las de "Horizon view" (consola PR `#9`) se tomaron el 2026-11-14 sobre `main` en `52ab449`, contra el Backend oficial y el globo `a891c85`, y se citan como `hNN`.
- **Límites.** No hubo GPU real, VoiceOver ni pruebas con usuarios. Lo que solo se dedujo del código se marca **[código]**.

### Escalas

| Severidad | Significado |
| --- | --- |
| P0 | Bloquea la tarea para algún usuario |
| P1 | Confusión seria o un dato que se lee al revés |
| P2 | Molestia que tiene un rodeo |
| P3 | Pulido |

| Criterio de la rúbrica (`.handoff/docs/04-reglas-del-reto.md`) | Abreviatura |
| --- | --- |
| 2. User Experience (UX/UI) | UX |
| 4. Use of NASA Data | DATA |
| 5. Scientific Solution | SCI |
| 7. Art & Technology | ART |
| 8. Communication | COM |

## Resumen

- **Heurísticas de Nielsen: 19/40.** Lo que más baja la nota es la ayuda (1/4), la consistencia (1/4) y el lenguaje del usuario (2/4).
- **Lo que funciona:**
  - Los estados vacíos de Results y de History dicen qué hacer.
  - El origen de datos ("Live data", "Offline") está siempre a la vista.
  - El veredicto no depende solo del color: el chip lleva ícono y texto.
  - El aviso offline está bien resuelto para lector de pantalla.
  - El descenso se rotula "Illustrative".
- **Lo que más pesa en la demo:**
  - Un usuario nuevo no sabe qué hacer al abrir la consola (e01).
  - Un NO-GO en Simple no dice por qué (e02).
  - En Detailed las razones llegan en español aunque el servidor ya manda `checks` en inglés (e05).
  - Con teclado no se puede elegir un sitio (e06).
  - Varias métricas se pueden leer al revés: "Earth stays in view" donde la Tierra nunca se ve o empieza oculta.
  - Tras un resultado no hay ninguna sugerencia de qué sigue.

## Hallazgos

### Primer contacto y Simulate

| ID | Sev. | Rúbrica | Hallazgo | Evidencia |
| --- | --- | --- | --- | --- |
| A-01 | P1 | UX, COM | **Al abrir, nada explica para qué sirve la consola.** Solo están el globo y un Setup vacío. "Run simulation" aparece apagado sin decir por qué. La marca "Lunar Navigator" solo se ve en pantalla completa; en la vista normal es un `title` | e01; `layout/Rail.tsx:21`; `simulate/SetupPanel.tsx:144` |
| A-02 | P0 | UX | **Con teclado no se puede elegir un sitio en Simple, que es el modo por defecto.** `onBlur` cierra la lista a los 120 ms. Al pulsar Tab el foco cae en `BODY` y la lista se desmonta (0 opciones). Las flechas no recorren las opciones y Enter no elige nada. El único rodeo es cambiar a Detailed | e06; `simulate/SetupPanel.tsx:30-45` |
| A-03 | P1 | UX, COM | **Un NO-GO o un CAUTION en Simple no dice cuál condición falló.** El titular es fijo por estado ("At least one condition fails") y `site.reasons` solo se pinta en Detailed. Contradice el principio 4 de `PRODUCT.md` | e02; `simulate/ResultsPanel.tsx:9-13`, `:57-79` |
| A-04 | P1 | COM | **Las razones del veredicto en Detailed están en español aunque el servidor manda `checks` en inglés.** Con el Backend oficial, Shackleton Rim muestra "Pendiente crítica (16.0° > 15.0° límite máximo de alunizaje)" e "Iluminación solar crítica…", con el rótulo "3 checks from the backend". La consola ignora `site.checks`. Además, `index.html:2` declara `lang="es"` con la interfaz en inglés | e05; `simulate/ResultsPanel.tsx:94`, `:97` |
| A-05 | P1 | SCI, COM | **"Earth stays in view" cuando `hours_to_next_earthset` es `null`.** **Confirmado con el Backend oficial:** Chang'e 4 (45.44° S, 177.60° E, 2019-01-03) devuelve `earth_visible_pct: 0` con `hours_to_next_earthset: null`, y la consola diría "Earth stays in view" en el único sitio del catálogo desde donde la Tierra nunca se ve. Pasa lo mismo con "No sunset in this window" en un sitio en sombra | `simulate/ResultsPanel.tsx:70`, `:72`; `.handoff/docs/12-contrato-api-v1.2.md:205-208` |
| A-06 | P1 | SCI, COM | **Con el astro oculto al inicio, la consola dice que nunca se pone.** El Backend oficial manda `hours_to_next_*` en `null` cuando el astro empieza oculto, y la consola lee ese `null` como "no se pone". Peak Near Shackleton el 2026-12-01 empieza con la Tierra oculta (sale en el paso 319, 5 % del tiempo visible) y Results diría "Earth stays in view". Apollo 11 en la misma fecha empieza de noche y diría "No sunset in this window". Aparte, el redondeo deja "Sunlit 0% of the mission" junto a "1 hour until sunset" en Shackleton Rim (0.3 %) | e02; consultas a `/evaluate` (ver `P-012` del handoff); `simulate/ResultsPanel.tsx:70`, `:72` |
| A-07 | P1 | UX | **Los resultados quedan vigentes con otros parámetros.** `select()` no limpia `evaluation`. Con una latitud inválida (95) Results sigue mostrando el veredicto anterior y "Run simulation" sigue habilitado | e04; `core/store/useMissionStore.ts:106` |
| A-08 | P1 | UX | **El fallo de arranque aparece como "Simulation failed"** sin haber simulado. El buscador dice "Search sites" sin número y no muestra lista. "Run simulation" está apagado y nada explica por qué | e07; `core/store/useMissionStore.ts:101`; `simulate/ResultsPanel.tsx:160`, `:181` |
| A-09 | P1 | UX | **Tras un resultado no hay próxima acción.** Las píldoras "Landing scene" y "Terrain detail" aparecen sin presentarse. No hay puente a Compare ni a otra fecha. El bookmark es un ícono sin texto | e02; `simulate/SetupPanel.tsx:147` |
| A-10 | P2 | UX | **Guardar en History no da ninguna señal y duplica.** Dos clics en el bookmark crean dos corridas idénticas | e14, e09; `simulate/SetupPanel.tsx:147-149`; `core/store/useHistoryStore.ts:39-45` |
| A-11 | P2 | UX | **"Solar panels" en Simple se abre y no se vuelve a cerrar.** Los campos de panel no aceptan decimales a medias ("4." pasa a 4) y, al vaciarlos, quedan en 0 y se rechazan sin mensaje **[código]** | `simulate/SetupPanel.tsx:115-131` |
| A-12 | P2 | UX | **En Custom, un campo vacío cuenta como 0.** Los campos no se actualizan al hacer clic en el globo. Si las dos coordenadas son inválidas, solo se ve el error de la latitud **[código]** | `simulate/SetupPanel.tsx:69-83` |
| A-13 | P2 | UX | **`Field` es un `<label>` que envuelve un `Segmented`.** Un clic en el texto "Mission length" activa "7 days". Esto también impide poner un "?" junto a la etiqueta **[código]** | `ui/index.tsx:79`; `simulate/SetupPanel.tsx:99-106` |
| A-14 | P2 | COM | **Hay jerga de desarrollo en pantalla:** "POST /evaluate · 2.52 s · 336 steps", "From POST /compare", "Open the local terrain from the API" | e03, e08; `simulate/SetupPanel.tsx:153`; `comparator/ComparePanels.tsx:126`; `simulate/SceneControls.tsx:66` |
| A-15 | P2 | UX | **"Solar power now" cambia con el timeline y "Daylight" no.** Nada distingue lo que depende del instante de lo que resume la ventana | e02; `simulate/ResultsPanel.tsx:70-77` |
| A-16 | P1 | UX, SCI | **El campo de hora usa el formato de 12 horas del sistema y se corta el AM/PM.** `<input type="time">` sigue el idioma del navegador: con `en-US`, las 00:00 UTC se ven como "12:00", y el panel no muestra el "AM". La hora de alunizaje parece mediodía mientras el timeline dice "00:00 UTC". Se vio en todas las capturas (2026-12-17 00:00 UTC aparece como "12:00") | h03 a h06; `simulate/SetupPanel.tsx:97` |

### Timeline

| ID | Sev. | Rúbrica | Hallazgo | Evidencia |
| --- | --- | --- | --- | --- |
| T-01 | P1 | UX | **El slider casi no sirve con teclado.** Cada flecha avanza un paso (336 pasos en 14 días a 60 min) y no hay Home, End, PageUp ni PageDown. En la pestaña "Horizon 360°" el scrubber desaparece | `timeline/TimelineDock.tsx:104`, `:136-141` |
| T-02 | P2 | SCI, COM | **"Horizon 360°" no tiene leyenda ni escala.** El Sol y la Tierra son solo puntos de color y el eje vertical no tiene números. El `aria-label` del `<g>` no se expone dentro de `role="img"` | e05; `timeline/HorizonChart.tsx:33-50` |
| T-03 | P2 | UX | **Las etiquetas de día no coinciden.** El reloj dice "Day 4" en la hora 72 y la marca del eje dice "Day 3" | `timeline/TimelineDock.tsx:61`, `:127` |
| T-04 | P2 | COM | **La pista "Both" no explica de qué es** (Sol y Tierra a la vez). En Detailed, las banderas "Sunset" y "Earthset" se enciman cuando caen en la misma hora | `timeline/TimelineDock.tsx:71`, `:76` (banderas encimadas vistas en la primera pasada) |

### Escena de alunizaje y Terrain detail

| ID | Sev. | Rúbrica | Hallazgo | Evidencia |
| --- | --- | --- | --- | --- |
| S-01 | P2 | COM, ART | **La escena empieza sin explicar qué es ni qué se mira.** La píldora muestra "Illustrative descent · 440 m · 73.4 m/s" sin decir qué número es altura y cuál velocidad. Results sigue mostrando el veredicto, sin relación visible con la escena. Con render por software casi no se ve el módulo (hay que probarlo en GPU real) | e11; `simulate/SceneControls.tsx:10`, `:37-45` |
| S-02 | P2 | UX | **Las píldoras de estado son `<button>` sin acción.** La píldora de fase y telemetría es enfocable y no hace nada | `simulate/SceneControls.tsx:37`, `:57`, `:70`; `ui/index.tsx:171` |
| S-03 | P2 | DATA, COM | **"Terrain detail" no dice de dónde sale el terreno ni su resolución.** Es un parche gris de 12 km sin escala. La franja de créditos dice "Ephemeris: NASA/JPL Horizons", que no es cierto (ya anotado en `docs/06`) | e12; `layout/ConsoleShell.tsx:34` |
| S-05 | P2 | COM | **"Horizon view" funciona y coincide con los datos, pero no se explica.** Probado con el Backend oficial en IM-2 Mons Mouton el 2026-12-17: a las 00:00 el Sol está "behind the terrain" con 0 % de potencia, y a las 05:00 sale justo sobre la cresta ("+0.0° above the terrain", holgura +0.01°), igual que en la tabla de Detailed. Lo que falta: la píldora "Drag to look around · scrub the timeline" es la única guía; la Tierra (azimut 321°) queda fuera de cuadro sin aviso de hacia dónde girar; y el suelo es una banda lisa, sin relieve cercano. Sirve para ver la luz y el horizonte, **no las pendientes del lugar** | h03, h05, h06 |
| S-04 | P3 | — | **El abanico de imagen alrededor del polo** se ve al volar a un sitio polar en pantalla completa. Es un pendiente del globo (`docs/06`, `P-008`); solo se menciona porque confunde en la demo | e13 |

### Pantalla completa

| ID | Sev. | Rúbrica | Hallazgo | Evidencia |
| --- | --- | --- | --- | --- |
| F-01 | P2 | UX, COM | **La barra de pantalla completa pierde Simple/Detailed y el origen de datos.** El origen de datos desaparece justo en el modo que se usa para la demo y el video | e13; `layout/TopBar.tsx:73-102` |
| F-02 | P2 | UX | **Las tiras plegadas solo se despliegan con hover o foco.** El recorrido con Tab entra a los paneles plegados sin aviso. La tira de Results solo dice "Results" y el chip: no hay titular | e13; `index.css:247` |
| F-03 | P3 | ART | **La barra está al 55 % de opacidad** y hay textos `ink-3` de 10–11 px sobre vidrio. El contraste podría quedar por debajo de 4.5:1 **[código]** | `index.css:286` |

### Compare

| ID | Sev. | Rúbrica | Hallazgo | Evidencia |
| --- | --- | --- | --- | --- |
| C-01 | P1 | UX | **Compare no explica qué es un escenario** ni que usa la duración y los paneles de Simulate, que en Compare no se ven. El paso de evaluación se fija en 120 min sin decirlo | e08; `core/store/useMissionStore.ts:145-152` |
| C-02 | P1 | UX, SCI | **"Recommended" puede recaer en un NO-GO.** `rank()` devuelve el primero sin filtrar. "Power" ordena por `sun_visible_pct`, no por potencia | `comparator/ComparePanels.tsx:75`, `:92-94`; `core/utils/compare.ts:13` |
| C-03 | P1 | UX | **El ojo de un escenario evalúa sin indicador de carga ni de error.** Un fallo de `/evaluate` desde Compare no se ve | `comparator/ComparePanels.tsx:73`, `:87` |
| C-04 | P2 | COM | **La matriz no explica por qué gana "Recommended".** En e08 gana B (CAUTION, 100 % de Sol y 5 % de Tierra), pero nada explica que el orden pone primero el veredicto y después suma porcentajes. "Best" no se calcula en First sunset, First Earthset, Peak power ni Ground slope. Cuando no hay ocaso, la celda dice **"None"** (texto fijo de `ComparePanels.tsx:112-113`), que se lee como un dato faltante y no como "el Sol no se pone" | e08; `comparator/ComparePanels.tsx:110-136` |
| C-05 | P2 | UX | **Los nombres se truncan ("Shackle…") y la fecha parte "00:00 / UTC" en dos líneas.** Dos escenarios del mismo sitio solo se distinguen por la fecha | e08 |
| C-06 | P2 | UX | **Simple/Detailed se muestra en Compare y no cambia nada** | `layout/TopBar.tsx:66` |
| C-07 | P3 | COM | **"Click the eye… on the terrain"**, pero lo muestra en el globo | e08; `comparator/ComparePanels.tsx:159` |

### History

| ID | Sev. | Rúbrica | Hallazgo | Evidencia |
| --- | --- | --- | --- | --- |
| H-01 | P2 | UX | **Las corridas duplicadas no se distinguen** (mismo sitio, fecha, duración y hora de guardado). La hora de guardado no dice UTC | e09; `history/HistoryPanels.tsx:28` |
| H-02 | P2 | UX | **"Delete run" no pide confirmación ni deja deshacer.** Los filtros no incluyen CAUTION | `history/HistoryPanels.tsx:60`, `:113` |
| H-03 | P2 | UX | **"Open in Simulate" y "Duplicate and edit" casi no se distinguen.** History no guarda los paneles solares, así que reabrir una corrida puede dar otra potencia | `history/HistoryPanels.tsx:109-110` |
| H-04 | P3 | UX | **La estrella mide unos 13 px** y la de detalles no tiene `aria-pressed` | `history/HistoryPanels.tsx:29-30`, `:88` |

### Missions

| ID | Sev. | Rúbrica | Hallazgo | Evidencia |
| --- | --- | --- | --- | --- |
| M-01 | P1 | UX, DATA | **Tras "Replay landing window" no hay veredicto.** El brief no usa `StatusChip` y solo muestra Sol, Tierra y pendiente en el instante del alunizaje | e10; `missions/MissionsPanels.tsx:90-97` |
| M-02 | P3 | SCI, COM | **La consola no avisa si el texto fijo de la misión contradice los datos.** Con el Backend oficial, Chang'e 4 coincide: "Earth is never in view" en la tarjeta y "Earth: Hidden" debajo. Con el mock viejo se contradecían. Hoy no hay ningún caso real, pero un cambio del catálogo o del backend pasaría sin aviso | e10; `missions/missions.ts:52-57`; `missions/MissionsPanels.tsx:95-96` |
| M-03 | P2 | UX | **"Replay landing window" sobrescribe sin aviso** el sitio, la fecha y la duración de Simulate | `missions/MissionsPanels.tsx:74-75` |
| M-04 | P2 | COM | **"CLPS", "LROC" y "Outside -80° … global map at lower resolution" no se explican** | e10; `missions/missions.ts:25`, `:29`; `missions/MissionsPanels.tsx:52` |
| M-05 | P3 | ART | **Los enlaces de fuentes se salen de la tarjeta** cuando "Sources" está abierto (lo reporta el detector de desbordes) | `missions/MissionsPanels.tsx:105` |

### Transversales

| ID | Sev. | Rúbrica | Hallazgo | Evidencia |
| --- | --- | --- | --- | --- |
| X-01 | P1 | UX | **No hay tour, ni "?", ni glosario.** Solo hay hints sueltos (ver "Ayudas que ya existen") | — |
| X-02 | P1 | UX | **El veredicto, el guardado y la comparación llegan sin `aria-live`.** Un lector de pantalla no se entera del resultado | `simulate/ResultsPanel.tsx`; `comparator/ComparePanels.tsx` |
| X-03 | P1 | COM | **Un mismo concepto tiene varios nombres.** El enlace con la Tierra tiene cinco: "Talk to Earth", "Earth in view", "Earth link", "Direct-to-Earth" y "Longest link". La pendiente tiene cuatro: "tilt", "Local slope", "Ground slope" y "slope". La sombra permanente tiene tres: "Permanent shadow", "Nearest shadow zone" y "Terrain & ice" | Ver la tabla de términos |
| X-04 | P2 | UX | **`Segmented` usa `role="radio"` sin flechas ni tabindex itinerante** **[código]** | `ui/index.tsx:60-65` |
| X-05 | P2 | COM | **El crédito del globo está en español** ("Textura de regolito procedural (ilustrativa)"). Es del repo del globo, que no se toca aquí: hay que reportarlo a su equipo | e01; `luna-render-nasa-space-challenge/src/regolith.ts:42` |
| X-06 | P3 | ART | **El detector de impeccable da 2 avisos `layout-transition`** (animan `width` y `height`): la tira plegada (`index.css:243`) y el indicador deslizante (`ui/motion.ts:58`). Las dos son deliberadas y animan elementos pequeños. Se aceptan | `impeccable detect` (salida 2) |
| X-07 | P2 | UX, ART | **Las etiquetas de los sitios del globo se leen a través de los paneles de vidrio.** Con el Backend oficial, "De Gerlache Rim 1" queda encima del titular de Results y "Peak Near Shackleton" encima de Setup. El texto del panel compite con el del iframe que está detrás. Hace falta más opacidad del vidrio sobre el texto, o que el globo oculte las etiquetas que caen bajo un panel (repo del globo) | e02, e05; `index.css` (`.glass`) |

## Términos sin explicar

| Término en pantalla | Dónde | Propuesta |
| --- | --- | --- |
| Direct-to-Earth, DTE, Earth link, Talk to Earth, Earth in view, Longest link | `comparator/ComparePanels.tsx:109`, `:111`; `timeline/TimelineDock.tsx:70`; `simulate/ResultsPanel.tsx:72` | Un término por nivel: "Talk to Earth" en Simple y "Earth link (DTE)" en Detailed. Ayuda `earth-link` |
| Permanent shadow, Nearest shadow zone, Terrain & ice, PSR | `simulate/ResultsPanel.tsx:77`, `:130-133` | Ayuda `psr` |
| Power factor now, Average factor, of panel output, Peak in this window | `simulate/ResultsPanel.tsx:74-75`, `:124-126` | Ayudas `power` y `peak-power` |
| Azimuth, Elevation, Terrain horizon, Clearance | `simulate/ResultsPanel.tsx:109-112` | Ayudas `azimuth`, `elevation`, `terrain-horizon` y `clearance` |
| tilt, Local slope, Ground slope | `simulate/ResultsPanel.tsx:76`, `:132`; `comparator/ComparePanels.tsx:115` | "Ground slope" en todos lados. Ayuda `slope` |
| Time step, min step, steps, T+N h, T+0 | `simulate/SetupPanel.tsx:104`, `:153`; `timeline/TimelineDock.tsx:92`, `:127` | Ayuda `step` |
| Both | `timeline/TimelineDock.tsx:71` | Renombrar a "Sun + Earth". Ayuda `both` |
| Earthset, Next set | `timeline/TimelineDock.tsx:76`; `simulate/ResultsPanel.tsx:115-117` | Ayuda `longest` y textos de la sección 3.4 de `design.md` |
| Horizon 360° | `timeline/TimelineDock.tsx:97` | Ayuda `horizon-360` |
| Full cycle, 29.5 d, one lunar daylight period | `simulate/SetupPanel.tsx:10-11`, `:99` | Ayuda `duration` |
| 40 m/px polar terrain, global map | `simulate/SetupPanel.tsx:84`; `missions/MissionsPanels.tsx:52` | Ayudas `latitude` y `terrain-detail` |
| Balanced, Power (Rank by) | `comparator/ComparePanels.tsx:98` | Renombrar "Power" a "Sunlight". Ayuda `rank-by` |
| Degraded | `layout/TopBar.tsx:19` | Ayuda `data-source` ("Sample data" desaparece con el mock, D13) |
| CLPS, LROC | `missions/missions.ts:25`, `:29` | Escribir el nombre completo en la tarjeta |
| Códigos `ERR_*` | `simulate/ResultsPanel.tsx:183`; `comparator/ComparePanels.tsx:87` | Mantenerlos como dato de soporte, debajo del mensaje |

## Ayudas que ya existen

| Ayuda | Dónde | Veredicto |
| --- | --- | --- |
| Instrucción de Results vacío | `simulate/ResultsPanel.tsx:161` | Sirve |
| Estado vacío de History con acción | `history/HistoryPanels.tsx:48-53` | Sirve |
| Mensajes de error por código | `simulate/ResultsPanel.tsx:170-178` | Sirve, salvo el error de arranque (A-08) |
| Popover offline con reintento | `layout/ConnectionStatus.tsx` | Sirve, pero el ícono no tiene texto visible (e07) |
| Intro de Missions | `missions/MissionsPanels.tsx:28-29` | Sirve |
| Tip de Compare ("add the same site twice…") | `comparator/ComparePanels.tsx:83` | Sirve. Se oculta con dos escenarios o más, que es cuando ya no hace falta |
| Titular por estado (`HEADLINE`) | `simulate/ResultsPanel.tsx:9-13` | A medias: no dice la causa (A-03) |
| "14 days is one lunar daylight period." | `simulate/SetupPanel.tsx:99` | A medias: solo en Simple |
| "South of -80° uses the 40 m/px polar terrain…" | `simulate/SetupPanel.tsx:84` | A medias: demasiado técnico para Simple |
| "Pick a run to see its summary." | `history/HistoryPanels.tsx:80` | Sirve |

## Cobertura

| Pide el handoff | Cubierto con |
| --- | --- |
| Simulate (Simple y Detailed) | e01, e02, e04, e05, e14; revisión de código |
| Compare | e08 |
| History | e09, e14 |
| Missions | e10 |
| Pantalla completa | e13 |
| Estados vacíos, de carga y de error | e01, e07, e08; capturas de carga en el scratchpad de la sesión (no se copiaron) |
| Offline | e07 |
| Escena de alunizaje y Terrain detail | e11, e12 |
| Teclado | e06 |
| Lector de pantalla | Solo revisión de código: no se probó con VoiceOver |
