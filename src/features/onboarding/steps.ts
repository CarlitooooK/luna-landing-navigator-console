// Lógica pura del tour (spec de onboarding, design.md §1.2, §1.3 y §1.7, tarea D2).
// Qué pasos tocan, con qué texto y qué botón, según el estado de la consola. Sin DOM: lo pinta Tour.tsx (D3).

export type TourStatus = 'unseen' | 'dismissed' | 'completed'
export type TourAnchor = 'setup' | 'results' | 'timeline' | 'scene' | 'detail' | 'rail'
export type TourActionId = 'try-scenario' | 'run' | 'play' | 'horizon' | 'toggle-detail'

/** Escenario del tour (D3 del README de la spec): GO del 9 al 21 de diciembre con el Backend oficial. */
export const TOUR_SCENARIO = { siteId: 'apollo-11', startUtc: '2026-12-13T00:00:00Z', durationDays: 14 } as const

export interface TourStep {
  id: 'intro' | TourAnchor
  /** Ancla `data-tour`. Sin ancla, la tarjeta va centrada y sin foco de luz. */
  anchor: TourAnchor | null
  title: string
  text: string
  note?: string
  action?: { id: TourActionId; label: string }
}

export interface TourInput {
  /** Sitio elegido en Setup. */
  selected: { id: string; label: string } | null
  startUtc: string
  /** Sitios de `/sites`, para resolver el escenario del tour. */
  sites: { id: string; name: string }[]
  evaluated: boolean
  /** Sin backend: `health = null` y `ERR_NETWORK`. */
  offline: boolean
  /** El globo está configurado y no se declaró `unavailable`. */
  globe: boolean
  /** Hay parche de terreno para "Terrain detail". */
  terrain: boolean
  viewMode: 'globe' | 'site'
  detail: 'simple' | 'detailed'
}

/**
 * El sitio que propone "Try …": Apollo 11 con su fecha, o el primero de `/sites` con la fecha que tenga Setup.
 * `null` sin sitios.
 */
export function tourScenario(sites: TourInput['sites'], startUtc: string): { siteId: string; label: string; startUtc: string; durationDays?: number } | null {
  const s = sites.find((x) => x.id === TOUR_SCENARIO.siteId)
  if (s) return { siteId: s.id, label: s.name, startUtc: TOUR_SCENARIO.startUtc, durationDays: TOUR_SCENARIO.durationDays }
  return sites[0] ? { siteId: sites[0].id, label: sites[0].name, startUtc } : null
}

const SETUP_TAIL = 'Set the landing date and how long the mission lasts. Then run the simulation: the server traces the horizon and follows the Sun and Earth for the whole stay.'

function setupStep(st: TourInput): TourStep {
  const base = { id: 'setup', anchor: 'setup', title: 'Where, when, run' } as const
  if (st.offline) return { ...base, text: `Search a landing site or click the globe. ${SETUP_TAIL}`,
    note: 'The simulation server is unreachable, so this tour only describes the screen. It retries on its own.' }
  if (!st.selected) {
    const sc = tourScenario(st.sites, st.startUtc)
    return { ...base, text: `Search a landing site or click the globe. ${SETUP_TAIL}`, action: sc ? { id: 'try-scenario', label: `Try ${sc.label}` } : undefined }
  }
  const run = { id: 'run', label: st.evaluated ? 'Run again' : 'Run simulation' } as const
  const onScenario = st.selected.id === TOUR_SCENARIO.siteId && st.startUtc === TOUR_SCENARIO.startUtc
  return { ...base, action: run,
    text: !onScenario ? `You picked ${st.selected.label}. ${SETUP_TAIL}`
      : st.evaluated ? 'Apollo 11 on Dec 13, 2026: a good window. Press Next to see why.'
      : 'Apollo 11 on Dec 13, 2026: a good window. Run the simulation to see why.' }
}

function sceneStep(st: TourInput): TourStep | null {
  // Las píldoras solo existen con evaluación, y sin globo solo si hay terreno (SceneControls).
  if (!st.evaluated || (!st.globe && !st.terrain)) return null
  const base = { id: 'scene', anchor: 'scene', title: 'See it on the ground' } as const
  if (!st.globe) return { ...base, text: st.viewMode === 'site'
    ? 'Global view goes back from the local terrain to the whole Moon.'
    : 'Terrain detail opens the local terrain from the server, lit by the Sun at the selected time.' }
  return { ...base, action: { id: 'horizon', label: 'Horizon view' },
    text: 'Horizon view puts you on the ground: watch the Sun and Earth rise and set behind the real skyline as you move the timeline. Landing scene plays an illustrative descent. Terrain detail opens the local terrain from the server.' }
}

/** Los pasos del tour para este estado (design.md §1.3). Siete como máximo; seis si no hay píldoras de escena. */
export function resolveSteps(st: TourInput): TourStep[] {
  const evaluated = st.evaluated && !st.offline
  const steps: (TourStep | null)[] = [
    { id: 'intro', anchor: null, title: 'Find a safe place to land on the Moon',
      text: 'Pick a site and a date. The console tells you if it is GO, CAUTION or NO-GO, and why: sunlight for power, Earth in view for radio, and ground you can land on.' },
    setupStep(st),
    { id: 'results', anchor: 'results', title: 'The verdict, and why', text: evaluated
      ? 'GO, CAUTION or NO-GO comes from the server, with the checks behind it. Below: how long the Sun stays up, how long you can talk to Earth and how steep the ground is. Every "?" explains a number.'
      : 'Your verdict will appear here after you run a simulation.' },
    evaluated
      ? { id: 'timeline', anchor: 'timeline', title: 'Time is the main control', action: { id: 'play', label: 'Play' },
        text: 'Drag the timeline or press play. The Sun and Earth move in the 3D view and the numbers follow. Bright bars are the hours with sunlight or with Earth in view.' }
      : { id: 'timeline', anchor: null, title: 'Time is the main control', text: 'The timeline appears below once a simulation has run.' },
    sceneStep({ ...st, evaluated }),
    { id: 'detail', anchor: 'detail', title: 'Two levels of detail', action: { id: 'toggle-detail', label: st.detail === 'simple' ? 'Show Detailed' : 'Show Simple' },
      text: 'Simple speaks plain language. Detailed shows the full telemetry: angles, horizon and power. Same simulation, same verdict.' },
    { id: 'rail', anchor: 'rail', title: 'Where to go next',
      text: 'Compare ranks two to five site and date options. Missions replays real landings. History keeps the runs you save. Press F for full screen and ? for help at any time.' },
  ]
  return steps.filter((s): s is TourStep => s !== null)
}

/** `?tour=0` suprime el autoarranque; `?tour=1` lo fuerza. Cualquier otro valor se ignora. */
export function tourParam(search: string): '0' | '1' | null {
  const v = new URLSearchParams(search).get('tour')
  return v === '0' || v === '1' ? v : null
}

/**
 * ¿Se abre solo al cargar, y en qué paso? Primera visita: en la invitación (0). `?tour=1`: como un relanzamiento,
 * desde el paso 2 (1), sea cual sea el estado. `?tour=0` nunca, sin tocar `localStorage` (design.md §1.2).
 */
export function autoStart(status: TourStatus, param: '0' | '1' | null): number | null {
  if (param === '0') return null
  if (param === '1') return 1
  return status === 'unseen' ? 0 : null
}

/** Paso en que empieza el tour relanzado desde Help: la invitación sobra. */
export const RELAUNCH_STEP = 1

export interface OnboardingPersisted { tour: { status: TourStatus; at: string | null } }

const STATUSES: TourStatus[] = ['unseen', 'dismissed', 'completed']

/** Normaliza lo guardado de cualquier versión anterior (o sin `version`) al formato 1. Lo que no se entiende vuelve a `unseen`. */
export function migrateOnboarding(persisted: unknown): OnboardingPersisted {
  const t = (persisted as { tour?: { status?: unknown; at?: unknown } } | null)?.tour
  const status = STATUSES.includes(t?.status as TourStatus) ? (t!.status as TourStatus) : 'unseen'
  return { tour: { status, at: status !== 'unseen' && typeof t?.at === 'string' ? t.at : null } }
}
