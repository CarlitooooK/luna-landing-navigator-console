# 04. Puente con el globo

El globo es una app aparte (CesiumJS) que la consola incrusta en un iframe (D-011). Se comunican por `postMessage`. La **fuente única del protocolo** es el `README.md` del repo del globo; `globeProtocol.ts` declara solo los mensajes que usa la consola. Integración acordada: `.handoff/docs/11-integracion-globo-consola.md`.

## Archivos

| Archivo | Responsabilidad |
| --- | --- |
| `GlobeFrame.tsx` | Monta el iframe con `?allowedOrigins=<origen de la consola>`, `sandbox="allow-scripts allow-same-origin"` y `referrerPolicy="no-referrer"`. Si `link = 'unavailable'` lo oculta y pinta el placeholder |
| `useGlobeBridge.ts` | **Único** que envía y recibe mensajes. Se suscribe a `useMissionStore` y `useGlobeStore` |
| `globeBridge.ts` | Funciones puras con pruebas: `toGlobeSites`, `skyMessages`, `horizonMessage`, `skyStateMessage`, `psrItems`, `landingMessage`, `fromGlobe`, `READY_TIMEOUT_MS` (8 s) |
| `globeProtocol.ts` | Tipos `ToGlobe` / `FromGlobe` |
| `useGlobeStore.ts` | Estado del enlace y de la escena |
| `SceneControls.tsx` | Píldoras que piden o cierran la escena y muestran su fase |

## Seguridad

- Solo se aceptan mensajes cuyo `event.source` es el `contentWindow` del iframe **y** cuyo `event.origin` es exactamente el de `VITE_GLOBE_URL` (`fromGlobe`). Lo demás se descarta.
- Se envía siempre con ese origen como destino, nunca `'*'`.
- El globo, por su lado, solo obedece a los orígenes de `?allowedOrigins=`.
- El globo nunca recibe la URL de la API ni la llama.

## Mensajes que la consola envía

| Mensaje | Cuándo | Contenido |
| --- | --- | --- |
| `SET_SITES` | Al recibir `READY`; cuando cambian `sites` o `evaluation` | Sitios de `/sites`. `status` solo en el que coincide con `evaluation.site` (por `lat`/`lon` con tolerancia 1e-6) |
| `SET_SUN_LOCAL` | Al recibir `READY`; cuando cambian `evaluation` o `stepIndex` (agrupado en un `requestAnimationFrame`); antes de la escena | `{lat, lon, vector}` con `timeline[stepIndex].sun_vector_3d` tal cual. Si el vector no es válido, no se envía y el globo no dibuja Sol |
| `SET_EARTH_LOCAL` | Igual que el Sol | `earth_vector_3d` tal cual |
| `SET_SKY_GLOBAL` | Con `READY`, al cargar `ephemeris` y al cambiar la fecha, **solo sin evaluación** (con una, el cielo sale de los vectores del sitio) | `GET /ephemeris` de la fecha de inicio: `direction` del Sol y de la Tierra y `distance_km` de la Tierra |
| `SET_PSR` | Con `READY`; cuando cambia `psrs` o `polePsrs` | `gid`, `name`, `geometry`. Las de `/psr/nearby` del sitio evaluado si las hay; si no, las de `/psr?min_area_km2=50&simplify_m=250` (≈ 67 regiones del polo); el globo las dibuja con relleno suave y contorno fino; el botón "Shadowed regions on/off" (`useGlobeStore.showPsr`) las oculta mandando `SET_PSR []` |
| `SET_COMPARE_PINS` | Con `READY`; al cambiar `scenarios`, `comparison`, `rankBy` o `workspace` | Letras A–E de los escenarios, solo en el workspace Compare (fuera, lista vacía). Con comparación hecha llevan `status` del backend y `best` según el criterio "Rank by" |
| `SET_CONFIG` | Con `READY` (las dos formas); `{showGrid, layers}` también al cambiar `layers` (píldoras "Grid" y "Elevation") | `{showGrid, layers: {lolaShade}}`: rejilla de latitud y longitud y mapa de color por altura LOLA, apagadas por defecto. `{terrainTilesUrl}`: `<VITE_API_BASE_URL>/terrain/tiles` (P-010). El globo comprueba que `<terrainTilesUrl>/0/0/0.png` responda; si no (backend sin v1.3), sigue con Moon Trek. Con ella el relieve usa las teselas LOLA reales y el polo sur se dibuja como relieve sombreado (luz fija, ilustrativa) en lugar del mosaico WAC de 267 m/px |
| `SET_PAUSED` | Al pasar `viewMode` a `'site'` (600 ms después, tras el fundido) y a `false` al volver; con `READY` si ya estaba en `'site'` | `{paused}`: el globo deja de dibujar mientras "Terrain detail" lo tapa |
| `SET_CUSTOM_PIN` | Con `READY`; al cambiar `selected` o `sites` | Marcador del lugar elegido que no es del catálogo (clic libre o una misión); `null` si es un sitio del catálogo |
| `SELECT_SITE` | Al recibir `READY` (si hay selección y no hay escena pedida); al cambiar `selected`; al terminar un `evaluate()` **en un sitio distinto al de la corrida anterior** (misma ubicación y otra fecha no repite el vuelo); al salir de la escena. **No** durante la escena | `{id, lat, lon, label}`. El globo vuela 2,5 s a 120 km sobre el sitio |
| `SET_HORIZON_DETAIL` | Al recibir `READY` y al cambiar `detail` | `{detailed}`. Simple muestra nombres; Detailed añade azimut, elevación y holgura |
| `SET_HORIZON` | Al pedir la vista de horizonte, y en cada corrida nueva mientras siga pedida | `horizon_profile` de `evaluate` tal cual, con `lat`/`lon` del sitio |
| `SET_SKY_STATE` | Junto a `SET_SUN_LOCAL` / `SET_EARTH_LOCAL` (cada cambio de `stepIndex`) | `{sun, earth}` con `az`, `el`, `horizonEl`, `visible` de `timeline[stepIndex]` |
| `SHOW_HORIZON` | Tras `SET_HORIZON` y el cielo, al pasar `horizon.requested` a `true`; en `READY` si ya estaba pedida | `{lat, lon}` de `evaluation.site`. El globo baja de la esfera al suelo |
| `EXIT_HORIZON` | Al pasar `horizon.requested` a `false` (salvo si empieza la escena de alunizaje, que cierra el horizonte sola) | — |
| `PLAY_LANDING_SCENE` | Al pasar `landing.requested` a `true`, o en `READY` si ya estaba pedida | `{lat, lon}` de `evaluation.site`, más `astronaut: false` si el interruptor "Astronaut" está apagado. Antes se reenvían Sol y Tierra del paso actual |
| `STOP_LANDING_SCENE` | Al pasar `landing.requested` a `false` ("Exit scene" o error). Se manda antes de abrir el horizonte si los dos cambian juntos | — |
| `RECENTER` | Al pulsar "Recenter" (`recenterSeq` sube) | — El globo cierra escena y horizonte por su cuenta, vuela a 9 000 km sobre el sitio elegido (latitud acotada a ±60°) sin quitar la selección y la Luna vuelve a girar sola hasta la siguiente vista |

Al terminar un `evaluate()` lanzado con `runSimulation()` (ver [`05`](05-pantallas.md)), la consola pide la vista de horizonte en lugar de `SELECT_SITE`: `SET_HORIZON` y `SHOW_HORIZON` con el sitio nuevo.

Declarados pero sin uso hoy: `RESET`. Existen en el globo y la consola no los usa: `SET_VIEW`, `LOOK_AT`, `VIEW_FROM_SURFACE`, `SET_VEHICLES`, `VIEW_VEHICLE`, `SET_TRAJECTORY`, `FOLLOW_TRAJECTORY`, `PLAY_ANIMATION`.

## Mensajes que la consola recibe

| Mensaje | Acción |
| --- | --- |
| `READY` | `link = 'ready'`, cancela el plazo de 8 s y envía el estado completo (ver secuencia) |
| `SITE_CLICKED` | `select()` del sitio, salvo durante la escena. No evalúa |
| `GLOBE_CLICKED` | `select()` de un "Custom pin" en ese punto, salvo durante la escena. No evalúa |
| `HORIZON_PHASE` | `horizon.phase` (`arrival`, `ready`, `leaving`) |
| `SCENE_PHASE` | `landing.phase` |
| `SCENE_TELEMETRY` | `landing.altM`, `landing.vMps` |
| `SCENE_ERROR` | `landing.error` y `requested = false` (lo que dispara `STOP_LANDING_SCENE` y el vuelo al sitio) |
| `LOADING`, `TRAJECTORY_PROGRESS`, `ANIMATION_COMPLETE` y desconocidos | Se ignoran |

## Secuencias

### Arranque

```
GlobeFrame monta el iframe ── link = 'loading' ── temporizador de 8 s
        │
        ├─ llega READY ── link = 'ready' ── pushAll():
        │                   SET_SITES → SET_SUN_LOCAL/SET_EARTH_LOCAL (si hay evaluación)
        │                   → SET_PSR (si hay) → PLAY_LANDING_SCENE (si estaba pedida) o SELECT_SITE (si hay selección)
        │
        └─ vence el plazo ── link = 'unavailable' ── placeholder; la consola sigue sin globo
```

El globo manda `READY` una sola vez por carga. Como el iframe ya no se desmonta, en una sesión normal hay un solo `READY`; si el globo se recarga, el siguiente `READY` reenvía todo.

### Elegir un sitio y evaluar

```
select()      → SELECT_SITE                         (vuelo de 2,5 s)
evaluate() ok → SET_SITES (con status) → SET_SUN_LOCAL + SET_EARTH_LOCAL (siguiente fotograma)
              → SET_PSR → SELECT_SITE                (re-vuelo al mismo sitio)
```

El store cambia `evaluation` y `psrs` en un solo `set`; el puente detecta cada campo por separado en la misma notificación.

### Scrubber y reproducción

Cada cambio de `stepIndex` cancela el fotograma pendiente y agenda uno nuevo que manda `SET_SUN_LOCAL` y `SET_EARTH_LOCAL`. Con Play a 4× son unos 10 cambios por segundo. La cámara del globo no se mueve. Si la escena de alunizaje está corriendo, el globo reorienta el Sol y la luz de los modelos sin detener la escena.

### Vista de horizonte

```
"Horizon view" → requestHorizon() → horizon = {requested: true}   (y apaga la escena si la había)
               → puente: SET_HORIZON → SET_SKY_STATE + SET_SUN_LOCAL + SET_EARTH_LOCAL → SHOW_HORIZON {lat, lon}
globo → HORIZON_PHASE arrival (vuelo de ~6 s) → ready (arrastrar mira a la redonda)
scrubber       → SET_SKY_STATE + Sol y Tierra por fotograma (el astro se mueve contra la silueta y se oculta o aparece)
nueva corrida  → SET_HORIZON + cielo + SHOW_HORIZON (no SELECT_SITE: el horizonte sigue)
"Back to globe" → clearHorizon() → EXIT_HORIZON → HORIZON_PHASE leaving (vuelo de regreso a la esfera)
```

El globo cierra la vista de horizonte si recibe `SELECT_SITE`, `SET_VIEW` o la escena de alunizaje. Por eso el puente no manda `SELECT_SITE` mientras `horizon.requested`.

### Escena de alunizaje

```
"Landing scene" → requestLanding() → landing = {requested: true}
                → puente: SET_SUN_LOCAL + SET_EARTH_LOCAL + PLAY_LANDING_SCENE {lat, lon}
globo → SCENE_PHASE arrival → descent (+ SCENE_TELEMETRY cada 100 ms) → landed → done
"Exit scene"    → clearLanding() → landing = NONE
                → puente: STOP_LANDING_SCENE + SELECT_SITE
```

Si no hay evaluación, el puente no envía nada y deja `landing.error = 'Run a simulation first.'`.

### Falla del globo

- Sin `READY` en 8 s: `link = 'unavailable'`, el iframe queda oculto (sigue montado) y se ve el placeholder. "Landing scene" no aparece.
- Si después llega un `READY` tardío, el puente lo acepta: `link = 'ready'` y reenvía el estado.
- Al desmontar el puente (solo pasa si se desmonta `GlobeFrame`): se quitan listeners y suscripciones y `link = 'idle'`.

## Cómo extenderlo

Un mensaje nuevo se añade en este orden: tipo en `globeProtocol.ts`, función pura con prueba en `globeBridge.ts`, envío o recepción en `useGlobeBridge.ts`. No se calcula física (los vectores van tal cual) y lo ilustrativo se rotula. Guía completa: `.handoff/docs/11-integracion-globo-consola.md` §10.
