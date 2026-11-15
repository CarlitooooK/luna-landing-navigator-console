// Escenarios que agregan "Compare dates" y "Add +7 days" (spec de onboarding, design.md §3.3 y §3.6, tarea C3).
// Los desplazamientos son una elección de exploración (D5: +7 y +14 días), no una regla física:
// quien dice qué fecha es mejor es el backend, con /compare.

const DAY_MS = 86_400_000
const MIN_YEAR = 1900, MAX_YEAR = 2050 // rango de fechas del contrato

/** Fecha `startUtc` desplazada `days` días, en el formato del contrato; `null` si cae fuera de 1900–2050. */
export function shiftDays(startUtc: string, days: number): string | null {
  const d = new Date(Date.parse(startUtc) + days * DAY_MS)
  const y = d.getUTCFullYear()
  if (Number.isNaN(y) || y < MIN_YEAR || y > MAX_YEAR) return null
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

/**
 * Fechas que forman "Compare dates": la actual y las desplazadas, en orden, sin las que caen fuera de rango
 * ni las que ya están (`taken`), y sin pasar de `room` escenarios libres.
 */
export function dateVariants(startUtc: string, offsets: readonly number[], taken: readonly string[], room: number): string[] {
  const out: string[] = []
  for (const off of [0, ...offsets]) {
    const d = off === 0 ? startUtc : shiftDays(startUtc, off)
    if (d && !taken.includes(d) && !out.includes(d)) out.push(d)
  }
  return out.slice(0, Math.max(0, room))
}

/** Horario de los escenarios de Compare: siempre 00:00 UTC (docs/05). */
export const atMidnight = (startUtc: string) => `${startUtc.slice(0, 10)}T00:00:00Z`
