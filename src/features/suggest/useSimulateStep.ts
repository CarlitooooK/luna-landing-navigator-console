import { useMissionStore } from '@/core/store/useMissionStore'
import { isStale } from '@/core/utils/stale'
import { nextStepSimulate, stepIsPrimary, type NextStep } from './nextStep'

/**
 * La próxima acción de Simulate con el estado del store (tarea C2), y si su acción toma la tecla luminosa:
 * hay una sola por pantalla. Antes de simular, o con resultados desactualizados, es "Run simulation".
 */
export function useSimulateStep(): { step: NextStep | null; primaryIsStep: boolean } {
  const s = useMissionStore()
  const offline = !s.health && s.error?.code === 'ERR_NETWORK'
  const stale = isStale({ lat: s.selected?.lat, lon: s.selected?.lon, startUtc: s.startUtc, durationDays: s.durationDays,
    stepMinutes: s.stepMinutes, panelAreaM2: s.panelAreaM2, panelEfficiency: s.panelEfficiency }, s.evaluatedFor)
  const step = nextStepSimulate({
    offline, loading: s.loading, site: s.selected?.label ?? null, startUtc: s.startUtc, durationDays: s.durationDays,
    error: !offline && s.error ? s.error.code : null, stale,
    verdict: s.evaluation ? { status: s.evaluation.site.status, checks: s.evaluation.site.checks ?? null } : null,
  })
  const fresh = !!s.evaluation && !stale && !s.error && !s.loading
  // Con un error (o sin conexión), la acción que lo resuelve es la luminosa y Run simulation baja a secundario.
  return { step, primaryIsStep: stepIsPrimary({ hasAction: !!step?.action, fresh, hasError: !!s.error }) }
}
