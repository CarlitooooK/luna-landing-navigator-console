import { useMissionStore } from '@/core/store/useMissionStore'
import { isSameRun, useHistoryStore } from '@/core/store/useHistoryStore'
import { isStale } from '@/core/utils/stale'

/**
 * Estrella de la corrida que está en pantalla. Lo usan el botón junto a "Run simulation" y la acción "Star this run"
 * de Next step. La corrida ya está en History (`runSimulation` la guarda sola); antes este botón la guardaba (tarea A7).
 * Con Results desactualizado no se marca, para no marcar otros parámetros.
 */
export function useStarRun() {
  const { selected, evaluation, startUtc, durationDays, stepMinutes, panelAreaM2, panelEfficiency, evaluatedFor } = useMissionStore()
  const runs = useHistoryStore((s) => s.runs)
  const toggleStar = useHistoryStore((s) => s.toggleStar)
  const stale = isStale({ lat: selected?.lat, lon: selected?.lon, startUtc, durationDays, stepMinutes, panelAreaM2, panelEfficiency }, evaluatedFor)
  const run = evaluation && evaluatedFor && !stale
    ? runs.find((r) => isSameRun({ site: { lat: evaluatedFor.lat, lon: evaluatedFor.lon, label: evaluatedFor.label }, startUtc: evaluatedFor.startUtc,
      durationDays: evaluatedFor.durationDays, stepMinutes: evaluatedFor.stepMinutes, panelAreaM2: evaluatedFor.panelAreaM2, panelEfficiency: evaluatedFor.panelEfficiency }, r))
    : undefined
  const star = () => { if (run) toggleStar(run.id) }
  return { canStar: !!run, starred: !!run?.starred, stale, star }
}
