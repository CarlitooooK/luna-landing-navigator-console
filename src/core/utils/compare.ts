// Orden de escenarios para la recomendación. Es presentación sobre los resúmenes de /compare:
// el veredicto de cada escenario lo decide el backend; aquí solo se ordena.
import type { CompareResponse } from '@/types'

export type Priority = 'balanced' | 'power' | 'earth'
type Result = CompareResponse['results'][number]

const STATUS_RANK: Record<string, number> = { GO: 0, CAUTION: 1, 'NO-GO': 2 }

/** Puntaje dentro del mismo veredicto: lo que ordena "Rank by". Detailed lo muestra junto a "Recommended". */
export function score(r: Result, priority: Priority): number {
  const s = r.summary
  if (priority === 'power') return s.sun_visible_pct
  if (priority === 'earth') return s.earth_visible_pct
  return s.sun_visible_pct + s.earth_visible_pct
}

export function rank(results: Result[], priority: Priority): Result[] {
  return [...results].sort((a, b) =>
    (STATUS_RANK[a.site.status] ?? 3) - (STATUS_RANK[b.site.status] ?? 3) || score(b, priority) - score(a, priority))
}

/** Índice del mejor valor de una métrica (mayor es mejor). Empates: ninguno destacado. */
export function bestIndex(values: number[]): number | null {
  const max = Math.max(...values)
  const hits = values.filter((v) => v === max).length
  return hits === 1 ? values.indexOf(max) : null
}
