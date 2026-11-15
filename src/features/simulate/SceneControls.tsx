import { Clapperboard, Globe2, Grid3x3, Layers, LocateFixed, LogOut, Moon, Mountain, Sunrise, User } from 'lucide-react'
import { GLOBE_URL } from '@/core/config'
import { useMissionStore } from '@/core/store/useMissionStore'
import { useGlobeStore } from '@/core/store/useGlobeStore'
import type { HorizonPhase, ScenePhase } from '@/features/viewport3d/globeProtocol'
import { Pill } from '@/ui'
import { tipOf } from '@/features/help/glossary'
import { useSiteViewStore } from '@/features/viewport3d/useSiteViewStore'
import { SLOPE_HIGH, SLOPE_LOW, terrainLegend } from '@/features/viewport3d/terrainLook'

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

const rgb = (c: number[]) => `rgb(${c.map((x) => Math.round(x * 255)).join(',')})`

/** Controles y leyenda de "Terrain detail": la escala de color es la pendiente de este parche, tal como la da el backend. */
function SiteControls() {
  const backToGlobe = useMissionStore((s) => s.backToGlobe)
  const terrain = useMissionStore((s) => s.terrain)
  const exaggeration = useSiteViewStore((s) => s.exaggeration)
  const cycle = useSiteViewStore((s) => s.cycleExaggeration)
  const legend = terrain ? terrainLegend(terrain) : null
  const sunHidden = useMissionStore((s) => { const t = s.evaluation?.timeline[s.stepIndex]; return !!t && !t.sun_visible })
  return (
    <>
      <Pill onClick={backToGlobe} aria-label="Back to the globe" tip={tipOf('close-terrain', GLOBE_URL ? 'Back to globe' : 'Global view')}>
        <Globe2 size={14} aria-hidden />{GLOBE_URL ? 'Back to globe' : 'Global view'}
      </Pill>
      <Pill onClick={cycle} aria-label={`Vertical exaggeration ×${exaggeration}. Press to change`} tip={tipOf('vertical')}>
        <Mountain size={14} aria-hidden />Vertical ×{exaggeration}
      </Pill>
      {sunHidden && (
        <Pill className="pointer-events-none" aria-live="polite">The Sun is below the local horizon · ground brightened so the relief is visible</Pill>
      )}
      {legend && (
        <Pill className="pointer-events-none" aria-label={`Slope colour scale, 0 to ${legend.maxSlopeDeg.toFixed(1)} degrees`}>
          <span>Slope</span>
          <span className="tnum font-mono">0°</span>
          <span aria-hidden className="h-1.5 w-16 rounded-full" style={{ background: `linear-gradient(90deg, ${rgb(SLOPE_LOW)}, ${rgb(SLOPE_HIGH)})` }} />
          <span className="tnum font-mono">{legend.maxSlopeDeg.toFixed(1)}°</span>
          <span className="text-ink-3">· {legend.source}{legend.nativeM ? ` ${Math.round(legend.nativeM)} m` : ''} · {legend.sizeKm} km</span>
        </Pill>
      )}
    </>
  )
}

/**
 * Controles del globo en sí, con o sin simulación: recentrar (vista global sin perder el sitio, y la cámara gira
 * sola) y las capas opcionales. Las capas solo en órbita: a ras de suelo la rejilla y el color no aportan.
 */
function MapControls({ orbit }: { orbit: boolean }) {
  const recenter = useGlobeStore((s) => s.recenter)
  const layers = useGlobeStore((s) => s.layers)
  const toggle = useGlobeStore((s) => s.toggleLayer)
  return (
    <>
      <Pill onClick={recenter} aria-label="Recenter: back to the whole Moon, keeping the selected site" tip={tipOf('recenter')}>
        <LocateFixed size={14} aria-hidden />Recenter
      </Pill>
      {orbit && <>
        <Pill onClick={() => toggle('grid')} aria-pressed={layers.grid} tip={tipOf('map-grid')}
          aria-label={`Latitude and longitude grid: ${layers.grid ? 'on' : 'off'}`}>
          <Grid3x3 size={14} aria-hidden />Grid {layers.grid ? 'on' : 'off'}
        </Pill>
        <Pill onClick={() => toggle('elevation')} aria-pressed={layers.elevation} tip={tipOf('map-elevation')}
          aria-label={`Elevation colour map: ${layers.elevation ? 'on' : 'off'}`}>
          <Layers size={14} aria-hidden />Elevation {layers.elevation ? 'on' : 'off'}
        </Pill>
      </>}
    </>
  )
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
  const showSite = useMissionStore((s) => s.showSite)
  const landing = useGlobeStore((s) => s.landing)
  const link = useGlobeStore((s) => s.link)
  const requestLanding = useGlobeStore((s) => s.requestLanding)
  const clearLanding = useGlobeStore((s) => s.clearLanding)
  const astronaut = useGlobeStore((s) => s.astronaut)
  const setAstronaut = useGlobeStore((s) => s.setAstronaut)
  const showPsr = useGlobeStore((s) => s.showPsr)
  const togglePsr = useGlobeStore((s) => s.togglePsr)
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
        <Pill onClick={clearLanding} aria-label="Exit the landing scene" tip={tipOf('exit-scene')}><LogOut size={14} aria-hidden />Exit scene</Pill>
      </>
    )
  }

  // Escena local del parche encima del globo
  if (viewMode === 'site') return <SiteControls />

  const psrPill = globeReady && (
    <Pill onClick={togglePsr} aria-pressed={showPsr} aria-label={`Permanently shadowed regions: ${showPsr ? 'shown' : 'hidden'}`} tip={tipOf('psr-layer')}>
      <Moon size={14} aria-hidden />Shadowed regions {showPsr ? 'on' : 'off'}
    </Pill>
  )
  if (!hasEvaluation) return (
    <>
      {globeReady && <MapControls orbit />}
      {psrPill}
      {landing.error && <Pill className="pointer-events-none" aria-live="polite">{landing.error}</Pill>}
    </>
  )
  return (
    <>
      {globeReady && <MapControls orbit={!horizon.requested} />}
      {/* Vista de horizonte: el Sol y la Tierra del timeline contra la silueta real del terreno (docs/05 §5.2) */}
      {globeReady && !horizon.requested && (
        <Pill onClick={requestHorizon} aria-label="See the Sun and Earth over the local horizon" tip={tipOf('horizon-view')}>
          <Sunrise size={14} aria-hidden />Horizon view
        </Pill>
      )}
      {globeReady && horizon.requested && (
        <>
          <Pill aria-live="polite" className="pointer-events-none"><Sunrise size={14} aria-hidden />{HORIZON_TEXT[horizon.phase ?? 'arrival']}</Pill>
          <Pill onClick={clearHorizon} aria-label="Back to the globe" tip={tipOf('back-to-globe')}><Globe2 size={14} aria-hidden />Back to globe</Pill>
        </>
      )}
      {globeReady && (
        <Pill onClick={requestLanding} aria-label="Watch an illustrative landing at this site" tip={tipOf('landing-scene')}>
          <Clapperboard size={14} aria-hidden />Landing scene
        </Pill>
      )}
      {psrPill}
      {globeReady && (
        <Pill onClick={() => setAstronaut(!astronaut)} aria-pressed={astronaut} tip={tipOf('astronaut')} aria-label={`Astronaut in the landing scene: ${astronaut ? 'on' : 'off'}`}>
          <User size={14} aria-hidden />Astronaut {astronaut ? 'on' : 'off'}
        </Pill>
      )}
      {hasTerrain && (
        <Pill onClick={showSite} aria-label="Open the local terrain around this site" tip={tipOf('terrain-detail')}>
          <Mountain size={14} aria-hidden />Terrain detail
        </Pill>
      )}
      {landing.error && <Pill className="pointer-events-none" aria-live="polite">{landing.error}</Pill>}
    </>
  )
}
