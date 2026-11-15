# Diseño: tour, ayudas "?" y sugerencias

Qué se construye para resolver los hallazgos de [`audit.md`](audit.md). Los textos de interfaz van en inglés y son los definitivos salvo que se indique "pendiente". El plan de tareas está en [`tasks.md`](tasks.md).

## 0. Reglas que gobiernan las tres piezas

1. **El cliente no decide física.** Ninguna ayuda ni sugerencia compara un valor contra un umbral escrito en el cliente. Lo que es bueno o malo lo dice `site.checks[].level`; el número del umbral, cuando se muestra, sale de `checks[].threshold` o va dentro de `checks[].message`.
2. **Una sola fuente de textos de ayuda.** Las ayudas "?", el glosario y el tour leen el mismo catálogo (`src/features/help/glossary.ts`). Un término se explica en un solo lugar.
3. **Sin librerías nuevas.** Todo se hace con React, CSS y APIs del navegador (`<dialog>`, atributo `popover`). La justificación está en la sección 1.8.
4. **Lógica pura aparte y con pruebas.** Qué paso del tour toca, qué sugerencia toca y qué texto lleva un check son funciones puras con `vitest` (el proyecto prueba en entorno `node`, sin DOM: `vite.config.ts:11`).
5. **Se respeta el vidrio.** No hay colores, sombras ni curvas nuevas: se usan `glass`, `glass-strong`, `raised`, `inset-well`, `btn-primary`, las señales de `src/ui/signal.ts` y las animaciones `condense`, `drip` e `ignite` de `src/index.css`.

## 1. Tour

### 1.1 Objetivo

Que una persona que abre la consola por primera vez llegue en menos de un minuto a su primer veredicto y sepa mover el tiempo. El tour no describe paneles vacíos: **corre una simulación real** con los botones de sus propios pasos.

### 1.2 Cuándo aparece, cómo se salta, cómo se relanza

| Situación | Comportamiento |
| --- | --- |
| Primera visita (`tour.status = 'unseen'`) | Se abre solo en el paso 1 cuando `init()` terminó (bien o mal) y los paneles ya entraron (unos 700 ms tras el primer render). El paso 1 es la invitación: "Take the tour" o "Skip". |
| Saltarlo | Botón "Skip tour" visible en todos los pasos, tecla `Esc` y el botón de cierre. Los tres marcan `status = 'dismissed'`. |
| Terminarlo | "Done" en el último paso marca `status = 'completed'`. |
| Relanzarlo | Botón **Help** de la barra superior (sección 2.6) › "Take the tour". Empieza en el paso 2 (la invitación sobra). También `?tour=1` en la URL. |
| No mostrarlo | `?tour=0` en la URL lo suprime sin tocar `localStorage`. Es para la demo en vivo, el video y la herramienta de capturas. |
| Visitas siguientes | No vuelve a abrirse solo, sea cual sea el estado guardado distinto de `unseen`. |

### 1.3 Pasos

Siete pasos como máximo (seis sin globo). Cada uno apunta a un elemento real marcado con `data-tour="<ancla>"`. El handoff pide cubrir doce elementos; se agrupan en siete pasos porque un tour de doce paradas se abandona a la mitad. Decidido con el usuario el 2026-11-14 (D1 en [`README.md`](README.md)): siete pasos, ajustables después de probarlo. El paso 2 corre una simulación real con el escenario del tour (D2, D3).

| # | Ancla (`data-tour`) | Elemento real | Título | Texto | Botón de acción |
| --- | --- | --- | --- | --- | --- |
| 1 | — (tarjeta centrada, con el logo) | `Logo` de `layout/Rail.tsx:5` | Find a safe place to land on the Moon | Pick a site and a date. The console tells you if it is GO, CAUTION or NO-GO, and why: sunlight for power, Earth in view for radio, and ground you can land on. | "Take the tour" · "Skip" |
| 2 | `setup` | `SetupPanel` completo (`simulate/SetupPanel.tsx:168`) | Where, when, run | Search a landing site or click the globe. Set the landing date and how long the mission lasts. Then run the simulation: the server traces the horizon and follows the Sun and Earth for the whole stay. | "Try Apollo 11" si no hay sitio; después "Run simulation" |
| 3 | `results` | `ResultsPanel` (`simulate/ResultsPanel.tsx:157`) | The verdict, and why | GO, CAUTION or NO-GO comes from the server, with the checks behind it. Below: how long the Sun stays up, how long you can talk to Earth and how steep the ground is. Every "?" explains a number. | — |
| 4 | `timeline` | `TimelineDock` (`timeline/TimelineDock.tsx:81`) | Time is the main control | Drag the timeline or press play. The Sun and Earth move in the 3D view and the numbers follow. Bright bars are the hours with sunlight or with Earth in view. | "Play" (alterna `setPlaying`) |
| 5 | `scene` | Fila de píldoras (`layout/ConsoleShell.tsx:60`) | See it on the ground | Horizon view puts you on the ground: watch the Sun and Earth rise and set behind the real skyline as you move the timeline. Landing scene plays an illustrative descent. Terrain detail opens the local terrain from the server. | "Horizon view" (pide `requestHorizon()`) |
| 6 | `detail` | `DetailToggle` (`layout/TopBar.tsx:27`) | Two levels of detail | Simple speaks plain language. Detailed shows the full telemetry: angles, horizon and power. Same simulation, same verdict. | "Show Detailed" / "Show Simple" (alterna `setDetail`) |
| 7 | `rail` | `Rail` (`layout/Rail.tsx:20`) | Where to go next | Compare ranks two to five site and date options. Missions replays real landings. History keeps the runs you save. Press F for full screen and ? for help at any time. | "Done" |

Variantes, decididas por una función pura `resolveSteps(state)`:

**Escenario del tour.** Una constante `TOUR_SCENARIO = { siteId: 'apollo-11', startUtc: '2026-12-13T00:00:00Z', durationDays: 14 }` en `src/features/onboarding/`. "Try Apollo 11" hace `select()` de ese sitio y `setConfig()` con esa fecha y duración. El paso, los paneles y el resto de la configuración no se tocan. El texto del paso 2 dice entonces "Apollo 11 on Dec 13, 2026: a good window. Run the simulation to see why." Si `apollo-11` no existe en `/sites`, se usa el primer sitio de la lista y la fecha que tenga Setup. La fecha es la del alunizaje: el inicio de la estancia en la superficie (ayuda `date`, §2.3). Con el Backend oficial da GO del 9 al 21 de diciembre (verificado el 2026-11-14).

| Condición | Efecto |
| --- | --- |
| Ya hay sitio elegido | Paso 2: desaparece "Try Apollo 11" y el texto empieza con "You picked {label}." |
| Hay evaluación | Paso 2: el botón dice "Run again". |
| No hay evaluación al llegar al paso 3 o al 4 | Paso 3: "Your verdict will appear here after you run a simulation." Paso 4: tarjeta centrada sin foco de luz (el dock no existe sin evaluación, `TimelineDock.tsx:55`) y texto "The timeline appears below once a simulation has run." Sin botón "Play". |
| Sin píldoras en el DOM (sin evaluación, o sin globo y sin `terrain`) | El paso 5 se omite y el contador dice "of 6". |
| Sin globo (`VITE_GLOBE_URL` vacío o `link = 'unavailable'`) | Paso 5: solo la frase de "Terrain detail" (o "Global view" si la escena local ya es el fondo), sin "Horizon view" ni "Landing scene", que corren en el globo. Paso 4: "in the 3D view" se mantiene, vale para ambos renders. |
| Sin backend (`health = null` y `ERR_NETWORK`) | Paso 2: sin botones de acción y con la nota "The simulation server is unreachable, so this tour only describes the screen. It retries on its own." Los pasos 3 y 4 usan la variante sin evaluación. |
| Ancla ausente por cualquier otra causa | Tarjeta centrada sin foco de luz. El tour nunca se rompe por un elemento que falta. |

Los botones de acción llaman a las mismas acciones del store que los controles reales (`select`, `evaluate`, `setPlaying`, `setDetail`). "Next" nunca depende de haber pulsado la acción: el tour se puede recorrer leyendo.

### 1.4 Presentación

- **Contenedor:** un `<dialog>` abierto con `showModal()`, transparente y del tamaño de la ventana. Da gratis la trampa de foco, `Esc`, el resto de la página inerte y la capa superior (queda sobre el iframe del globo y sobre los paneles con `overflow`).
- **Foco de luz:** un elemento dentro del diálogo, colocado sobre el rectángulo del ancla, con `border-radius` igual al del panel y `box-shadow: 0 0 0 100vmax rgb(4 6 10 / 0.6)`. El ancla queda nítida y lo demás se atenúa. Un anillo de 1 px `ring-white/40` marca el borde.
- **Tarjeta:** `glass glass-strong`, 340 px de ancho, radio 20 px. Lleva "Step 2 of 7", el título (`h2`), el texto, el botón de acción (`raised`) y la fila "Back" · "Next" (`btn-primary`) · "Skip tour" (texto). Se coloca al lado del ancla con más espacio; lo calcula una función pura `place(target, card, viewport)`.
- **Movimiento:** la tarjeta entra con `condense`; al cambiar de paso el foco de luz se desplaza en 480 ms con `--ease-out`. El rectángulo se vuelve a medir con `ResizeObserver` y al terminar la animación de entrada de los paneles.
- **Reduced motion:** sin desplazamiento ni desenfoque; el foco y la tarjeta cambian de lugar con un fundido de 150 ms. Se usa `prefersReducedMotion()` de `src/ui/motion.ts:6`.

### 1.5 Accesibilidad

- `role="dialog"` nativo, `aria-labelledby` al título y `aria-describedby` al texto del paso.
- Al abrir y en cada cambio de paso el foco va al título (`tabindex="-1"`), para que el lector de pantalla lea título y texto. El orden de tabulación es: acción, Back, Next, Skip tour.
- `Esc` cierra y marca `dismissed`. Al cerrar, el foco vuelve al elemento que lo tenía (o al botón Help si se lanzó desde ahí).
- El contador "Step 2 of 7" es texto, no solo puntos.
- El atajo `F` no actúa mientras el tour está abierto (`ConsoleShell.tsx:16` debe ignorar la tecla si hay un `dialog[open]`).
- Contraste: la tarjeta usa `glass-strong` (casi opaca), así que el texto no depende del render de fondo.

### 1.6 Convivencia con pantalla completa, workspaces y modos

- Al iniciar, el tour pone `workspace = 'simulate'` y `fullscreen = false`. En pantalla completa los paneles están plegados en tiras y sus anclas medirían 52 px. No se restaura la pantalla completa al terminar: el último paso enseña la tecla `F`.
- El tour no cambia Simple/Detailed salvo con el botón del paso 6. Las anclas existen en ambos modos.
- El autoarranque nunca ocurre en pantalla completa (`fullscreen` empieza en `false` y no se guarda).

### 1.7 Persistencia

Clave `lunar-navigator.onboarding` en `localStorage`, con `zustand/persist` igual que `lunar-navigator.history` (`core/store/useHistoryStore.ts:50`):

```ts
{ version: 1, tour: { status: 'unseen' | 'dismissed' | 'completed', at: string | null } }
```

Si `localStorage` no está disponible, el tour se ofrecerá en cada visita. Se acepta: saltarlo cuesta una tecla.

### 1.8 Librería o hecho en casa: hecho en casa

| Opción | A favor | En contra |
| --- | --- | --- |
| `react-joyride` | Completa y conocida | Arrastra su propio motor de posicionamiento y estilos; hay que sobrescribir todo su aspecto para que parezca vidrio |
| `driver.js` | Pequeña y sin dependencias | Dibuja su propia tarjeta fuera de React; los botones de acción que llaman al store habría que montarlos a mano en su DOM |
| `shepherd.js` | Flexible | Depende de `@floating-ui`; el mismo problema de estilos |
| **Propio** | Unas 250 líneas; mismo vidrio y mismo movimiento; botones que llaman al store; `<dialog>` resuelve foco, `Esc` e inercia | Hay que escribir y probar el posicionamiento |

Lo que justifica una librería de tours es el posicionamiento contra cualquier elemento, el scroll hasta el objetivo y las colisiones. Aquí no hace falta nada de eso: la consola es de escritorio, sin scroll, con siete anclas grandes y fijas. El proyecto no tiene hoy ninguna librería de interfaz ni de animación y lo prefiere así. La recomendación es hacerlo propio.

## 2. Ayudas "?"

### 2.1 Patrón de interacción

Componente `HelpTip` en `src/ui/`:

- **Disparador:** un `<button>` con el ícono `CircleHelp` de 13 px, área de 24 × 24 px, `aria-label="About {término}"`, `aria-expanded` y `aria-controls`.
- **Abrir:** clic, toque, `Enter` o `Espacio`. Con puntero fino también al pasar el puntero durante 150 ms.
- **Cerrar:** `Esc`, clic fuera, perder el foco o retirar el puntero (del botón y de la burbuja; se puede pasar de uno a otra sin que se cierre).
- **Burbuja:** elemento con el atributo `popover`, estilo `glass glass-strong drip`, 260 px de ancho. Al estar en la capa superior no la recortan los paneles con `overflow` ni las tiras de pantalla completa. Se coloca con la misma función `place()` del tour.
- **Contenido:** el término en negrita, una o dos frases y, si aplica, una línea "Try: …" con la sugerencia de valor.
- **Lector de pantalla:** el texto de la ayuda vive además en un `<span>` oculto visualmente (`sr-only`) con `id` propio. El control asociado lo referencia con `aria-describedby`, así la explicación se oye al enfocar el campo sin tener que abrir nada. En las métricas, que no son controles, la burbuja es una región `role="status"` y se anuncia al abrirse.

### 2.2 Cambio previo en `Field`

`Field` es hoy un `<label>` que envuelve a sus hijos (`src/ui/index.tsx:79`). Un botón "?" dentro de ese `<label>` se activaría al hacer clic en el texto de la etiqueta, y lo mismo pasa ya con el primer botón de un `Segmented`. `Field` pasa a ser un `<div>`: la etiqueta es un `<label htmlFor>` cuando envuelve un campo y un `<span id>` con `aria-labelledby` en el grupo cuando envuelve un `Segmented`. El "?" va junto a la etiqueta, fuera de ella. `Field` gana la propiedad `help?: HelpId`.

### 2.3 Catálogo: campos de Setup

Los rangos y valores por defecto salen de `contracts/openapi.json` y de `.handoff/docs/12-contrato-api-v1.2.md` §4.4 y §6.

| `HelpId` | Dónde | Texto | Try | Fuente |
| --- | --- | --- | --- | --- |
| `site` | "Landing site" (`SetupPanel.tsx:172`) | Where the lander touches down. Catalog sites are candidate and historic landing spots. You can also click the globe. | Start with a south pole site: there the Sun stays within about 2° of the horizon, so the terrain decides everything. | `GET /sites`; `PRODUCT.md` "Capabilities and Constraints" |
| `latitude` | "Latitude" (`:78`) | Degrees north (+) or south (−) of the lunar equator, from −90 to 90. | −89.45 | Rango y ejemplo del contrato §4.4 |
| `longitude` | "Longitude" (`:80`) | Degrees east, from −180 to 360. Results always show it as 0 to 360° E. | 222.7 | Contrato §4.4; `fmtCoord` |
| `date` | "Landing date" y "Landing time (UTC)" (`:96-97`; hoy dicen "Date" y "Time (UTC)") | The moment the lander touches down on the Moon, in UTC, not the launch from Earth. The simulation starts here. Dates from 1900 to 2050 are supported. | Dec 13, 2026: daytime at most catalog sites. | Contrato §6; D12 en `README.md` |
| `duration` | "Mission length" (`:99`) | How long the mission stays on the surface. The verdict covers this whole window. 14 days is about one lunar daytime; 29.5 days is a full day and night. | 14 days | Opciones de la interfaz; hint actual |
| `step` | "Time step" (`:104`) | Time between samples. A shorter step catches brief sunsets and Earth dropouts, and takes longer to compute. | 60 min. With 29.5 days, avoid 15 min: it asks for 2,832 samples. | Contrato §6 (unos 2 000 puntos como máximo) |
| `panel-area` | "Panel area" (`:128`) | Total area of the solar panels. It scales the power estimate. It does not change the verdict. | 4 m² | Valor por defecto del contrato; la tabla de checks no usa los paneles |
| `panel-efficiency` | "Efficiency" (`:130`) | Share of sunlight the panels turn into electricity, from 1 to 100%. It scales the power estimate. | 28% | Valor por defecto del contrato |

### 2.4 Catálogo: resultados y timeline

| `HelpId` | Dónde | Texto | Fuente |
| --- | --- | --- | --- |
| `verdict` | Chip de estado en Results (`ResultsPanel.tsx:65`, `:93`), Compare, History y Missions | GO: every check passes. CAUTION: at least one check is marginal. NO-GO: at least one check fails. The server decides; the console only shows it. | Contrato §4.4 "Veredicto" |
| `daylight` | "Daylight" (`:70`) y pista "Sunlight" | Time until the Sun first drops behind the local terrain, and the share of the mission with direct sunlight. | `hours_to_next_sunset`, `sun_visible_pct` |
| `earth-link` | "Talk to Earth" (`:72`), "Earth link", "Earth in view" | A direct radio link (Direct-to-Earth, DTE) needs Earth above the local horizon. With Earth never in view, the mission needs a relay satellite. | `earth_visible_pct`; mensaje de `DTE_NONE` |
| `power` | "Solar power now" (`:74`), "Power factor now", "Average factor" | Relative solar power at the time selected on the timeline, as reported by the server. Move the timeline to watch it change. | `power_factor`. **Pendiente:** la definición exacta no está en el contrato (pregunta al backend en [`README.md`](README.md)) |
| `peak-power` | "Peak in this window" (`:75`, `:126`) | Highest estimated electrical power in the window, for the panel area and efficiency set in Setup. | `estimated_peak_power_w` |
| `slope` | "Ground" (`:76`), "Local slope", "Ground slope" | How steep the ground is at the landing spot. Steeper ground is harder to land on. | `slope_deg`. El juicio (seguro, moderado, crítico) lo pone el check `SLOPE_*` |
| `psr` | "Permanent shadow" (`:77`), "Nearest shadow zone" | A permanently shadowed region (PSR) never sees the Sun. It is extremely cold and may hold water ice. This is the distance to the nearest one. | `nearest_psr_km`. **Pendiente:** texto científico por revisar (pregunta para el handoff en [`README.md`](README.md)) |
| `azimuth` | "Azimuth" (`:109`) | Compass direction along the horizon: 0° is north, 90° is east. | Contrato §7.1 |
| `elevation` | "Elevation" (`:110`) | Angle above (+) or below (−) a flat horizon. | `sun_el_deg`, `earth_el_deg` |
| `terrain-horizon` | "Terrain horizon" (`:111`) | How high the terrain rises in that direction. The Sun or Earth is visible only above it. | `sun_horizon_el_deg`; contrato §4.4 |
| `clearance` | "Clearance" (`:112`) | Elevation minus terrain horizon. Positive means visible; negative means hidden behind terrain. | Contrato §4.4: visible si `el > horizon_el` |
| `longest` | "Longest stretch" (`:114`), "Longest daylight", "Longest link" | The longest uninterrupted period in view during the window. | `max_continuous_*_hours` |
| `both` | Pista "Both" (`TimelineDock.tsx:71`), que pasa a llamarse **"Sun + Earth"** | Hours with sunlight and Earth in view at the same time: power and a direct radio link together. | `sun_visible && earth_visible` |
| `horizon-360` | Pestaña "Horizon 360°" (`TimelineDock.tsx:97`) | The skyline seen from the site, unrolled from north through east, south and west. The dots are the Sun and Earth right now; a dot under the line is hidden. | `horizon_profile` |
| `horizon-view` | Píldora "Horizon view" (`SceneControls.tsx:71`) | Stand at the landing spot and look around. The skyline is the real terrain horizon from the server; the Sun and Earth follow the timeline and hide behind it. | `horizon_profile`, `SET_SKY_STATE` (`docs/11` §11 del handoff). El brillo del suelo es ilustrativo |
| `landing-scene` | Píldora "Landing scene" (`SceneControls.tsx:82`) | An illustrative descent at this site. The path and the numbers on screen are not a physical simulation. | D-015; rótulo "Illustrative" |
| `terrain-detail` | Píldora "Terrain detail" (`:87`) | The local terrain patch served by the server, lit by the Sun at the selected time. | `GET /terrain/patch`. Con v1.2 o superior añade "Source: {grid.source}, {native_resolution_m} m per pixel." |

### 2.5 Catálogo: barra superior y Compare

| `HelpId` | Dónde | Texto | Fuente |
| --- | --- | --- | --- |
| `detail-level` | `DetailToggle` (`TopBar.tsx:30`) | Simple speaks plain language. Detailed shows the full telemetry. Same simulation, same verdict. | `PRODUCT.md`, principio 2 |
| `data-source` | Chip de origen de datos (`TopBar.tsx:21`). Sustituye al `title` actual | Live data: computed by the simulation server from NASA terrain and ephemerides. Degraded: the server answers, but one of its parts is not healthy. Offline: the server cannot be reached. | `GET /health`. "Sample data" desaparece con el mock (D13) |
| `scenario` | Título "Scenarios" (`ComparePanels.tsx:78`) | A scenario is one site on one landing date, starting at 00:00 UTC. Compare two to five. They all use the mission length and solar panels set in Simulate. | Contrato §4.5; `useMissionStore.ts:145-152` |
| `rank-by` | "Rank by" (`:96`) | GO always ranks above CAUTION, and CAUTION above NO-GO. Within the same verdict: Balanced adds sunlight and Earth shares, Sunlight uses the sunlit share, Earth link uses the Earth-in-view share. | `core/utils/compare.ts`. La opción "Power" pasa a llamarse **"Sunlight"**: ordena por `sun_visible_pct`, no por potencia |

### 2.6 Botón Help y glosario

En la barra superior, a la izquierda de "Full screen", y también en la barra de pantalla completa: un botón `raised` con el ícono `CircleHelp`, el texto "Help" y `<Kbd>?</Kbd>`. La tecla `?` lo abre, con la misma protección que `F` (no actúa dentro de un campo). Abre un `popover` de 360 px con tres secciones:

1. **"Take the tour"**: relanza el tour.
2. **"Glossary"**: todas las entradas del catálogo agrupadas en Verdict, Sun and power, Earth link, Terrain y Time. Es el mismo texto de los "?".
3. **"Shortcuts"**: solo los que existen: `F` full screen, `?` help, `←` `→` move the timeline, `Esc` close.

### 2.7 El porqué del veredicto: `site.checks`

Results muestra los checks del servidor en Simple y en Detailed. Es lo que hoy falta para cumplir el principio 4 de `PRODUCT.md`.

- **Con `checks` (v1.2 o superior):** una lista justo debajo del titular. Cada fila lleva el ícono del nivel (`Check`, `AlertTriangle`, `X`, con su color de señal y nunca solo el color) y `message` tal cual llega, en inglés. En Simple sustituye al párrafo genérico de `HEADLINE`. En Detailed sustituye a `site.reasons` y el rótulo dice "{n} checks from the server".
- **Sin `checks` (v1.1, que es lo que hoy sirve la URL de `.env.local`):** Simple conserva el párrafo genérico de `HEADLINE`. Detailed muestra `site.reasons` con el rótulo "Server notes (in Spanish)" y `lang="es"`. No se traduce ni se reinterpreta en el cliente.
- **Detección:** `Array.isArray(site.checks) && site.checks.length > 0`. No se detecta por URL ni por versión.

## 3. Sugerencias: la próxima acción

### 3.1 Patrón

Un bloque **"Next step"**, uno solo por pantalla, siempre en el mismo lugar de cada panel: al final de Results en Simulate, sobre "Compare scenarios" en Compare y al final de "Mission brief" en Missions.

- **Forma:** superficie `raised` de radio 14 px, con `IconWell` del color de señal del estado, el rótulo "Next step" (`text-xs text-ink-3`), una frase (`text-[13px] text-ink`) y un botón de acción como máximo, más un enlace secundario opcional.
- **Énfasis sin romper el vidrio:** al aparecer tras un cálculo hace `ignite` una vez (dos pulsos de retroiluminación, ya existe). No hay franja lateral de color ni fondo saturado ni color nuevo.
- **Una sola tecla luminosa:** el único `btn-primary` de la pantalla es siempre la acción que toca. Antes de simular es "Run simulation". Con resultados vigentes, "Run simulation" baja a `raised` y la acción de la sugerencia toma el `btn-primary`.
- **Lector de pantalla:** una región `aria-live="polite"` anuncia veredicto y sugerencia al terminar el cálculo, por ejemplo: "NO-GO. Critical slope. Next step: try a nearby site."

Qué sugerencia toca lo decide una función pura `nextStep(state)` en `src/features/suggest/nextStep.ts`.

### 3.2 Simulate

| Estado | Condición | Frase | Acción |
| --- | --- | --- | --- |
| Sin conexión | `health = null` y `ERR_NETWORK` | The simulation server is unreachable. Sites and simulations are paused; it retries every 20 seconds. | "Retry now" → `init()` |
| Sin sitio | `selected = null` | Pick a landing site to begin: search the catalog or click the globe. | "Browse sites" → enfoca el buscador. Secundaria: "Replay a real mission" → Missions |
| Listo para simular | Sitio elegido, sin evaluación | Ready: {site}, {date}, {n} days. | Ninguna propia: señala "Run simulation", que es el `btn-primary` |
| Calculando | `loading` | — (el esqueleto ya lo dice) | — |
| Resultados desactualizados | El sitio, la fecha, la duración, el paso o los paneles ya no son los de la última evaluación | These results are for {site}, {date}. Run again to update them. | "Run again" → `evaluate()`. Results se atenúa al 60% con el rótulo "Out of date" |
| GO | `status = 'GO'` | A good window. Save it, or check whether a launch slip would cost you. | "Compare dates". Secundaria: "Save to history" |
| CAUTION o NO-GO con `checks` | Ver 3.3 | Ver 3.3 | Ver 3.3 |
| CAUTION o NO-GO sin `checks` | v1.1 | CAUTION: One condition is marginal. See how other dates compare. · NO-GO: One condition fails. See how other dates compare, or try another site. | "Compare dates". Secundaria: "Change site" |
| Error | `error` tras `evaluate()` | Ver 3.5 | Ver 3.5 |

"Resultados desactualizados" exige guardar en el store con qué parámetros se hizo la última evaluación (`evaluatedFor`). Hoy `select()` no limpia `evaluation` (`useMissionStore.ts:106`), así que Results enseña el veredicto de un sitio mientras la barra superior nombra otro.

### 3.3 Del check a la recomendación

Se decide por `checks[].code` y `checks[].level`, nunca por números. Se toma el check más grave (`nogo` antes que `caution`) y, a igual gravedad, en este orden: pendiente, Sol, Tierra. El razonamiento del orden: la pendiente no cambia con la fecha y es lo primero que descarta un sitio.

| Familia de `code` | Frase | Acción | Secundaria |
| --- | --- | --- | --- |
| `SLOPE_MODERATE`, `SLOPE_CRITICAL` | The slope belongs to the place, not the date. Try a nearby site. | "Change site" → enfoca el buscador (en Detailed, el selector) | "Compare sites" → Compare con este escenario ya agregado |
| `SUN_LIMITED`, `SUN_CRITICAL` | Sunlight here depends on the date. See how other landing dates compare. | "Compare dates" | "Shorten the mission" → enfoca "Mission length" |
| `DTE_REDUCED` | Earth is in view only part of the time. See how other dates compare, or plan around the gaps on the timeline. | "Compare dates" | — |
| `DTE_NONE` | Earth is never in view from here. A mission at this site needs a relay satellite, or a different site. | "Compare sites" | — |

**"Compare dates"** agrega a Compare el escenario actual y el mismo sitio 7 y 14 días después, cambia a Compare y lanza `compare()`. Quien dice qué fecha es mejor es el backend. Los desplazamientos de 7 y 14 días son una elección de exploración, no una regla física (decisión D5 en [`README.md`](README.md)).

**"Compare sites"** agrega el escenario actual a Compare y cambia a ese workspace con el selector de sitio enfocado.

### 3.4 Ausencia no es vacío

`Countdown` muestra hoy "Earth stays in view" cuando `hours_to_next_earthset` es `null` (`ResultsPanel.tsx:72`), y "No sunset in this window" cuando lo es `hours_to_next_sunset` (`:70`). Pero el Backend oficial manda ese `null` en **tres** casos distintos (verificado el 2026-11-14, ver `P-012` del handoff): el astro está visible toda la ventana, nunca se ve, o **empieza oculto** y sale más tarde. Hoy la consola dice "Earth stays in view" en Peak Near Shackleton, donde la Tierra empieza oculta y solo se ve el 5 % del tiempo.

El texto se decide en este orden, mirando primero `timeline[0]` y después el resumen. La primera fila que se cumple gana:

| # | Condición | Sol | Tierra |
| --- | --- | --- | --- |
| 1 | `*_visible_pct` es 0 | "No sunlight in this window" | "Earth never in view" |
| 2 | Oculto en `timeline[0]`; el primer punto visible está a `h` horas del inicio | "{h} hours until sunrise" | "{h} hours until Earth rises" |
| 3 | Visible en `timeline[0]` y `hours_to_next_*` es un número | "{n} hours until sunset" | "{n} hours until Earth sets" |
| 4 | Visible en `timeline[0]` y `hours_to_next_*` es `null` | "No sunset in this window" | "Earth stays in view" |

`h` son las horas entre `timeline[0].timestamp_utc` y ese primer punto. Es leer el timeline que manda el backend, no calcular física. La misma regla aplica a la fila "Next set" de Detailed: "{h} h", "rise {h}h" (sin espacio, para caber en la columna de 78 px), "never" o "no set". La implementación es `src/core/utils/countdown.ts`.

**Porcentaje redondeado.** "Sunlit 0% of the mission" con el Sol arriba una hora (Shackleton Rim, 0.3 %) parece una contradicción. Cuando el porcentaje es mayor que 0 y menor que 1, se muestra "<1%".

### 3.5 Errores

Se decide por `error.code` (`core/api/errors.ts`). El error de arranque deja de mostrarse como "Simulation failed": si no hubo `evaluate()`, es el estado "Sin conexión".

| `code` | Frase | Acción |
| --- | --- | --- |
| `ERR_NETWORK` (al evaluar) | The simulation server did not answer. | "Try again" → `evaluate()` |
| `ERR_UPSTREAM_SERVICE` | The ephemeris service did not answer. This usually clears in a moment. | "Try again" |
| `ERR_TERRAIN_UNAVAILABLE` | There is no terrain data for this spot. | "Change site" |
| `ERR_DATE_OUT_OF_RANGE` | That date is outside the supported range, 1900 to 2050. | "Change date" → enfoca "Landing date" |
| `ERR_INVALID_COORDINATES` | Those coordinates are outside the Moon: latitude −90 to 90, longitude −180 to 360. | "Fix coordinates" → Detailed, Custom, enfoca el campo |
| `ERR_INVALID_PAYLOAD` | Some inputs are not valid. Review the setup and run again. | "Review setup" → enfoca Setup |
| `ERR_NOT_FOUND`, `ERR_UNKNOWN` | The console could not reach this feature on the server. | "Try again". El código queda visible debajo, en `font-mono`, para soporte |

### 3.6 Compare, History y Missions

| Workspace | Estado | Frase | Acción |
| --- | --- | --- | --- |
| Compare | 0 escenarios | Compare ranks two to five options. Add a site and a date to start. | "Add the current simulation" si hay sitio elegido |
| Compare | 1 escenario | Add one more. The same site a week later shows the cost of a launch slip. | "Add +7 days" |
| Compare | 2 o más, sin comparar | — | "Compare scenarios" es el `btn-primary` |
| Compare | Comparado, el mejor es GO o CAUTION | {A}: {site}, {date} ranks first. | "Open in Simulate" → `showScenario()` y cambia a Simulate |
| Compare | Comparado, el mejor es NO-GO | None of these options passes. The least bad is {A}. Add other dates or sites. | Enfoca "Site" de "Add scenario". El rótulo "Recommended" pasa a "Least bad" |
| Compare | Error | Comparison failed. | "Try again" |
| History | Vacío | Ya existe (`HistoryPanels.tsx:48-53`) | "Start a simulation" |
| History | Con corridas, ninguna elegida | Pick a run to see its summary. | — |
| Missions | Misión elegida, sin reproducir | — | "Replay landing window" es el `btn-primary` |
| Missions | Reproducida | El brief muestra el chip de veredicto y sus checks. Frase: "Watch it on the timeline, or keep exploring from this landing." | "Open as a new simulation" |

## 4. Correcciones que sostienen las tres piezas

Sin estas correcciones, el tour llevaría a controles que no responden y las ayudas explicarían datos que se leen al revés. Entran en la spec por eso. Cada una cita su hallazgo en [`audit.md`](audit.md).

### 4.1 Buscador de sitios accesible (A-02, P0)

`SiteSearch` (`simulate/SetupPanel.tsx:28-45`) se convierte en un combobox completo según el patrón de ARIA APG "combobox with listbox popup":

- **Flechas ↑ ↓** recorren las opciones con `aria-activedescendant`. El foco se queda en el input.
- **Enter** elige la opción activa. **Esc** cierra la lista y, si ya estaba cerrada, borra el texto.
- **La lista se cierra** cuando el foco sale del contenedor (`focusout` con `relatedTarget` fuera), no a los 120 ms.
- **`aria-selected`** marca la opción activa, no siempre `false`.
- **Al abrir** con el campo vacío muestra los primeros seis sitios. Así se cumple el texto "Pick one from the list".

El paso 2 del tour depende de esto: sin la corrección, quien navega con teclado no puede seguirlo.

### 4.2 Slider del timeline (T-01)

`Home` y `End` llevan al inicio y al final. `PageUp` y `PageDown` saltan 24 horas (el número de pasos sale de la diferencia entre los `timestamp_utc` del timeline). `aria-valuetext` dice "Day 3 of 14, 2026-12-03 12:00 UTC" en Simple y "T+60 h, …" en Detailed. Las etiquetas de día del eje y del reloj usan la misma fórmula (T-03).

### 4.3 Barra de pantalla completa (F-01)

`FullscreenBar` (`layout/TopBar.tsx:73`) suma `DetailToggle`, el chip de origen de datos y el botón Help (sección 2.6). Sin el chip, la demo en pantalla completa no dice si los datos vienen del servidor en vivo ni si se cayó la conexión.

### 4.4 Textos de la interfaz

| Hallazgo | Hoy | Cambio |
| --- | --- | --- |
| A-04 | `index.html:2` con `lang="es"` | `lang="en"`. Las razones en español conservan su `lang="es"` (sección 2.7) |
| A-14 | "POST /evaluate · 2.52 s · 336 steps" (`SetupPanel.tsx:153`) | Simple: "Last run took 2.5 s". Detailed: "Computed in 2.5 s · 336 samples" |
| A-14 | "From POST /compare" (`ComparePanels.tsx:126`) | "Computed by the simulation server" |
| A-14 | `aria-label` "Open the local terrain from the API" (`SceneControls.tsx:87`) | "Open the local terrain around this site" |
| A-04 | "3 checks from the backend" (`ResultsPanel.tsx:94`) | Lo define la sección 2.7 |
| X-03 | "tilt", "Local slope", "Ground slope" | "Ground slope" en todos los workspaces |
| X-03 | "Nearest shadow zone", "Permanent shadow", "Terrain & ice" | "Permanent shadow" como término; el título de la sección de Detailed pasa a "Terrain" |
| C-07 | "Click the eye on a scenario to load its full timeline on the terrain." | "Click the eye on a scenario to see it on the globe with its full timeline." |
| D12 | "Date" y "Time (UTC)" en Setup (`SetupPanel.tsx:96-97`); "Date (UTC)" en Compare (`ComparePanels.tsx:64`) | "Landing date" y "Landing time (UTC)" en Setup; "Landing date (UTC)" en Compare. Es la fecha del alunizaje, no la del despegue |
| C-04 | "None" en "First sunset" y "First Earthset" de Compare (`ComparePanels.tsx:112-113`) | Con `null`, según el porcentaje: 0 % → "Never in view"; 100 % → "Never sets". Cualquier otro porcentaje con `null` solo puede ser un astro que empezó oculto (los otros dos casos de `null` dan 0 % o 100 %), así que la celda dice "Rises later". Las horas exactas no se pueden dar, porque `/compare` no trae timeline (`P-012`) |
| S-01 | "Illustrative descent · 440 m · 73.4 m/s" | "Illustrative descent · altitude 440 m · speed 73 m/s" |

### 4.5 Guardar en History (A-10)

El bookmark sigue siendo un botón de ícono con `aria-label` "Save to history". Al guardar, el ícono pasa a `BookmarkCheck` y una línea `role="status"` dice "Saved to history." durante 2.5 s. Si ya existe una corrida con el mismo sitio, inicio, duración, paso y paneles (`isSameRun` de `useHistoryStore`), no se crea otra y la línea dice "Already in history.". Una corrida vieja sin paneles nunca se toma como igual. Si Results está desactualizado (§3.2), el botón se deshabilita con el nombre "Run the simulation again to save it": solo se guarda la corrida que está en pantalla. History guarda también los paneles, y "Open in Simulate" los restaura cuando la corrida los trae.

### 4.6 Texto fijo de una misión frente a los datos (M-02)

El resumen de cada misión es un registro histórico y no se cambia. Cuando el resumen dice que la Tierra nunca se ve y `t0.earth_visible` llega en `true` (o al revés), la consola no elige quién tiene razón. Muestra el dato del servidor y, debajo del brief, la nota "The mission record and this simulation disagree on Earth visibility. Check the data source." Para que esto funcione, cada misión del catálogo gana un campo opcional `earthNeverInView: boolean` (hoy solo Chang'e 4). No hay heurísticas sobre el texto.

## 5. Fuera de esta spec

- Los pendientes de render de `docs/06-limitaciones-y-pendientes.md` (teselas, abanico polar, créditos del globo).
- Cualquier cambio al globo, al backend o al handoff.
- Traducir `site.reasons` en el cliente.
- Un modo tutorial aparte con datos falsos: el tour usa el backend configurado (D13: ya no se usa el mock).
