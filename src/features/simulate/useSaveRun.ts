import { useEffect, useState } from 'react'
import { useMissionStore } from '@/core/store/useMissionStore'
import { useHistoryStore } from '@/core/store/useHistoryStore'
import { isStale } from '@/core/utils/stale'

/**
 * Guardar en History la corrida que está en pantalla (tarea A7). Lo usan el bookmark de Setup y la acción
 * "Save to history" de Next step. Con Results desactualizado no se guarda, para no mezclar parámetros.
 */
export function useSaveRun() {
  const { selected, evaluation, startUtc, durationDays, stepMinutes, panelAreaM2, panelEfficiency, evaluatedFor } = useMissionStore()
  const saveRun = useHistoryStore((s) => s.save)
  const [saved, setSaved] = useState<'saved' | 'duplicate' | null>(null)
  useEffect(() => { if (!saved) return; const t = setTimeout(() => setSaved(null), 2500); return () => clearTimeout(t) }, [saved])
  const stale = isStale({ lat: selected?.lat, lon: selected?.lon, startUtc, durationDays, stepMinutes, panelAreaM2, panelEfficiency }, evaluatedFor)
  const canSave = !!evaluation && !!selected && !stale
  const save = () => {
    if (!evaluation || !selected || stale) return
    setSaved(saveRun({ site: selected, startUtc, durationDays, stepMinutes, panelAreaM2, panelEfficiency, evaluation }) ? 'saved' : 'duplicate')
  }
  const message = saved === 'saved' ? 'Saved to history.' : saved === 'duplicate' ? 'Already in history.' : ''
  return { canSave, stale, saved, save, message }
}
