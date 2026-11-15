# 03. Datos y API

La consola obtiene datos de cuatro lugares: nuestra API, `localStorage`, un catálogo estático de misiones en el código y valores por defecto del store. No llama a ningún otro servicio. El globo carga sus teselas por su cuenta ([`02`](02-renders.md)).

Esquemas y reglas de cada endpoint: `contracts/openapi.json` (copia del handoff, v1.3) y `.handoff/contracts/lunar-landing-api-contract.md`. Aquí solo se documenta **cómo los usa la consola**.

## Cliente HTTP

`src/core/api/client.ts` → `apiFetch(path, init)`:

1. `fetch(API_BASE + path)` con `Content-Type: application/json`. `API_BASE` = `VITE_API_BASE_URL` o `http://localhost:3000/api/v1`.
2. Si `fetch` lanza (sin red, DNS, CORS), se convierte en `ApiError('ERR_NETWORK', 0)`.
3. Si la respuesta no es `2xx`, `parseApiError` decide **por `error.code`** del sobre `ErrorResponse`. Códigos que no conoce pasan a `ERR_UNKNOWN`. Si no hay `error.code` (formato FastAPI `{detail}`), mapea por estado: 503 → `ERR_UPSTREAM_SERVICE`, 400/422 → `ERR_INVALID_PAYLOAD`, otro → `ERR_UNKNOWN`.
4. No hay reintentos, timeouts ni caché en el cliente. El navegador sí respeta el `Cache-Control: max-age=3600` que el backend v1.2 manda en los `GET` de referencia.

`src/core/api/endpoints.ts` expone un método por endpoint usado. Ninguna feature llama a `fetch` directamente.

## Endpoints, uno por uno

### `GET /health`

| | |
| --- | --- |
| **Cuándo** | Al arrancar (`init()`), y cada 20 s mientras el backend no responde (indicador offline). También con "Retry now" |
| **Campos usados** | `status` (`ok` → "Live data", otro → "Degraded") y la **presencia** de `engine` |
| **Dónde** | `DataSource` en la TopBar; `ConnectionStatus` |
| **Ignorados** | `timestamp_utc`, `data_dir`, `database`, `lola_dems`, `spice_kernels` |

El chip dice "Live data" si `status` es `ok`, "Degraded" si no, y "Offline" si no hay respuesta. Ya no existe "Sample data": el mock no se usa.

### `GET /sites`

| | |
| --- | --- |
| **Cuándo** | Al arrancar, junto con `/health` |
| **Campos usados** | `id`, `name`, `category`, `lat`, `lon` |
| **Dónde** | Buscador y selector de Setup, selector de Compare, pines del globo (`SET_SITES`) |
| **Ignorados** | `polar_x_m`, `polar_y_m`, `elevation_m`, `slope_deg`, `nearest_psr_km`, `description` (la consola muestra la pendiente y la PSR de `/evaluate`, no de `/sites`) |

El backend sirve 13 sitios, entre ellos Apollo 11, 15 y 17.

### `POST /evaluate`

| | |
| --- | --- |
| **Cuándo** | "Run simulation" (Setup), "Replay landing window" (Missions), "Open in Simulate" (History), ojo de un escenario (Compare) |
| **Cuerpo** | `lat`, `lon` del sitio elegido; `start_utc` (ISO UTC sin milisegundos, `toUtcIso`); `duration_days` (7, 14 o 29,5); `step_minutes` (15, 60 o 120; 60 por defecto); `panel_efficiency` (0–1); `panel_area_m2` |
| **Tamaño** | 14 días a 60 min = 336 pasos + 360 puntos de horizonte, unos 180 KB |

Campos de la respuesta y dónde se ven:

| Campo | Dónde |
| --- | --- |
| `site.status` | Chip GO/CAUTION/NO-GO y titular de Results; color del pin en el globo; History |
| `site.reasons` (en español) | Results › Detailed, lista de comprobaciones (`lang="es"`) |
| `site.slope_deg` | Results (Simple y Detailed "Ground slope"); Missions "Ground" |
| `site.elevation_m` | Results › Detailed |
| `site.nearest_psr_km` | Results (Simple "Permanent shadow N km away", Detailed) |
| `site.lat`, `site.lon` | Sitio de los vectores para el globo y de la escena de alunizaje |
| `summary.sun_visible_pct`, `earth_visible_pct` | Medidores de Results, pistas del timeline, History, Compare |
| `summary.hours_to_next_sunset` / `earthset` | Cuentas regresivas de Results; banderas del timeline en Detailed |
| `summary.next_sunset_utc` / `next_earthset_utc` | Results › Detailed (pueden venir `null`: "none in window") |
| `summary.max_continuous_sun_hours` / `dte_hours` | Results › Detailed "Longest stretch" |
| `summary.avg_power_factor`, `estimated_peak_power_w` | Results |
| `timeline[].timestamp_utc` | Reloj del timeline; paso en horas (`stepHours`) |
| `timeline[].sun_visible`, `earth_visible` | Pistas Gantt (tramos con `runs()`); estado actual en Detailed |
| `timeline[].sun_az_deg`, `sun_el_deg`, `sun_horizon_el_deg` (y los de la Tierra) | Results › Detailed; marcadores del horizonte 360°; Missions "Conditions at touchdown" (paso 0) |
| `timeline[].power_factor` | "Solar power now" |
| `timeline[].sun_vector_3d`, `earth_vector_3d` | Luz y marcadores de la escena local; `SET_SUN_LOCAL` / `SET_EARTH_LOCAL` al globo, **tal cual** (D-008) |
| `horizon_profile[]` | Timeline › Detailed › "Horizon 360°" |
| `site.checks` (v1.2) | **No se usa todavía.** Trae el veredicto en inglés con `code`/`level`/`value`/`threshold` |

### `GET /terrain/patch`

| | |
| --- | --- |
| **Cuándo** | En cada `evaluate()`, en paralelo con `/evaluate` |
| **Parámetros** | `lat`, `lon`, `size_km=12`, `resolution=128` |
| **Campos usados** | `grid.size_km`, `grid.resolution`, `grid.elevations_m`, `center.elevation_m` |
| **Dónde** | Solo la escena local (`TerrainMesh`). Su presencia habilita "Terrain detail" |
| **Ignorados** | `grid.slopes_deg`, `cell_size_m`, `min/max_elevation_m`, `source`, `native_resolution_m`, `nearby_psrs`, `center.polar_*`, `center.slope_deg` |

De dónde sale el DEM en el backend (verificado con el backend oficial el 2026-11-14):

| Zona | `grid.source` | Resolución nativa | En la malla de 12 km / 128 |
| --- | --- | --- | --- |
| Al sur de -80° | `lola_polar` (`LDEM_80S_40MPP_ADJ.TIF`) | 40 m | Submuestreado a ~94 m |
| Resto de la Luna | `lola_global` (`ldem_64.tif`) | 473,8 m | Interpolado a ~94 m: poco detalle real |

### `GET /psr/nearby`

| | |
| --- | --- |
| **Cuándo** | En cada `evaluate()`, en paralelo |
| **Parámetros** | `lat`, `lon` (radio 25 km, límite 50 y simplificación 150 m: valores por defecto del backend) |
| **Campos usados** | `psrs[].gid`, `name`, `geometry` |
| **Dónde** | Solo el globo (`SET_PSR`). La escena local no las dibuja |
| **Ignorados** | `center`, `radius_km`, `count`, `psrs[].area_km2`, `distance_km` |

### `POST /compare`

| | |
| --- | --- |
| **Cuándo** | "Compare scenarios" con 2 a 5 escenarios |
| **Cuerpo** | `scenarios[]` (`label`, `lat`, `lon`, `start_utc` a las 00:00 UTC del día elegido), `duration_days` y panel de Setup, `step_minutes: 120` fijo, `include_timeline: false` |
| **Campos usados** | `results[].site.status`, `site.slope_deg`, `summary.*` |
| **Dónde** | Matriz "Side by side", "Recommended" (orden con `rank()`: primero el estado, luego Sol, Tierra o la suma según "Rank by") |

`results[i]` se asocia con `scenarios[i]` por posición. Para ver el timeline de un escenario, el ojo hace un `evaluate()` completo de ese escenario (no usa `include_timeline`).

### Endpoints que la consola pide solo para el globo

| Endpoint | Uso |
| --- | --- |
| `GET /ephemeris?utc=` (v1.2) | Al iniciar y al cambiar la fecha. Sol, Tierra y distancia real a la Tierra desde el centro de la Luna: el cielo de la vista global, solo mientras no hay evaluación (`SET_SKY_GLOBAL`). Si falla, el globo queda sin Sol |
| `GET /psr?limit=100&min_area_km2=50&simplify_m=1000` (v1.2) | Una vez al iniciar. Las ~67 PSR grandes del polo (de 1.531). Se ven hasta que una evaluación trae las de `/psr/nearby` |

### Endpoints del contrato que la consola no usa

| Endpoint | Para qué serviría |
| --- | --- |
| `GET /terrain/tiles/{z}/{row}/{col}.png` (v1.3, D-016) | Relieve LOLA de toda la Luna para el globo (40 m/px en el polo sur desde `z = 9`). Lo pediría el globo, no la consola: depende de `P-010` |

La URL "Producción / Demo Pública" de `docs/07` sirve v1.1: ahí `/psr`, `/ephemeris` y `/terrain/tiles` dan `404` y no llegan `checks` ni los metadatos de `grid`. La URL "Backend oficial" sirve v1.3 y es la que usa la consola.

## Errores que ve el usuario

`ResultsPanel` › `ErrorNotice` traduce por `code` (nunca por mensaje): `ERR_NETWORK`, `ERR_UPSTREAM_SERVICE`, `ERR_INVALID_COORDINATES`, `ERR_INVALID_PAYLOAD`, `ERR_DATE_OUT_OF_RANGE`, `ERR_TERRAIN_UNAVAILABLE`, `ERR_NOT_FOUND`. Cualquier otro muestra "Something went wrong" y el código. Compare y Missions muestran solo el código.

`ERR_NETWORK` sin `health` enciende el ícono de conexión junto a la marca (`ConnectionStatus`), que reintenta `init()` cada 20 s.

## Datos que no vienen de la API

| Dato | Dónde vive | Notas |
| --- | --- | --- |
| Historial de corridas | `localStorage`, clave `lunar-navigator.history` (`useHistoryStore`) | Solo en este navegador. Máximo 100. Guarda sitio, fecha, duración, paso, `status`, `summary`, estrella y nota. No guarda el timeline |
| Catálogo de misiones | `src/features/missions/missions.ts` | 7 alunizajes reales (IM-1, IM-2, Chandrayaan-3, Chang'e 4, Apollo 17, 15 y 11) con fecha, hora, coordenadas y fuentes citadas. Las condiciones de luz **no** se guardan: salen de `/evaluate` al reproducir |
| Valores iniciales | `useMissionStore` | `2026-12-13T00:00:00Z`, 14 días, 60 min, 4 m², 28 % |
| Telemetría de la escena | Mensajes del globo (`SCENE_TELEMETRY`) | Ilustrativa |

## Cuándo hay red y cuándo no

| Acción | Peticiones |
| --- | --- |
| Abrir la consola | `/health` + `/sites` |
| Elegir un sitio, cambiar fecha, duración, paso o panel | Ninguna (se aplica al pulsar Run) |
| "Run simulation" y equivalentes | `/evaluate` + `/terrain/patch` + `/psr/nearby` |
| Scrubber, Play, velocidad, pestañas del timeline, Simple/Detailed | **Ninguna** (D-003) |
| "Landing scene", "Exit scene", "Terrain detail", "Back to globe" | Ninguna a la API (el globo puede pedir teselas) |
| "Compare scenarios" | `/compare` |
| Guardar, marcar, anotar o borrar en History | Ninguna (`localStorage`) |
