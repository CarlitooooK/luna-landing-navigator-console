import { Clapperboard, Globe2, LogOut, Mountain, Sunrise } from 'lucide-react'
import { GLOBE_URL } from '@/core/config'
import { useMissionStore } from '@/core/store/useMissionStore'
import { useGlobeStore } from '@/core/store/useGlobeStore'
import type { HorizonPhase, ScenePhase } from '@/features/viewport3d/globeProtocol'
import { Pill } from '@/ui'

const PHASE_TEXT: Record<ScenePhase, string> = {
  arrival: 'Flying to the site…',
  descent: 'Illustrative descent',
  landed: 'Touchdown',
  done: 'Drag to look around',
}

const HORIZON_TEXT: Record<HorizonPhase, string> = {
  arrival: 'Flying down to the horizon…',
  ready: 'Drag to look around · scrub the timeline',
  leaving: 'Back to orbit…',
}

/**
 * Controles discretos sobre el render (docs/11 §6a). La simulación vive en el globo: la escena de
 * alunizaje parte de la vista actual sin cambiar de motor. "Terrain detail" abre la escena local del
 * parche de `/terrain/patch` encima del globo, sin desmontarlo.
 */
export function SceneControls() {
  const viewMode = useMissionStore((s) => s.viewMode)
  const hasEvaluation = useMissionStore((s) => s.evaluation !== null)
  const hasTerrain = useMissionStore((s) => s.terrain !== null)
  const backToGlobe = useMissionStore((s) => s.backToGlobe)
  const showSite = useMissionStore((s) => s.showSite)
  const landing = useGlobeStore((s) => s.landing)
  const link = useGlobeStore((s) => s.link)
  const requestLanding = useGlobeStore((s) => s.requestLanding)
  const clearLanding = useGlobeStore((s) => s.clearLanding)
  const horizon = useGlobeStore((s) => s.horizon)
  const requestHorizon = useGlobeStore((s) => s.requestHorizon)
  const clearHorizon = useGlobeStore((s) => s.clearHorizon)
  const globeReady = !!GLOBE_URL && link === 'ready'

  // Escena de alunizaje en curso (en el globo)
  if (viewMode === 'globe' && landing.requested) {
    const telemetry = landing.phase === 'descent' && landing.altM !== null && landing.vMps !== null
    return (
      <>
        <Pill aria-live="polite" className="pointer-events-none">
          <Clapperboard size={14} aria-hidden />
          {link === 'unavailable' ? 'The globe is not available' : landing.phase ? PHASE_TEXT[landing.phase] : 'Starting…'}
          {/* La curva de descenso no es física: lo dice el rótulo de la fase */}
          {telemetry && <span className="tnum font-mono">· altitude {Math.round(landing.altM!)} m · speed {Math.round(landing.vMps!)} m/s</span>}
        </Pill>
        <Pill onClick={clearLanding} aria-label="Exit the landing scene"><LogOut size={14} aria-hidden />Exit scene</Pill>
      </>
    )
  }

  // Escena local del parche encima del globo
  if (viewMode === 'site') {
    return (
      <Pill onClick={backToGlobe} aria-label="Back to the globe">
        <Globe2 size={14} aria-hidden />{GLOBE_URL ? 'Back to globe' : 'Global view'}
      </Pill>
    )
  }

  if (!hasEvaluation) return landing.error ? <Pill className="pointer-events-none" aria-live="polite">{landing.error}</Pill> : null
  return (
    <>
      {/* Vista de horizonte: el Sol y la Tierra del timeline contra la silueta real del terreno (docs/05 §5.2) */}
      {globeReady && !horizon.requested && (
        <Pill onClick={requestHorizon} aria-label="See the Sun and Earth over the local horizon">
          <Sunrise size={14} aria-hidden />Horizon view
        </Pill>
      )}
      {globeReady && horizon.requested && (
        <>
          <Pill aria-live="polite" className="pointer-events-none"><Sunrise size={14} aria-hidden />{HORIZON_TEXT[horizon.phase ?? 'arrival']}</Pill>
          <Pill onClick={clearHorizon} aria-label="Back to the globe"><Globe2 size={14} aria-hidden />Back to globe</Pill>
        </>
      )}
      {globeReady && (
        <Pill onClick={requestLanding} aria-label="Watch an illustrative landing at this site">
          <Clapperboard size={14} aria-hidden />Landing scene
        </Pill>
      )}
      {hasTerrain && (
        <Pill onClick={showSite} aria-label="Open the local terrain around this site">
          <Mountain size={14} aria-hidden />Terrain detail
        </Pill>
      )}
      {landing.error && <Pill className="pointer-events-none" aria-live="polite">{landing.error}</Pill>}
    </>
  )
}
