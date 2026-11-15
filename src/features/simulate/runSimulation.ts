// "Run simulation" de Simulate y el replay de Missions: evalúan y, con el globo listo, bajan a Horizon view al
// llegar el resultado (decisión del usuario del 2026-11-15). History y Compare evalúan sin esto: llevan al sitio.
// La corrida que responde se guarda en History (pedido del usuario del 2026-11-15); el tour pasa `history: false`.
import { GLOBE_URL } from '@/core/config'
import { useGlobeStore } from '@/core/store/useGlobeStore'
import { useHistoryStore } from '@/core/store/useHistoryStore'
import { useMissionStore } from '@/core/store/useMissionStore'

export async function runSimulation({ history = true }: { history?: boolean } = {}) {
  const globe = useGlobeStore.getState()
  // El puente consume la intención al llegar la evaluación; si la corrida falla, se desarma aquí
  globe.armHorizon(!!GLOBE_URL && globe.link === 'ready')
  try {
    await useMissionStore.getState().evaluate()
  } finally {
    useGlobeStore.getState().armHorizon(false)
  }
  const { error, evaluation, evaluatedFor, selected } = useMissionStore.getState()
  // `evaluatedFor` son los parámetros con que se pidió `evaluation`: se guarda eso, no lo que tenga Setup ahora
  if (!history || error || !evaluation || !evaluatedFor || !selected) return
  const { startUtc, durationDays, stepMinutes, panelAreaM2, panelEfficiency, lat, lon, label } = evaluatedFor
  // Si el sitio cambió mientras calculaba, se guarda el de la corrida
  const site = selected.lat === lat && selected.lon === lon ? selected : { lat, lon, label }
  useHistoryStore.getState().save({ site, startUtc, durationDays, stepMinutes, panelAreaM2, panelEfficiency, evaluation })
}
