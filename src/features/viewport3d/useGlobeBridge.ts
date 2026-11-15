import { useEffect, type RefObject } from 'react'
import { GLOBE_URL } from '@/core/config'
import { useMissionStore } from '@/core/store/useMissionStore'
import { useGlobeStore } from '@/core/store/useGlobeStore'
import { READY_TIMEOUT_MS, comparePins, customPinMessage, fromGlobe, globalPsrItems, horizonMessage, landingMessage, psrItems, samePlace, skyGlobalMessage, skyMessages, skyStateMessage, toGlobeSites } from './globeBridge'
import type { ToGlobe } from './globeProtocol'

/**
 * Puente con el globo (docs/11 §3). Único archivo que habla con el iframe.
 * - El iframe no se desmonta al simular (SceneBackground): normalmente hay un solo READY. Si el globo
 *   se recarga, cada READY reenvía el estado completo.
 * - La simulación ocurre en el globo: al evaluar vuela al sitio y la escena de alunizaje parte de esa vista.
 * - Sol y Tierra siguen al scrubber (cero red, D-003), agrupados por fotograma. Sin evaluación, el cielo sale de
 *   `GET /ephemeris` (vista global); con una, de los vectores del sitio.
 * - Pines A–E de Compare solo en ese workspace; el lugar elegido que no es del catálogo lleva un marcador.
 * - Vista de horizonte (Lander POV, docs/05 §5.2): el globo baja de la esfera al suelo del sitio evaluado y
 *   muestra Sol y Tierra contra la silueta de `horizon_profile`. Se pide con `horizon.requested`.
 * - Si el globo no responde READY en 8 s, la consola sigue sin él (`link: 'unavailable'`).
 */
export function useGlobeBridge(frame: RefObject<HTMLIFrameElement | null>) {
  useEffect(() => {
    if (!GLOBE_URL) return
    const origin = new URL(GLOBE_URL).origin
    const globe = useGlobeStore.getState
    const mission = useMissionStore.getState
    let ready = false
    let raf = 0
    let pauseTimer = 0

    globe().setLink('loading')
    const timeout = window.setTimeout(() => { if (!ready) globe().setLink('unavailable') }, READY_TIMEOUT_MS)

    const post = (m: ToGlobe) => frame.current?.contentWindow?.postMessage(m, origin)
    const sendSky = () => {
      if (!mission().evaluation) {
        const g = skyGlobalMessage(mission().ephemeris)
        if (g) post(g)
        return
      }
      skyMessages(mission().evaluation, mission().stepIndex).forEach(post)
      const state = skyStateMessage(mission().evaluation, mission().stepIndex)
      if (state) post(state) // azimut, elevación y holgura para las etiquetas de la vista de horizonte
    }
    const sendMode = () => {
      post({ type: 'SET_HORIZON_DETAIL', payload: { detailed: mission().detail === 'detailed' } })
    }
    // Perfil, cielo del paso actual y luego el vuelo: el globo usa el cielo para encuadrar hacia el Sol
    const startHorizon = () => {
      const ev = mission().evaluation
      const profile = horizonMessage(ev)
      if (!ev || !profile) return
      post(profile)
      sendSky()
      post({ type: 'SHOW_HORIZON', payload: { lat: ev.site.lat, lon: ev.site.lon } })
    }
    // Las PSR del sitio evaluado (más detalle) reemplazan a las del polo; sin evaluación se ven las del polo
    const sendPsr = () => {
      const { psrs, polePsrs } = mission()
      const nearby = psrItems(psrs)
      const items = nearby.length ? nearby : globalPsrItems(polePsrs)
      post({ type: 'SET_PSR', payload: items })
    }
    const sendPins = () => {
      const m = mission()
      post({ type: 'SET_COMPARE_PINS', payload: m.workspace === 'compare' ? comparePins(m.scenarios, m.comparison, m.rankBy) : [] })
    }
    const sendCustomPin = () => post(customPinMessage(mission().selected, mission().sites))
    const sendSites = () => post({ type: 'SET_SITES', payload: toGlobeSites(mission().sites, mission().evaluation) })
    const startLanding = () => {
      const play = landingMessage(mission().evaluation, { astronaut: globe().astronaut })
      if (!play) return globe().setLandingError('Run a simulation first.')
      sendSky() // el Sol y la Tierra reales del paso actual deben llegar antes que la escena
      post(play)
    }
    // Vuelo suave del globo hasta el sitio (SELECT_SITE vuela ~2,5 s; SET_VIEW salta sin animación)
    const flyToSelected = () => {
      const s = mission().selected
      if (s) post({ type: 'SELECT_SITE', payload: { id: s.id, lat: s.lat, lon: s.lon, label: s.label } })
    }
    const pushAll = () => {
      sendMode()
      sendSites()
      sendSky()
      if (mission().viewMode === 'site') post({ type: 'SET_PAUSED', payload: { paused: true } })
      sendPsr()
      sendPins()
      sendCustomPin()
      if (globe().landing.requested) startLanding()
      else if (globe().horizon.requested) startHorizon()
      else flyToSelected()
    }

    const onMessage = (e: MessageEvent) => {
      const msg = fromGlobe(e, frame.current?.contentWindow, origin)
      if (!msg) return
      switch (msg.type) {
        case 'READY':
          ready = true
          window.clearTimeout(timeout)
          globe().setLink('ready')
          pushAll()
          break
        case 'SITE_CLICKED': // igual que elegir en el selector: solo selecciona, evaluar es decisión del usuario
          if (!globe().landing.requested) mission().select({ id: msg.payload.id, lat: msg.payload.lat, lon: msg.payload.lon, label: msg.payload.name, category: msg.payload.category })
          break
        case 'GLOBE_CLICKED':
          if (!globe().landing.requested) mission().select({ lat: msg.payload.lat, lon: msg.payload.lon, label: 'Custom pin' })
          break
        case 'HORIZON_PHASE': globe().setHorizonPhase(msg.payload.phase); break
        case 'SCENE_PHASE': globe().setPhase(msg.payload.phase); break
        case 'SCENE_TELEMETRY': globe().setTelemetry(msg.payload.altM, msg.payload.vMps); break
        case 'SCENE_ERROR': globe().setLandingError(msg.payload.reason); break
        default: break
      }
    }
    window.addEventListener('message', onMessage)

    const unsubMission = useMissionStore.subscribe((s, p) => {
      if (!ready) return
      if (s.sites !== p.sites || s.evaluation !== p.evaluation) sendSites()
      if (s.evaluation !== p.evaluation || s.stepIndex !== p.stepIndex) {
        cancelAnimationFrame(raf)
        raf = requestAnimationFrame(sendSky)
      }
      if (s.psrs !== p.psrs || s.polePsrs !== p.polePsrs) sendPsr()
      if (s.ephemeris !== p.ephemeris && !s.evaluation) sendSky()
      if (s.scenarios !== p.scenarios || s.comparison !== p.comparison || s.rankBy !== p.rankBy || s.workspace !== p.workspace) sendPins()
      if (s.selected !== p.selected || s.sites !== p.sites) sendCustomPin()
      if (s.health !== p.health || s.detail !== p.detail) sendMode()
      // Elegir un sitio o terminar una corrida recentra el globo en él (salvo durante la escena o el horizonte).
      // Con la vista de horizonte activa, una corrida nueva (Simulate, Compare, History, Missions) lleva el
      // horizonte al sitio nuevo en vez de volver a la esfera.
      // Repetir la corrida en el mismo sitio (otra fecha) no repite el vuelo de 2,5 s
      const moved = !!s.evaluation && (!p.evaluation || p.evaluation.site.lat !== s.evaluation.site.lat || p.evaluation.site.lon !== s.evaluation.site.lon)
      const reran = s.evaluation !== p.evaluation && s.evaluation !== null && moved
      const inScene = globe().landing.requested
      // Elegir o evaluar otro lugar durante la escena de alunizaje la cierra: el globo vuelve a encuadrar el nuevo.
      // History no tiene botones de escena, así que entrar ahí también cierra la escena y el horizonte.
      if (inScene && ((s.selected !== p.selected && s.selected && !samePlace(s.selected, p.selected)) || reran)) { globe().clearLanding(); return }
      if (s.workspace !== p.workspace && s.workspace === 'history') { globe().clearLanding(); globe().clearHorizon() }
      // "Terrain detail" tapa el globo: se deja de dibujar debajo (tras el fundido de 500 ms) y se reanuda al volver
      if (s.viewMode !== p.viewMode) {
        window.clearTimeout(pauseTimer)
        if (s.viewMode === 'site') pauseTimer = window.setTimeout(() => post({ type: 'SET_PAUSED', payload: { paused: true } }), 600)
        else post({ type: 'SET_PAUSED', payload: { paused: false } })
      }
      if (globe().horizon.requested && !inScene) {
        if (reran) startHorizon()
      } else if (((s.selected !== p.selected && s.selected) || reran) && !inScene) flyToSelected()
    })
    const unsubGlobe = useGlobeStore.subscribe((s, p) => {
      if (!ready) return
      if (s.landing.requested && !p.landing.requested) startLanding()
      if (s.horizon.requested && !p.horizon.requested) startHorizon()
      // Salir del horizonte: el globo vuela de vuelta a la esfera sobre el sitio (si no es porque empezó la escena)
      if (!s.horizon.requested && p.horizon.requested && !s.landing.requested) post({ type: 'EXIT_HORIZON' })
      // Salir de la escena (o un error): el globo limpia módulo y polvo y vuelve a encuadrar el sitio
      if (!s.landing.requested && p.landing.requested) { post({ type: 'STOP_LANDING_SCENE' }); flyToSelected() }
    })

    return () => {
      window.clearTimeout(timeout)
      window.clearTimeout(pauseTimer)
      cancelAnimationFrame(raf)
      window.removeEventListener('message', onMessage)
      unsubMission()
      unsubGlobe()
      globe().setLink('idle')
    }
  }, [frame])
}
