# 01. Arquitectura

## Árbol de arranque

```
main.tsx            fuentes Atkinson Hyperlegible + index.css + <App/> en StrictMode
└─ App.tsx          llama init() una vez y elige los slots del workspace activo
   └─ ConsoleShell  cascarón: render de fondo + paneles flotantes
      ├─ SceneBackground        (z-0, fixed inset-0)  →  ver 02-renders.md
      ├─ overlay (z-10)         Rail · TopBar | FullscreenBar · slots del workspace
      └─ franja de créditos     32 px abajo (ATTRIBUTION_STRIP)
```

`App.tsx` mapea cada workspace a sus slots:

| Workspace | `left` | `right` | `top` | `bottom` | `overlay` |
| --- | --- | --- | --- | --- | --- |
| `simulate` | `SetupPanel` | `ResultsPanel` | `SceneControls` | `TimelineDock` | — |
| `compare` | `ScenariosPanel` | — | `SceneControls` | `TimelineDock` | `CompareMatrix` |
| `history` | `HistoryList` (400 px) | `RunDetails` | — | — | — |
| `missions` | `MissionsList` (400 px) | `MissionBrief` | `SceneControls` | `TimelineDock` | — |

El render de fondo es el mismo en los cuatro workspaces: cambiar de workspace no lo desmonta ni lo recarga.

El contenedor del overlay tiene `pointer-events: none` y cada panel lo reactiva. Por eso arrastrar el espacio libre mueve el render que está debajo (el globo o la escena local).

## Carpetas y dependencias

```
src/core/api        cliente HTTP (único que hace fetch)            ← core/store
src/core/store      useMissionStore · useGlobeStore · useHistoryStore ← features/*
src/core/utils      funciones puras: tiempo, timeline, coordenadas, ranking (con pruebas)
src/core/config.ts  VITE_GLOBE_URL
src/types           api.d.ts (generado del contrato) + alias legibles
src/ui              primitivas glass (Panel, Segmented, Pill…), movimiento (motion.ts, Flow.tsx)
src/features/*      un módulo por funcionalidad; leen y escriben los stores
```

Reglas que el código respeta y que no se deben romper:

- **Solo `src/core/api/` hace `fetch`.** Las features llaman acciones del store, nunca a la API.
- **Solo `useGlobeBridge.ts` habla con el iframe.** Los demás leen `useGlobeStore`.
- **Los tipos del contrato se generan** (`npm run gen:types`); no se editan a mano.
- **Los tipos del protocolo del globo viven solo en `globeProtocol.ts`.**

## Stores

### `useMissionStore` (estado de la misión, sin persistencia)

Organizado en las tres velocidades de `docs/ideas/frontend-architecture-guide.md` §3 (no vinculante):

| Capa | Campos | Cambia con | ¿Red? |
| --- | --- | --- | --- |
| Cascarón | `workspace`, `detail` (`simple`/`detailed`), `fullscreen`, `viewMode` | Rail, toggle, tecla `F`, evaluar, "Terrain detail" | No |
| 1. Configuración | `health`, `sites`, `selected`, `startUtc`, `durationDays`, `stepMinutes`, `panelAreaM2`, `panelEfficiency` | Arranque y formulario Setup | Solo `init()` |
| 2. Datos de la API | `evaluation`, `terrain`, `psrs`, `loading`, `error`, `lastRunMs` | `evaluate()` | Sí, bajo demanda |
| 3. Reproducción | `stepIndex`, `playing` | Scrubber, Play, teclado | **Nunca** |
| Compare | `scenarios`, `comparison`, `comparing`, `compareError`, `shownScenario` | Panel Scenarios | `compare()` y `showScenario()` |
| Selección local | `pickedRun` (History), `pickedMission` (Missions, `im-1` por defecto) | Listas | No |

Valores por defecto: `startUtc = 2026-12-13T00:00:00Z` (de día en casi todo el catálogo; D11 de la spec de onboarding), 14 días, paso de 60 min, panel de 4 m² al 28 %.

Acciones principales:

| Acción | Qué hace |
| --- | --- |
| `init()` | `GET /health` y `GET /sites` en paralelo. Si falla, guarda `error` (el indicador offline reintenta cada 20 s) |
| `select(site)` | Cambia `selected` y limpia `error`. **No evalúa** |
| `evaluate()` | Pide `/evaluate`, `/terrain/patch` y `/psr/nearby` en paralelo. Al responder fija `viewMode` (ver abajo) y reinicia `stepIndex` a 0 |
| `backToGlobe()` | `viewMode = 'globe'` y pausa la reproducción |
| `showSite()` | `viewMode = 'site'` si hay `terrain` |
| `setStep(i)` / `setPlaying(p)` | Capa 3 |
| `addScenario` / `removeScenario` / `compare()` | Comparador (2 a 5 escenarios, sin duplicar sitio + fecha) |
| `showScenario(key)` | Selecciona el sitio y la fecha del escenario y llama `evaluate()` |

`viewMode` tras evaluar: `'globe'` si hay `VITE_GLOBE_URL` y `link !== 'unavailable'`; si no, `'site'`. Con globo, la simulación se queda en él; sin globo, la escena local es el fondo.

### `useGlobeStore` (enlace con el globo)

Lo escribe **solo** el puente (`useGlobeBridge`) y los botones de escena (`SceneControls`).

| Campo | Valores | Quién lo cambia |
| --- | --- | --- |
| `link` | `idle` → `loading` → `ready`, o `unavailable` si no llega `READY` en 8 s | Puente |
| `landing.requested` | `true` mientras la escena de alunizaje está pedida o corriendo | `requestLanding()` / `clearLanding()` (botones) y `setLandingError()` (puente) |
| `landing.phase` | `arrival`, `descent`, `landed`, `done` | Puente, con `SCENE_PHASE` |
| `landing.altM`, `landing.vMps` | Telemetría **ilustrativa** del descenso | Puente, con `SCENE_TELEMETRY` |
| `landing.error` | Motivo de `SCENE_ERROR` o "Run a simulation first." | Puente |

### `useHistoryStore` (historial, persistente)

`zustand/persist` en `localStorage`, clave `lunar-navigator.history`, versión 1, límite 100 corridas. Guarda parámetros y `summary`, no el `timeline` (unos 180 KB por corrida): reabrir una corrida vuelve a evaluar.

### `useOnboardingStore` (tour, persistente)

`zustand/persist` en `localStorage`, clave `lunar-navigator.onboarding`, versión 1. Solo guarda `tour: { status, at }`, con `status` en `unseen`, `dismissed` o `completed`; el paso abierto (`step`) no se guarda. `migrateOnboarding()` (`features/onboarding/steps.ts`) normaliza lo guardado sin `version` o con un estado desconocido a `unseen`. Qué pasos tocan y con qué texto lo decide la función pura `resolveSteps()` del mismo archivo.

## Qué pasa al pulsar "Run simulation"

```
SetupPanel ── evaluate() ─────────────────────────────────────────────────────────────┐
  loading = true, stepIndex = 0, playing = false                                      │
  Promise.all:                                                                        │
    POST /evaluate        {lat, lon, start_utc, duration_days, step_minutes, panel_*} │
    GET  /terrain/patch   ?lat&lon&size_km=12&resolution=128                          │
    GET  /psr/nearby      ?lat&lon   (radio 25 km, 50 PSR por defecto del backend)    │
  ok  → evaluation, terrain, psrs, viewMode = 'globe' (o 'site' sin globo), lastRunMs │
  err → error (ApiError por code), loading = false; viewMode no cambia                │
└─────────────────────────────────────────────────────────────────────────────────────┘
        │ el store cambia
        ├─ ResultsPanel      veredicto y KPIs de evaluation.site / summary / timeline[stepIndex]
        ├─ TimelineDock      pistas de Sol, Tierra (y "Both") con un efecto de vertido
        ├─ SceneControls     píldoras "Landing scene" y "Terrain detail"
        └─ useGlobeBridge    SET_SITES (con status del sitio evaluado), SET_SUN_LOCAL,
                             SET_EARTH_LOCAL, SET_PSR y SELECT_SITE (el globo vuela al sitio)
```

Si cualquiera de las tres peticiones falla, falla toda la corrida (ver [`06`](06-limitaciones-y-pendientes.md)).

## Configuración por entorno

| Variable | Uso | Sin valor |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Base de la API, incluye `/api/v1` (`src/core/api/client.ts`) | `http://localhost:3000/api/v1`, valor de respaldo del código: sin un backend ahí, la consola queda en Offline |
| `VITE_GLOBE_URL` | URL del globo (`src/core/config.ts`) | Placeholder en lugar del globo; al evaluar, escena local |

Las URLs vigentes están solo en `.handoff/docs/07-ambientes-y-pruebas.md`. `.env.local` está ignorado por git; `.env.example` trae los nombres.

## Movimiento e interfaz (resumen)

- `src/ui/motion.ts`: luz que sigue al puntero (`useLiquidLight`), indicador deslizante (`useGlider`) y `withViewTransition` para cambios de workspace, pantalla completa y nivel de detalle.
- `src/ui/Flow.tsx`: números que fluyen hacia su valor nuevo.
- `src/index.css`: tokens (`@theme`), utilidades `glass`, `raised`, `inset-well`, `btn-primary`, `glow` y animaciones (`condense`, `pour`, `fade-in`, `drip`, `breathe`…). Con `prefers-reduced-motion` las distancias se anulan y queda el fundido.
- Pantalla completa (`F`): los slots `.peek` muestran solo una franja de 52 × 300 px y se despliegan al pasar el puntero o enfocar con teclado. En pantallas táctiles no se pliegan. El timeline crece hacia arriba desde el borde inferior (`items-end` en su slot) y espera 1 s antes de plegarse cuando salen el puntero y el foco; volver antes lo mantiene abierto. Sin eso, al animar su alto el borde inferior subía, dejaba el cursor fuera y el dock se abría y cerraba en bucle.
