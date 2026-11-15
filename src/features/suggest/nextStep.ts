// La "próxima acción" de cada estado (spec de onboarding, design.md §3, tarea C1).
// Funciones puras: reciben un estado mínimo y devuelven la frase y la acción. No tocan el store;
// la interfaz traduce cada `ActionId` a lo que hace (C2–C5). Se decide por estado, `code` y `level`, nunca por números.

export type ActionId =
  | 'retry-init' | 'focus-search' | 'go-missions' | 'run-again' | 'compare-dates' | 'save' | 'change-site'
  | 'compare-sites' | 'shorten-mission' | 'try-again' | 'change-date' | 'fix-coordinates' | 'review-setup'
  | 'add-current' | 'add-plus-7' | 'open-in-simulate' | 'focus-scenario-site' | 'compare-again'
  | 'start-simulation' | 'open-as-simulation'

export interface Action { id: ActionId; label: string }
export type Tone = 'go' | 'caution' | 'nogo' | 'ink'

export interface NextStep {
  /** Identificador estable del caso, para pruebas y para el anuncio aria-live. */
  id: string
  text: string
  tone: Tone
  action?: Action
  secondary?: Action
  /** Código de error a la vista para soporte (solo errores desconocidos). */
  code?: string
}

type Level = 'ok' | 'caution' | 'nogo'
export interface CheckLite { code: string; level: Level }

const A = (id: ActionId, label: string): Action => ({ id, label })
const day = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

// ---------- Simulate (§3.2, §3.3, §3.5) ----------

export interface SimulateState {
  /** /health no respondió y el error es de red: el servidor no está. */
  offline: boolean
  loading: boolean
  site: string | null
  startUtc: string
  durationDays: number
  /** Código de error de la última evaluación (con el servidor en línea). */
  error: string | null
  /** Hay resultados, pero de otros parámetros (`isStale`). */
  stale: boolean
  verdict: { status: string; checks: CheckLite[] | null } | null
}

/** Orden a igual gravedad (§3.3): la pendiente no cambia con la fecha, así que va primero. */
const FAMILY_ORDER = ['SLOPE', 'SUN', 'DTE'] as const
const family = (code: string) => FAMILY_ORDER.find((f) => code.startsWith(`${f}_`))

/** El check que manda: el más grave, y a igual nivel pendiente, después Sol, después Tierra. */
export function worstCheck(checks: CheckLite[]): CheckLite | null {
  const bad = checks.filter((c) => c.level !== 'ok' && family(c.code))
  if (bad.length === 0) return null
  const sev = (c: CheckLite) => (c.level === 'nogo' ? 0 : 1)
  const fam = (c: CheckLite) => FAMILY_ORDER.indexOf(family(c.code)!)
  return [...bad].sort((a, b) => sev(a) - sev(b) || fam(a) - fam(b))[0]
}

const ERROR_STEP: Record<string, Omit<NextStep, 'id' | 'tone'>> = {
  ERR_NETWORK: { text: 'The simulation server did not answer.', action: A('try-again', 'Try again') },
  ERR_UPSTREAM_SERVICE: { text: 'The ephemeris service did not answer. This usually clears in a moment.', action: A('try-again', 'Try again') },
  ERR_TERRAIN_UNAVAILABLE: { text: 'There is no terrain data for this spot.', action: A('change-site', 'Change site') },
  ERR_DATE_OUT_OF_RANGE: { text: 'That date is outside the supported range, 1900 to 2050.', action: A('change-date', 'Change date') },
  ERR_INVALID_COORDINATES: { text: 'Those coordinates are outside the Moon: latitude −90 to 90, longitude −180 to 360.', action: A('fix-coordinates', 'Fix coordinates') },
  ERR_INVALID_PAYLOAD: { text: 'Some inputs are not valid. Review the setup and run again.', action: A('review-setup', 'Review setup') },
}

export function nextStepSimulate(s: SimulateState): NextStep | null {
  if (s.offline) return { id: 'offline', tone: 'nogo', text: 'The simulation server is unreachable. Sites and simulations are paused; it retries every 20 seconds.', action: A('retry-init', 'Retry now') }
  if (s.loading) return null // el esqueleto ya dice que está calculando
  if (s.error) {
    const e = ERROR_STEP[s.error]
    return e ? { id: `error:${s.error}`, tone: 'nogo', ...e }
      : { id: 'error:unknown', tone: 'nogo', text: 'The console could not reach this feature on the server.', action: A('try-again', 'Try again'), code: s.error }
  }
  if (!s.site) return { id: 'no-site', tone: 'ink', text: 'Pick a landing site to begin: search the catalog or click the globe.', action: A('focus-search', 'Browse sites'), secondary: A('go-missions', 'Replay a real mission') }
  if (!s.verdict) return { id: 'ready', tone: 'ink', text: `Ready: ${s.site}, ${day(s.startUtc)}, ${s.durationDays} days. Run the simulation to see the verdict.` }
  if (s.stale) return { id: 'stale', tone: 'caution', text: 'The setup changed since the last run. Run the simulation again to update the results.', action: A('run-again', 'Run again') }
  if (s.verdict.status === 'GO') return { id: 'go', tone: 'go', text: 'A good window. Save it, or check whether a launch slip would cost you.', action: A('compare-dates', 'Compare dates'), secondary: A('save', 'Save to history') }
  const tone: Tone = s.verdict.status === 'NO-GO' ? 'nogo' : 'caution'
  const worst = s.verdict.checks ? worstCheck(s.verdict.checks) : null
  if (worst) {
    switch (family(worst.code)) {
      case 'SLOPE': return { id: 'check:slope', tone, text: 'The slope belongs to the place, not the date. Try a nearby site.', action: A('change-site', 'Change site'), secondary: A('compare-sites', 'Compare sites') }
      case 'SUN': return { id: 'check:sun', tone, text: 'Sunlight here depends on the date. See how other landing dates compare.', action: A('compare-dates', 'Compare dates'), secondary: A('shorten-mission', 'Shorten the mission') }
      case 'DTE': return worst.code === 'DTE_NONE'
        ? { id: 'check:dte-none', tone, text: 'Earth is never in view from here. A mission at this site needs a relay satellite, or a different site.', action: A('compare-sites', 'Compare sites') }
        : { id: 'check:dte-reduced', tone, text: 'Earth is in view only part of the time. See how other dates compare, or plan around the gaps on the timeline.', action: A('compare-dates', 'Compare dates') }
    }
  }
  return tone === 'caution'
    ? { id: 'caution', tone, text: 'One condition is marginal. See how other dates compare.', action: A('compare-dates', 'Compare dates'), secondary: A('change-site', 'Change site') }
    : { id: 'nogo', tone, text: 'One condition fails. See how other dates compare, or try another site.', action: A('compare-dates', 'Compare dates'), secondary: A('change-site', 'Change site') }
}

// ---------- Compare, History y Missions (§3.6) ----------

export interface CompareState {
  count: number
  hasSite: boolean
  comparing: boolean
  error: string | null
  /** Primer escenario del ranking, si ya se comparó. */
  best: { letter: string; site: string; startUtc: string; status: string } | null
}

export function nextStepCompare(s: CompareState): NextStep | null {
  if (s.comparing) return null
  if (s.error) return { id: 'compare:error', tone: 'nogo', text: 'Comparison failed.', action: A('compare-again', 'Try again'), code: s.error }
  if (s.best) {
    return s.best.status === 'NO-GO'
      ? { id: 'compare:least-bad', tone: 'nogo', text: `None of these options passes. The least bad is ${s.best.letter}. Add other dates or sites.`, action: A('focus-scenario-site', 'Add a scenario') }
      : { id: 'compare:best', tone: s.best.status === 'GO' ? 'go' : 'caution', text: `${s.best.letter}: ${s.best.site}, ${day(s.best.startUtc)} ranks first.`, action: A('open-in-simulate', 'Open in Simulate') }
  }
  if (s.count === 0) return { id: 'compare:empty', tone: 'ink', text: 'Compare ranks two to five options. Add a site and a date to start.', ...(s.hasSite ? { action: A('add-current', 'Add the current simulation') } : {}) }
  if (s.count === 1) return { id: 'compare:one', tone: 'ink', text: 'Add one more. The same site a week later shows the cost of a launch slip.', action: A('add-plus-7', 'Add +7 days') }
  return null // con 2 o más, "Compare scenarios" ya es la tecla luminosa
}

export function nextStepHistory(s: { runs: number; picked: boolean }): NextStep | null {
  if (s.runs === 0) return { id: 'history:empty', tone: 'ink', text: 'Save a run from Simulate to keep it here.', action: A('start-simulation', 'Start a simulation') }
  if (!s.picked) return { id: 'history:pick', tone: 'ink', text: 'Pick a run to see its summary.' }
  return null
}

export function nextStepMissions(s: { picked: boolean; replayed: boolean }): NextStep | null {
  if (s.picked && s.replayed) return { id: 'missions:replayed', tone: 'ink', text: 'Watch it on the timeline, or keep exploring from this landing.', action: A('open-as-simulation', 'Open as a new simulation') }
  return null
}

/**
 * ¿La acción de Next step es la tecla luminosa de Simulate? (design.md §3.1: una sola por pantalla.)
 * Sí con resultados vigentes o con un error que la acción resuelve; si no, la luminosa es "Run simulation".
 */
export const stepIsPrimary = (s: { hasAction: boolean; fresh: boolean; hasError: boolean }) => s.hasAction && (s.fresh || s.hasError)
