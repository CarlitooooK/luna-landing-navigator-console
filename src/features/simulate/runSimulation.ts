// "Run simulation" de Simulate y el replay de Missions: evalúan y, con el globo listo, bajan a Horizon view al
// llegar el resultado (decisión del usuario del 2026-11-15). History y Compare evalúan sin esto: llevan al sitio.
import { GLOBE_URL } from '@/core/config'
import { useGlobeStore } from '@/core/store/useGlobeStore'
import { useMissionStore } from '@/core/store/useMissionStore'

export async function runSimulation() {
  const globe = useGlobeStore.getState()
  // El puente consume la intención al llegar la evaluación; si la corrida falla, se desarma aquí
  globe.armHorizon(!!GLOBE_URL && globe.link === 'ready')
  try {
    await useMissionStore.getState().evaluate()
  } finally {
    useGlobeStore.getState().armHorizon(false)
  }
}
