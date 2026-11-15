# 02. Renders: qué se ve en cada caso y de dónde sale

El fondo de la consola (`SceneBackground.tsx`) ocupa toda la pantalla detrás de los paneles. Hay tres renders posibles y una escena que corre dentro del globo:

| Render | Componente | Motor | Quién lo dibuja | ¿Usa datos? |
| --- | --- | --- | --- | --- |
| **Globo** | `GlobeFrame.tsx` (iframe) | CesiumJS | Repo del globo (`luna-render-nasa-space-challenge`) | Sí: los que le manda la consola y teselas de imagen y relieve externas |
| ↳ **Escena de alunizaje** | dentro del globo (`landingScene.ts` del globo) | CesiumJS | Repo del globo | Sitio, Sol y Tierra de nuestra API; relieve del globo; descenso ilustrativo |
| **Escena local** ("Terrain detail") | `LunarCanvas.tsx` + `TerrainMesh.tsx` + `CelestialBodies.tsx` | Three.js (React Three Fiber) | Esta consola | Sí: `/terrain/patch` y `timeline[stepIndex]` de nuestra API |
| **Placeholder** | `GlobePlaceholder.tsx` | SVG + CSS | Esta consola | No. Es decorativo |

## Estructura del fondo

```tsx
<div fixed inset-0 bg-sky>
  <div opacity 100 → 0 en 500 ms cuando viewMode = 'site' y hay terrain>   // nunca se desmonta
    {VITE_GLOBE_URL ? <GlobeFrame/> : <GlobePlaceholder/>}
  </div>
  {viewMode === 'site' && terrain && <div fade-in 500 ms><LunarCanvas/></div>}   // se monta y desmonta
</div>
```

- **El globo (o el placeholder) siempre está montado.** Al abrir "Terrain detail" solo se vuelve transparente, deja de recibir el puntero y se marca `aria-hidden`. El iframe no se recarga ni pierde su cámara.
- **La escena local se crea al abrirla y se destruye al cerrarla** (su contexto WebGL incluido).
- `GlobeFrame` monta el iframe aunque el globo falle: si `link = 'unavailable'` lo oculta con `hidden` y pinta el placeholder en su lugar.

## Qué se ve en cada caso

Variables que deciden el fondo: `VITE_GLOBE_URL`, `link` (`useGlobeStore`), `evaluation`/`terrain`, `viewMode` y `landing.requested`.

### Sin `VITE_GLOBE_URL`

| Situación | Fondo | Píldoras arriba (`SceneControls`) | Franja de créditos |
| --- | --- | --- | --- |
| Arranque, con o sin sitio elegido | Placeholder | — | Vacía |
| Tras "Run simulation" | Escena local encima del placeholder (`viewMode = 'site'`) | "Global view" | Texto de la consola |
| "Global view" | Placeholder | "Terrain detail" | Vacía |
| "Terrain detail" | Escena local otra vez, sin pedir nada a la red | "Global view" | Texto de la consola |
| La evaluación falla | No cambia | Mensaje de error en Results | Sin cambio |

"Landing scene" no aparece: la escena vive en el globo.

### Con `VITE_GLOBE_URL`

| Situación | `link` | Fondo | Qué se le manda al globo | Píldoras |
| --- | --- | --- | --- | --- |
| Primeros segundos | `loading` | El iframe cargando (lo que pinte el globo mientras arranca) | Nada hasta `READY` | — |
| Globo listo, sin sitio | `ready` | Globo en vista global con los pines de `/sites`, sin Sol (no hay vectores) | `SET_SITES` | — |
| Se elige un sitio (lista, buscador, coordenadas o clic en el globo) | `ready` | El globo vuela 2,5 s hasta 120 km sobre el sitio, mirando hacia abajo | `SELECT_SITE` | — |
| Tras "Run simulation" | `ready` | Globo sobre el sitio, con la luz del Sol real del paso 0, la Tierra en el cielo, el pin coloreado GO/CAUTION/NO-GO y las PSR cercanas | `SET_SITES` (con `status`), `SET_SUN_LOCAL`, `SET_EARTH_LOCAL`, `SET_PSR`, `SELECT_SITE` | "Landing scene", "Terrain detail" |
| Se mueve el scrubber o se reproduce | `ready` | La luz del Sol y la posición de la Tierra cambian; la cámara no se mueve | `SET_SUN_LOCAL`, `SET_EARTH_LOCAL` (una vez por fotograma) | Igual |
| "Horizon view", o al terminar "Run simulation" / "Replay" (`runSimulation`) | `ready` | La cámara baja de la esfera al suelo del sitio (~6 s) y mira el cielo sobre la silueta de `horizon_profile`; Sol y Tierra siguen al scrubber y se ocultan tras el terreno. El suelo se aclara y oscurece con el Sol del paso; sin Sol queda en penumbra, no en negro. Simple: nombres; Detailed: azimut, elevación y holgura | `SET_HORIZON`, `SET_SKY_STATE`, Sol y Tierra del paso, `SHOW_HORIZON` | Fase y "Back to globe" |
| Con el horizonte pedido: nueva corrida (Simulate, Compare "Show on terrain", History "Open", Missions "Replay") | `ready` | El horizonte se rehace en el sitio nuevo sin volver a la esfera | `SET_HORIZON`, cielo, `SHOW_HORIZON` (no `SELECT_SITE`) | Igual |
| "Back to globe" (desde el horizonte) | `ready` | Vuelo de regreso a la esfera, a 2 500 km sobre el sitio | `EXIT_HORIZON` | "Horizon view", "Landing scene" |
| "Landing scene" | `ready` | Escena de alunizaje en el mismo globo (detalle abajo) | Sol y Tierra del paso actual y `PLAY_LANDING_SCENE {lat, lon}` | Fase + telemetría, "Exit scene" |
| "Exit scene" | `ready` | El globo limpia la escena y vuelve a volar sobre el sitio | `STOP_LANDING_SCENE`, `SELECT_SITE` | "Landing scene", "Terrain detail" |
| "Terrain detail" | `ready` | La escena local aparece con un fundido de 500 ms; el globo se desvanece debajo pero **sigue montado y renderizando** | Sigue recibiendo Sol y Tierra si se mueve el scrubber | "Back to globe" |
| "Back to globe" | `ready` | La escena local se desmonta y el globo reaparece con un fundido de 500 ms, en la misma vista que tenía | Nada | "Landing scene", "Terrain detail" |
| El globo no manda `READY` en 8 s, sin evaluación | `unavailable` | Placeholder (el iframe queda oculto) | Nada | — |
| `unavailable` y luego "Run simulation" | `unavailable` | Escena local (`viewMode = 'site'`) | Nada | "Back to globe" |
| Se evaluó mientras `loading` y después venció el plazo | `unavailable` | Placeholder (`viewMode` se quedó en `'globe'`) | Nada | "Terrain detail" |
| El globo se recarga y vuelve a mandar `READY` | `ready` | Globo con todo el estado reenviado | Todo otra vez (ver [`04`](04-puente-globo.md)) | Según el estado |

Cambiar de workspace no cambia el fondo. History no tiene slot `top`, así que ahí no aparecen las píldoras de escena (ver [`06`](06-limitaciones-y-pendientes.md)).

## Escena de alunizaje (dentro del globo)

La pide el botón "Landing scene" (`requestLanding()`); la consola solo manda `lat`/`lon` del sitio evaluado. Los parámetros de cámara y tiempos son los valores por defecto del globo (`SCENE_LIMITS` en `landingScene.ts` del globo):

| Fase (`SCENE_PHASE`) | Qué pasa | Duración por defecto | Texto de la píldora |
| --- | --- | --- | --- |
| `arrival` | La cámara vuela desde la vista actual hasta un espectador a 120 m del sitio y 3 m sobre el suelo, mirando hacia donde aparecerá el módulo | 7 s | "Flying to the site…" |
| `descent` | El módulo baja en vertical desde 600 m con desaceleración constante, columna de motor y polvo bajo 30 m. Llega `SCENE_TELEMETRY` cada 100 ms | 14 s | "Illustrative descent · N m · N m/s" |
| `landed` | Posado; el polvo se disipa | ~1,6 s | "Touchdown" |
| `done` | Aparece el astronauta, la cámara se acerca a los dos en 3,5 s y queda orbitable | — | "Drag to look around" |

- El azimut de la cámara se elige a unos 70° del Sol para que el módulo se vea iluminado de lado. La luz de los modelos usa el azimut del Sol real a 30° de elevación: es un recurso de cámara, no la iluminación real (`docs/11` §6a del handoff).
- El relieve de la escena es el del globo (~666 m/px), no el de `/terrain/patch`.
- La telemetría es una curva (`alt = 600·(1 − t/14)²`), no física. Por eso la interfaz la rotula "Illustrative".
- Mientras corre, el globo oculta los pines. Los clics en el globo no seleccionan sitios (el puente los ignora).
- Si el sitio está en sombra (Sol bajo el horizonte en ese paso), el suelo se ve negro. Es el dato real.
- Con `prefers-reduced-motion` la escena corre igual: el movimiento lo controla el globo.

## De dónde sale cada cosa en el globo

Lo que viene de **nuestra API** (siempre a través de la consola; el globo nunca llama a la API):

| Elemento | Dato | Endpoint |
| --- | --- | --- |
| Pines de sitios | `id`, `name`, `category`, `lat`, `lon` | `GET /sites` |
| Color del pin evaluado | `evaluation.site.status` | `POST /evaluate` |
| Dirección del Sol, luz y sombreado | `timeline[stepIndex].sun_vector_3d` (marco local del sitio, D-008) | `POST /evaluate` |
| Posición de la Tierra | `timeline[stepIndex].earth_vector_3d` | `POST /evaluate` |
| Polígonos de sombra permanente | `psrs[].geometry` (metros estereográficos polares) | `GET /psr/nearby` |
| Sitio de la escena de alunizaje | `evaluation.site.lat` / `lon` | `POST /evaluate` |

Lo que el globo carga por su cuenta (definido en su repo, no en la consola):

| Elemento | Fuente | Resolución | Archivo del globo |
| --- | --- | --- | --- |
| Imagen base | LROC WAC Global Mosaic 303 ppd, teselas de `trek.nasa.gov` | ~100 m/px (nivel 8) | `src/layers.ts` |
| Imagen del polo sur | LROC WAC South Pole mosaic, reproyectado a la malla geográfica, `trek.nasa.gov` | hasta 267 m/px (nivel 5); deja un abanico de ~10 km en el polo | `src/polar.ts` |
| Relieve | LOLA DEM Global 128 ppd, `trek.nasa.gov`, convertido con una calibración contra el DEM del backend (RMSE ≈ 127 m) | ~666 m/px, pasos de ~77 m | `src/terrain.ts` |
| Capa de sombreado LOLA (opcional, apagada por defecto) | LOLA Color Shade, `trek.nasa.gov` | nivel 5 | `src/layers.ts` |
| Textura de regolito a ras de suelo | Ruido fractal generado en el navegador. **Ilustrativo** | Desde el nivel de terreno 13 | `src/regolith.ts` |
| Estrellas, textura de la Tierra | Assets locales del globo (Tycho2, Natural Earth) | — | `src/sky.ts` |
| Módulo y astronauta | Modelos GLB de NASA 3D Resources en `public/models/` (el módulo es un Apollo LM genérico) | — | `src/vehicles.ts` |
| Motor de render | Assets de Cesium servidos por el propio globo; sin token de Cesium ion | — | `public/cesium/` |

Las únicas llamadas a red externas del globo son las de `trek.nasa.gov`. Sin internet el globo no tiene imagen ni relieve. Que esas teselas salgan de nuestro backend depende de `P-008` (ver [`06`](06-limitaciones-y-pendientes.md)).

## De dónde sale cada cosa en la escena local

| Elemento | Dato | Detalle |
| --- | --- | --- |
| Malla del terreno | `terrain.grid.elevations_m` de `GET /terrain/patch?lat&lon&size_km=12&resolution=128` | 12 × 12 km, 128 × 128 vértices (16 384), ~94 m entre vértices. Row-major Norte→Sur, Oeste→Este sobre `PlaneGeometry.rotateX(-π/2)` (D-008). Alturas relativas a `center.elevation_m`, escala vertical 1. Gris plano (`#9ca3af`, `flatShading`), **sin imagen** |
| Fuente del DEM en el backend | `grid.source`, `grid.native_resolution_m` (v1.2; la consola aún no los muestra) | Al sur de -80°: `lola_polar`, 40 m nativos (se submuestrea a ~94 m). En el resto: `lola_global`, 473,8 m nativos (se interpola a ~94 m y por eso se ve liso) |
| Luz del Sol | `timeline[stepIndex].sun_vector_3d` × 9 000 m | Luz direccional ámbar, intensidad 3 si `sun_visible`, 0,1 si no. Ambiente 0,05 (0,3 sin evaluación) |
| Marcadores de Sol y Tierra | `sun_vector_3d`, `earth_vector_3d` × 9 000 m | Esferas de 250 y 200 m. Rojo oscuro cuando están ocultos tras el horizonte. No están a escala |
| Cámara | Fija al montar: `(0, 6000, 9000)`, `far` 100 km, `OrbitControls` | Se reinicia cada vez que se abre "Terrain detail" |

No se dibujan en la escena local: las PSR (se piden con `/psr/nearby` pero solo se mandan al globo), `grid.slopes_deg`, `terrain.nearby_psrs` y el horizonte (este se dibuja en el timeline, pestaña "Horizon 360°").

## Placeholder

140 estrellas SVG con semilla fija y un disco con gradiente radial que sugiere el limbo lunar. No representa datos. Aparece sin `VITE_GLOBE_URL` o con `link = 'unavailable'`.

## Franja de créditos (32 px abajo)

| `viewMode` | Quién la llena | Texto |
| --- | --- | --- |
| `globe` | El globo (créditos de Cesium) | Logo de Cesium, "Textura de regolito procedural (ilustrativa)" y "Data attribution" con las fuentes de Moon Trek |
| `site` | La consola (`ConsoleShell.tsx`, `Attribution`) | "Terrain: LRO LOLA (NASA GSFC) · Ephemeris: NASA/JPL Horizons" |

Los dos textos tienen problemas (idioma y fuente inexacta); ver [`06`](06-limitaciones-y-pendientes.md).

## Costo de cada render

- **Globo:** Cesium dibuja en cada fotograma (el globo no usa `requestRenderMode`), también mientras está transparente debajo de "Terrain detail". Mientras la escena local está abierta hay **dos contextos WebGL activos**.
- **Escena local:** 16 384 vértices; barata. Se destruye al cerrarla.
- El globo limita el paso de tiempo de sus animaciones a 0,1 s por fotograma: con render por software (sin GPU) la escena de alunizaje corre más lenta que en tiempo real.
