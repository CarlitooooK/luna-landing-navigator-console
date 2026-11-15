# Cómo funciona la consola por dentro

Mapa completo de la consola: qué hace cada pantalla y cada control, qué render se ve en cada caso y de dónde saca sus datos, qué pide a la API y cómo habla con el globo. Sirve para entenderla antes de cambiarla y como punto de partida para refinarla.

> **Alcance.** Describe el código de este repo. Los acuerdos entre partes (contrato, decisiones, ambientes) viven en el handoff (`.handoff/`, ver `CLAUDE.md`) y aquí solo se citan. El protocolo `postMessage` del globo vive en el `README.md` del repo del globo (`luna-render-nasa-space-challenge`). Si algo de aquí choca con el handoff, manda el handoff.
>
> Verificado el 2026-11-14 contra el código de la rama `feat/simulacion-en-globo`, el globo en `9d5076a` y el handoff en `cb5d0e8` (contrato v1.2).

## Índice

| Doc | Responde |
| --- | --- |
| [`01-arquitectura.md`](01-arquitectura.md) | Capas, stores, quién depende de quién, qué pasa paso a paso al correr una simulación |
| [`02-renders.md`](02-renders.md) | Los tres renders (globo, escena local, placeholder), cuál se ve en **cada caso posible** y de dónde sale cada píxel |
| [`03-datos-y-api.md`](03-datos-y-api.md) | Cada endpoint: cuándo se llama, con qué parámetros, qué campos se usan y dónde. Datos locales y estáticos |
| [`04-puente-globo.md`](04-puente-globo.md) | Mensajes con el iframe del globo y sus secuencias (arranque, selección, scrubber, escena de alunizaje, fallas) |
| [`05-pantallas.md`](05-pantallas.md) | Cada workspace, panel y control: qué acción dispara, qué pide a la red y qué cambia en el render |
| [`06-limitaciones-y-pendientes.md`](06-limitaciones-y-pendientes.md) | Lo que hoy se ve o se comporta mal, con su causa, y lo que falta para refinar |

## La consola en una figura

```
                         ┌──────────────── API (VITE_API_BASE_URL) ────────────────┐
                         │ /health /sites      /evaluate /terrain/patch /psr/nearby │ /compare
                         └──────▲───────────────────────▲────────────────────────────┘
                                │ init()                │ evaluate()                     │ compare()
                     ┌──────────┴───────────────────────┴────────────────────────────────┴───┐
                     │ useMissionStore (Zustand)                                             │
                     │  capa 1 configuración · capa 2 datos de la API · capa 3 reproducción  │
                     └───┬──────────────┬───────────────────────┬────────────────────────────┘
                         │              │                       │ suscripción
          paneles (React)│              │ viewMode / terrain    ▼
   Setup · Results ·     │              │              useGlobeBridge ──postMessage──► iframe del globo
   Timeline · Compare ·  │              ▼                       ▲   (CesiumJS, repo aparte)
   History · Missions    │       SceneBackground                │
                         │        ├─ globo (siempre montado) ◄──┘ READY · SITE_CLICKED · SCENE_*
                         │        └─ escena local Three.js (encima, solo en "Terrain detail")
                         ▼
               useHistoryStore ── localStorage (lunar-navigator.history)
               useOnboardingStore ── localStorage (lunar-navigator.onboarding)
```

- **Un solo cliente HTTP** (`src/core/api/`), **un solo archivo que habla con el iframe** (`useGlobeBridge.ts`).
- **El globo nunca se desmonta.** La simulación, el vuelo al sitio y la escena de alunizaje ocurren en él. La escena local del parche es opcional y se funde encima.
- **Cero red al reproducir:** el scrubber solo cambia `stepIndex` y todo lo demás se lee del `timeline[]` en memoria (D-003).
- **El cliente no calcula física** (D-002, D-006): el Sol, la Tierra, el horizonte y el veredicto llegan del backend.

## Glosario

| Término | Qué es en el código |
| --- | --- |
| **Render** | Lo que ocupa el fondo a pantalla completa detrás de los paneles. Hay tres: globo, escena local y placeholder ([`02`](02-renders.md)) |
| **`viewMode`** | `'globe' \| 'site'` en `useMissionStore`. `site` = la escena local del parche está encima del globo |
| **`link`** | Estado del enlace con el globo en `useGlobeStore`: `idle`, `loading`, `ready`, `unavailable` |
| **`landing`** | Estado de la escena de alunizaje en `useGlobeStore`: `requested`, `phase`, `altM`, `vMps`, `error` |
| **Paso / `stepIndex`** | Índice en `evaluation.timeline[]`. Cada paso dura `step_minutes` (60 por defecto) |
| **Workspace** | Pantalla elegida en el rail: Simulate, Compare, History, Missions |
| **Slot** | Hueco del cascarón donde un workspace pone un panel: `left`, `right`, `top`, `bottom`, `overlay` |
