// Qué decir del próximo ocaso del Sol o de la Tierra (spec de onboarding, design.md §3.4).
// El backend manda hours_to_next_* en null en tres casos distintos (P-012): el astro está visible
// toda la ventana, nunca se ve, o empieza oculto y sale después. Aquí solo se LEE lo que manda el
// backend (resumen y timeline); no se calcula física.
import type { Evaluation, TimelinePoint } from '@/types'

export type Body = 'sun' | 'earth'

export type Countdown =
  | { kind: 'until-set'; hours: number } // visible ahora; se oculta en `hours`
  | { kind: 'until-rise'; hours: number } // oculto ahora; aparece en `hours`
  | { kind: 'rises-later' } // oculto al inicio, sin timeline para saber cuándo sale (Compare)
  | { kind: 'never' } // no se ve en toda la ventana
  | { kind: 'always' } // visible toda la ventana

type Summary = Pick<Evaluation['summary'], 'sun_visible_pct' | 'earth_visible_pct' | 'hours_to_next_sunset' | 'hours_to_next_earthset'>
type Point = Pick<TimelinePoint, 'timestamp_utc' | 'sun_visible' | 'earth_visible'>

const pctOf = (s: Summary, b: Body) => (b === 'sun' ? s.sun_visible_pct : s.earth_visible_pct)
const setOf = (s: Summary, b: Body) => (b === 'sun' ? s.hours_to_next_sunset : s.hours_to_next_earthset)
const visibleAt = (p: Point, b: Body) => (b === 'sun' ? p.sun_visible : p.earth_visible)
const hoursBetween = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 3_600_000

/** Solo con el resumen (Compare no pide timeline). */
export function countdownFromSummary(s: Summary, b: Body): Countdown {
  const pct = pctOf(s, b), set = setOf(s, b)
  if (pct <= 0) return { kind: 'never' }
  if (set != null) return { kind: 'until-set', hours: set }
  // null con un porcentaje entre 0 y 100 solo puede ser un astro que empezó oculto (P-012).
  return pct >= 100 ? { kind: 'always' } : { kind: 'rises-later' }
}

/** Con el timeline: distingue "empieza oculto" y da las horas hasta que aparece. */
export function countdown(s: Summary, timeline: readonly Point[], b: Body): Countdown {
  if (pctOf(s, b) <= 0) return { kind: 'never' }
  const first = timeline[0]
  if (!first) return countdownFromSummary(s, b)
  if (!visibleAt(first, b)) {
    const rise = timeline.find((p) => visibleAt(p, b))
    return rise ? { kind: 'until-rise', hours: hoursBetween(first.timestamp_utc, rise.timestamp_utc) } : { kind: 'never' }
  }
  const set = setOf(s, b)
  return set != null ? { kind: 'until-set', hours: set } : { kind: 'always' }
}

/** Celda corta de "First sunset" / "First Earthset" en Compare y History, que solo tienen el resumen (design.md §4.4). */
export function setCell(s: Summary, b: Body): string {
  const c = countdownFromSummary(s, b)
  switch (c.kind) {
    case 'until-set': return `${Math.round(c.hours)} h`
    case 'never': return b === 'sun' ? 'No sunlight' : 'Never in view'
    case 'always': return 'Never sets'
    case 'rises-later': return 'Rises later'
    case 'until-rise': return `Rises in ${Math.round(c.hours)} h`
  }
}

/** Horas en lenguaje llano: menos de un día en horas, si no en días ("In 3 days"). */
const inPlain = (h: number) => {
  if (h < 23.5) return `${Math.max(1, Math.round(h))} h`
  const d = Math.round(h / 24)
  return `${d} day${d === 1 ? '' : 's'}`
}

/** La misma celda de `setCell` para Compare en Simple: días en vez de horas y frases completas. */
export function setCellPlain(s: Summary, b: Body): string {
  const c = countdownFromSummary(s, b)
  switch (c.kind) {
    case 'until-set': return `In ${inPlain(c.hours)}`
    case 'never': return b === 'sun' ? 'No sunlight' : 'Never in view'
    case 'always': return b === 'sun' ? 'No sunset in this window' : 'Stays in view'
    case 'rises-later': return 'Rises later'
    case 'until-rise': return `Rises in ${inPlain(c.hours)}`
  }
}
