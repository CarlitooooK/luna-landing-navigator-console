# 06. Limitaciones y pendientes

Lo que hoy se ve o se comporta mal, con su causa en el código, y lo que falta para refinar. Ordenado por impacto en la demo. Cada fila dice de qué repo depende arreglarlo.

## Render y calidad visual

| Problema | Causa | Depende de | Camino propuesto |
| --- | --- | --- | --- |
| El globo no es 100 % nuestro: imagen y relieve vienen de `trek.nasa.gov` y sin internet no hay superficie | `layers.ts`, `terrain.ts` y `polar.ts` del globo apuntan a Moon Trek | Globo + backend (`P-008`) | Que el backend sirva teselas de relieve desde los DEM que ya tiene (`LDEM_80S_40MPP_ADJ.TIF`, 40 m, y `ldem_64.tif`, 474 m) y el globo cambie solo `fetchDemTile`. La imagen podría quedarse en Moon Trek o servirse desde una copia propia |
| Abanico de imagen alrededor del polo sur (se ve al volar a Shackleton, Connecting Ridge, de Gerlache) | Mosaico polar reproyectado, máximo 267 m/px; ~10 km de radio (`docs/11` §7) | Globo | Teselas polares servidas en proyección estereográfica, o imagen del backend (`P-008`) |
| El relieve del globo y de la escena de alunizaje es grueso (~666 m/px, pasos de 77 m) | Nivel 5 del DEM de Moon Trek con 8 bits | Globo + backend | El mismo `P-008`. El parche de 40 m del backend no se usa en el globo |
| **Decisión del usuario (2026-11-14): "Terrain detail" debe verse como la escena de alunizaje del globo.** La vista a ras de suelo de `PLAY_LANDING_SCENE` es la que sirve para juzgar el terreno y las pendientes. La escena local de Three.js no sirve para eso y hay que reemplazarla | La escena local es otro render (`LunarCanvas` y `TerrainMesh`), con otro material y sin la imagen ni el cielo del globo. La escena del globo (`landingScene.ts`) pone la cámara a unos 120 m del punto de contacto, con relieve, imagen, Sol y Tierra | Consola + globo + backend | Que "Terrain detail" pida al globo una vista a ras de suelo del sitio **sin el descenso**: misma cámara y misma luz que la escena de alunizaje, con órbita libre alrededor del punto. El protocolo ya tiene `SET_VIEW {lat, lon, altM, headingDeg, pitchDeg}`, `VIEW_FROM_SURFACE` y `SET_CONFIG {terrainExaggeration}`, que la consola hoy no usa (`docs/11` §2). Hay que confirmar con el equipo del globo si alcanzan o si hace falta un mensaje nuevo (por ejemplo `VIEW_SITE_GROUND`), y si la escena puede quedarse en la fase `landed` sin pasar por el descenso. **Límite de datos:** con el relieve de Moon Trek (~666 m/px, pasos de 77 m) no se ven pendientes a la escala de un módulo. El backend ya sirve teselas Terrarium de toda la Luna (`GET /terrain/tiles`, contrato v1.3, D-016): LOLA polar de 40 m/px desde `z = 9` y LOLA global (~474 m/px) fuera del polo. Falta que se resuelva `P-010` (que el globo pida esas teselas con una URL que le pasa la consola por `SET_CONFIG`). Aun con eso, el detalle a ras de suelo solo existe cerca del polo sur: fuera de él la vista debe rotular la resolución del relieve para no sugerir más detalle del que hay. **Ya existe "Horizon view"** (PR `#9`, `docs/11` §11 del handoff): cámara a ras de suelo con el horizonte real. Se probó el 2026-11-14: muestra la luz y el horizonte, pero el suelo es una banda lisa sin relieve cercano, así que no sirve para ver pendientes (S-05 en `docs/specs/onboarding-ayudas-sugerencias/audit.md`). **Decisión del usuario (2026-11-14, D14 de la spec de onboarding):** "Horizon view" es la vista objetivo y la que se refina. "Terrain detail" se queda como está, y si se unifican o no se pregunta en el handoff (`P-013`). **Antecedente:** `docs/ideas/lunar-landing-ui-ux-tdd.md` del handoff ya pedía un modo de cámara "Lander POV" (cámara a 2 m del suelo, giro de 360°), y `VIEW_FROM_SURFACE` del globo pone la cámara justo a 2 m sobre el suelo |
| Fuera del polo el parche local no tiene detalle real | El backend usa `lola_global` (473,8 m nativos) interpolado a ~94 m | Consola + backend (datos) | Pedir `size_km` de 30 a 40 fuera del polo, como recomienda la respuesta de `P-006` (hoy siempre 12), y mostrar `grid.source` / `native_resolution_m` para no sugerir más precisión de la que hay |
| "Back to globe" corta la escena local sin fundido de salida | `SceneBackground` desmonta `LunarCanvas` en cuanto `viewMode` cambia; solo el globo hace la transición de 500 ms | Consola | Mantener la escena montada durante la salida y desmontarla al terminar la transición |
| La escena de alunizaje corre lenta sin GPU | El globo limita el paso a 0,1 s por fotograma | — | Probar siempre en una GPU real; las capturas automáticas usan render por software |

## Flujo y estado

| Problema | Causa | Camino propuesto |
| --- | --- | --- |
| Si el globo vence su plazo después de evaluar, queda el placeholder en vez de la escena local | `viewMode` se decide al terminar `evaluate()`, cuando `link` aún era `loading` | Pasar a `'site'` cuando `link` cambia a `unavailable` con una evaluación presente |

## Resuelto en este PR
- `evaluate()` usa `Promise.allSettled`: si falla el parche o `/psr/nearby`, el veredicto llega y Results avisa qué falta (`auxFailed`).
- Cambiar solo la fecha en el mismo lugar pide solo `/evaluate` (el parche y las PSR se reusan).
- Repetir la corrida en el mismo sitio no repite el vuelo de 2,5 s.
- El globo tiene Sol y Tierra antes de evaluar (`GET /ephemeris`, `SET_SKY_GLOBAL`, con la distancia real a la Tierra) y las PSR del polo (`GET /psr`, ≥ 50 km²).
- Pines A–E de Compare (estado del backend, recomendado resaltado) y marcador del pin libre o de la misión.

- Mientras "Terrain detail" está abierto, el globo deja de dibujar (`SET_PAUSED`, tras el fundido) y reanuda al volver.
- Elegir o evaluar otro lugar durante la escena de alunizaje la cierra y el globo encuadra el nuevo. Entrar a History cierra la escena y el horizonte.
- Créditos: en inglés en el globo y en la escena local ("Terrain and ephemeris: Lunar Navigator API · source data: LRO LOLA DEM, JPL DE ephemerides").
- Opción "Astronaut on/off" para la escena de alunizaje.

- "Terrain detail" rediseñado: relieve con sombras reales del Sol del scrubber (y luz de la Tierra cuando el Sol está oculto), color por `slopes_deg` del backend con leyenda de la escala de ese parche, Sol y Tierra a su tamaño angular real, estrellas, borde difuminado, marcador en el punto de aterrizaje, cámara que no baja del suelo y exageración vertical ×1/×2/×4 (por defecto ×2, rotulada). El parche se pide a 256 × 256. Con el Sol oculto el suelo se aclara y la interfaz lo dice. Los datos globales (474 m nativos) siguen dando relieve plano fuera del polo: depende de `P-010` y `P-013`.

## Datos y textos

| Problema | Causa | Camino propuesto |
| --- | --- | --- |
| La telemetría y el descenso de la escena no son física y no cambian con un NO-GO | El contrato no tiene trayectoria ni resultado de aterrizaje | Mantener el rótulo "Illustrative"; no inventar datos |

## Después de la spec de onboarding

La spec `docs/specs/onboarding-ayudas-sugerencias/` (tour, ayudas "?", Next step y Help) está implementada. Esto es lo que dejó abierto. Los códigos (A-11, T-02…) son los hallazgos de su `audit.md`.

| Pendiente | Por qué sigue abierto | Depende de |
| --- | --- | --- |
| Textos de `psr` y `power` sin revisión científica | Se preguntó en `P-011`; hasta la respuesta quedan como están en `glossary.ts` | Handoff (`P-011`) |
| Qué significa `hours_to_next_*` en `null` | `countdown()` hoy asume "no se pone en la ventana"; se preguntó en `P-012` | Backend (`P-012`) |
| ¿"Horizon view" y "Terrain detail" se unifican? | D14: "Horizon view" es la vista objetivo; "Terrain detail" no se tocó | Handoff (`P-013`) |
| Validación de paneles y coordenadas (A-11, A-12) | Robustez de formularios, fuera del entendimiento de la consola | Consola |
| Leyenda y escala del eje de Horizon 360° (T-02) | La ayuda `horizon-360` lo explica; la escala del eje es otra tarea | Consola |
| Banderas Sunset / Earthset encimadas (T-04) | Presentación del timeline | Consola |
| Visibilidad de la escena y abanico polar (S-01, S-04) | Render; ver la tabla "Render y calidad visual" y `P-008`. S-03 (terreno sin fuente) quedó resuelto con el rediseño de "Terrain detail" (#13): su leyenda muestra `grid.source`, la resolución nativa y el tamaño del parche, que es lo que pedía la ayuda `terrain-detail` de `design.md` §2.4 | Globo + backend |
| Píldoras sin acción y `Segmented` sin flechas (S-02, X-04) | Accesibilidad de primitivas: tarea propia | Consola |
| Matriz de Compare (C-04, C-05, C-06) | Presentación de Compare; la ayuda `rank-by` ya explica el orden | Consola |
| Borrado sin deshacer, acciones parecidas y estrella pequeña en History (H-02, H-03, H-04) | Fuera del flujo principal de la demo | Consola |
| Sobrescritura, siglas y desbordes de fuentes en Missions (M-03, M-04, M-05) | Pulido de Missions | Consola |
| Tiras plegadas y contraste en pantalla completa (F-02, F-03) | Hay que revisarlo con GPU real y medir contraste | Consola |
| Etiquetas del globo bajo los paneles (X-07) | Ajuste del vidrio o del globo, a revisar con GPU real | Consola + globo |
| "Horizon view" no indica hacia dónde está la Tierra fuera de cuadro (S-05) | El paso 5 del tour y la ayuda `horizon-view` lo explican; el indicador le toca al globo | Globo |
| El tour con `prefers-reduced-motion` no se probó en capturas | La herramienta de capturas no emula la preferencia; el código usa `prefersReducedMotion()` | Consola (prueba manual) |

## Opcionales aún sin hacer

- Interruptor de `SET_VEHICLES` (módulo y astronauta fuera de la escena), `docs/11` §6b.
- Indicador de carga con `LOADING {pending}`.
- Pasar `headingDeg`, `startAltM`, `durationS` o `distanceM` a `PLAY_LANDING_SCENE` desde la interfaz (hoy van los valores por defecto del globo; `astronaut` ya tiene interruptor).
- Desplegar el globo y fijar `VITE_GLOBE_URL` de producción.
- Video demo y AI Tool Disclosure.
