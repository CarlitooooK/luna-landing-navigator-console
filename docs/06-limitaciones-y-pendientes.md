# 06. Limitaciones y pendientes

Lo que hoy se ve o se comporta mal, con su causa en el código, y lo que falta para refinar. Ordenado por impacto en la demo. Cada fila dice de qué repo depende arreglarlo.

## Render y calidad visual

| Problema | Causa | Depende de | Camino propuesto |
| --- | --- | --- | --- |
| El globo no es 100 % nuestro: imagen y relieve vienen de `trek.nasa.gov` y sin internet no hay superficie | `layers.ts`, `terrain.ts` y `polar.ts` del globo apuntan a Moon Trek | Globo + backend (`P-008`) | Que el backend sirva teselas de relieve desde los DEM que ya tiene (`LDEM_80S_40MPP_ADJ.TIF`, 40 m, y `ldem_64.tif`, 474 m) y el globo cambie solo `fetchDemTile`. La imagen podría quedarse en Moon Trek o servirse desde una copia propia |
| Abanico de imagen alrededor del polo sur (se ve al volar a Shackleton, Connecting Ridge, de Gerlache) | Mosaico polar reproyectado, máximo 267 m/px; ~10 km de radio (`docs/11` §7) | Globo | Teselas polares servidas en proyección estereográfica, o imagen del backend (`P-008`) |
| El relieve del globo y de la escena de alunizaje es grueso (~666 m/px, pasos de 77 m) | Nivel 5 del DEM de Moon Trek con 8 bits | Globo + backend | El mismo `P-008`. El parche de 40 m del backend no se usa en el globo |
| La escena local ("Terrain detail") se ve pobre: gris, sin imagen, 12 km | `TerrainMesh` usa solo alturas, `flatShading` y un material liso; el parche es de 128 × 128 | Consola | Si se conserva: textura de sombreado, escala vertical, horizonte y PSR. Si el globo gana detalle con `P-008`, se puede retirar |
| **Decisión del usuario (2026-11-14): "Terrain detail" debe verse como la escena de alunizaje del globo.** La vista a ras de suelo de `PLAY_LANDING_SCENE` es la que sirve para juzgar el terreno y las pendientes. La escena local de Three.js no sirve para eso y hay que reemplazarla | La escena local es otro render (`LunarCanvas` y `TerrainMesh`), con otro material y sin la imagen ni el cielo del globo. La escena del globo (`landingScene.ts`) pone la cámara a unos 120 m del punto de contacto, con relieve, imagen, Sol y Tierra | Consola + globo + backend | Que "Terrain detail" pida al globo una vista a ras de suelo del sitio **sin el descenso**: misma cámara y misma luz que la escena de alunizaje, con órbita libre alrededor del punto. El protocolo ya tiene `SET_VIEW {lat, lon, altM, headingDeg, pitchDeg}`, `VIEW_FROM_SURFACE` y `SET_CONFIG {terrainExaggeration}`, que la consola hoy no usa (`docs/11` §2). Hay que confirmar con el equipo del globo si alcanzan o si hace falta un mensaje nuevo (por ejemplo `VIEW_SITE_GROUND`), y si la escena puede quedarse en la fase `landed` sin pasar por el descenso. **Límite de datos:** con el relieve de Moon Trek (~666 m/px, pasos de 77 m) no se ven pendientes a la escala de un módulo. El backend ya sirve teselas Terrarium de toda la Luna (`GET /terrain/tiles`, contrato v1.3, D-016): LOLA polar de 40 m/px desde `z = 9` y LOLA global (~474 m/px) fuera del polo. Falta que se resuelva `P-010` (que el globo pida esas teselas con una URL que le pasa la consola por `SET_CONFIG`). Aun con eso, el detalle a ras de suelo solo existe cerca del polo sur: fuera de él la vista debe rotular la resolución del relieve para no sugerir más detalle del que hay. **Ya existe "Horizon view"** (PR `#9`, `docs/11` §11 del handoff): cámara a ras de suelo con el horizonte real. Se probó el 2026-11-14: muestra la luz y el horizonte, pero el suelo es una banda lisa sin relieve cercano, así que no sirve para ver pendientes (S-05 en `docs/specs/onboarding-ayudas-sugerencias/audit.md`). **Decisión del usuario (2026-11-14, D14 de la spec de onboarding):** "Horizon view" es la vista objetivo y la que se refina. "Terrain detail" se queda como está, y si se unifican o no se pregunta en el handoff (`P-013`). **Antecedente:** `docs/ideas/lunar-landing-ui-ux-tdd.md` del handoff ya pedía un modo de cámara "Lander POV" (cámara a 2 m del suelo, giro de 360°), y `VIEW_FROM_SURFACE` del globo pone la cámara justo a 2 m sobre el suelo |
| Fuera del polo el parche local no tiene detalle real | El backend usa `lola_global` (473,8 m nativos) interpolado a ~94 m | Consola + backend (datos) | Pedir `size_km` de 30 a 40 fuera del polo, como recomienda la respuesta de `P-006` (hoy siempre 12), y mostrar `grid.source` / `native_resolution_m` para no sugerir más precisión de la que hay |
| Mientras "Terrain detail" está abierto hay dos contextos WebGL y el globo sigue dibujando debajo | El globo no usa `requestRenderMode` y no existe un mensaje para pausarlo | Globo | Un mensaje `PAUSE`/`RESUME` o `requestRenderMode` en el globo |
| "Back to globe" corta la escena local sin fundido de salida | `SceneBackground` desmonta `LunarCanvas` en cuanto `viewMode` cambia; solo el globo hace la transición de 500 ms | Consola | Mantener la escena montada durante la salida y desmontarla al terminar la transición |
| La escena de alunizaje corre lenta sin GPU | El globo limita el paso a 0,1 s por fotograma | — | Probar siempre en una GPU real; las capturas automáticas usan render por software |

## Flujo y estado

| Problema | Causa | Camino propuesto |
| --- | --- | --- |
| Si el globo vence su plazo después de evaluar, queda el placeholder en vez de la escena local | `viewMode` se decide al terminar `evaluate()`, cuando `link` aún era `loading` | Pasar a `'site'` cuando `link` cambia a `unavailable` con una evaluación presente |
| Elegir otro sitio o volver a evaluar durante la escena de alunizaje no la cambia de sitio | El puente omite `SELECT_SITE` mientras `landing.requested` | Cerrar la escena al cambiar de sitio, o reiniciarla en el nuevo |
| En History no hay forma de salir de la escena | History no tiene slot `top` | Salir de la escena al cambiar de workspace, o poner las píldoras en History |

## Resuelto en este PR
- `evaluate()` usa `Promise.allSettled`: si falla el parche o `/psr/nearby`, el veredicto llega y Results avisa qué falta (`auxFailed`).
- Cambiar solo la fecha en el mismo lugar pide solo `/evaluate` (el parche y las PSR se reusan).
- Repetir la corrida en el mismo sitio no repite el vuelo de 2,5 s.
- El globo tiene Sol y Tierra antes de evaluar (`GET /ephemeris`, `SET_SKY_GLOBAL`, con la distancia real a la Tierra) y las PSR del polo (`GET /psr`, ≥ 50 km²).
- Pines A–E de Compare (estado del backend, recomendado resaltado) y marcador del pin libre o de la misión.

## Datos y textos

| Problema | Causa | Camino propuesto |
| --- | --- | --- |
| La franja de créditos de la escena local dice "Ephemeris: NASA/JPL Horizons" | Texto fijo en `ConsoleShell.tsx`. El backend calcula con kernels SPICE (`de421`, `de440s`), no con Horizons | Cambiarlo a algo como "Terrain and ephemeris: Lunar Navigator API · source data: LOLA DEM, JPL DE ephemerides" (pendiente de confirmar) |
| Los créditos del globo incluyen texto en español ("Textura de regolito procedural (ilustrativa)") | `regolith.ts` del globo | Globo: traducir el crédito (la interfaz es en inglés) |
| Las razones del veredicto en Detailed están en español | Se muestran `site.reasons` | Usar `site.checks[].message` (v1.2, en inglés) cuando el ambiente sirva v1.2; mantener `reasons` como respaldo |
| La URL "Producción / Demo Pública" sirve v1.1 | Ver `docs/07` del handoff | **Resuelto en el ambiente:** la consola usa el "Backend oficial" (v1.3). Falta usar `checks` en la interfaz: tarea B5 de `docs/specs/onboarding-ayudas-sugerencias/tasks.md` |
| La telemetría y el descenso de la escena no son física y no cambian con un NO-GO | El contrato no tiene trayectoria ni resultado de aterrizaje | Mantener el rótulo "Illustrative"; no inventar datos |

## Opcionales aún sin hacer

- Interruptor de `SET_VEHICLES` (módulo y astronauta fuera de la escena), `docs/11` §6b.
- Indicador de carga con `LOADING {pending}`.
- Pasar `headingDeg`, `startAltM`, `durationS`, `distanceM` o `astronaut` a `PLAY_LANDING_SCENE` desde la interfaz (hoy van los valores por defecto del globo).
- Desplegar el globo y fijar `VITE_GLOBE_URL` de producción.
- Video demo y AI Tool Disclosure.
