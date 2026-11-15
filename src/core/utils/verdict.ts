// El porqué del veredicto (spec de onboarding, design.md §2.7, tarea B5).
// Con contrato v1.2 o superior el servidor manda site.checks (código, nivel y mensaje en inglés): es lo que se muestra.
// Sin checks (v1.1) quedan site.reasons, en español: se muestran tal cual, rotuladas, sin traducir ni reinterpretar.
import type { Evaluation } from '@/types'

type Site = Pick<Evaluation['site'], 'reasons' | 'checks'>
export type Check = NonNullable<Site['checks']>[number]
export type Level = Check['level']

const SEVERITY: Record<Level, number> = { nogo: 0, caution: 1, ok: 2 }

export type VerdictReasons =
  | { source: 'checks'; items: Check[] }
  | { source: 'reasons'; items: string[]; lang: 'es' }

/** Checks del más grave al menos grave (estable: a igual nivel conserva el orden del servidor); o las razones en español. */
export function verdictReasons(site: Site): VerdictReasons {
  if (Array.isArray(site.checks) && site.checks.length > 0) {
    return { source: 'checks', items: [...site.checks].sort((a, b) => SEVERITY[a.level] - SEVERITY[b.level]) }
  }
  return { source: 'reasons', items: site.reasons ?? [], lang: 'es' }
}
