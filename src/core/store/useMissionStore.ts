import { create } from 'zustand'
import { GLOBE_URL } from '@/core/config'
import { useGlobeStore } from './useGlobeStore'
import { api } from '@/core/api/endpoints'
import { ApiError } from '@/core/api/errors'
import { toUtcIso } from '@/core/utils/time'
import type { Priority } from '@/core/utils/compare'
import type { CompareResponse, Ephemeris, Evaluation, HealthResponse, PsrList, PsrNearby, Site, TerrainPatch } from '@/types'

export type Workspace = 'simulate' | 'compare' | 'history' | 'missions'
export type DetailLevel = 'simple' | 'detailed'
/** Qué se ve en el fondo (docs/02-renders.md): el globo siempre; 'site' pone encima la escena local del parche. */
export type ViewMode = 'globe' | 'site'

export interface SelectedSite { id?: string; lat: number; lon: number; label: string; category?: string }
export interface Scenario { key: string; label: string; site: SelectedSite; startUtc: string }

export const MAX_SCENARIOS = 5 // contrato §2.5: 2 a 5 escenarios
export const STEP_OPTIONS = [15, 60, 120] as const

// Tres velocidades (docs/ideas/frontend-architecture-guide.md §3):
// 1 configuración (barata) · 2 datos pesados vía API (bajo demanda) · 3 reproducción (cero red).
interface MissionState {
  // shell
  workspace: Workspace
  detail: DetailLevel
  fullscreen: boolean
  viewMode: ViewMode

  // capa 1: configuración
  health: HealthResponse | null
  sites: Site[]
  selected: SelectedSite | null
  startUtc: string
  durationDays: number
  stepMinutes: number
  panelAreaM2: number
  panelEfficiency: number

  // capa 2: datos de la API
  evaluation: Evaluation | null
  terrain: TerrainPatch | null
  psrs: PsrNearby | null
  /** Qué parte auxiliar de la última corrida falló (el veredicto de `/evaluate` sí llegó). */
  auxFailed: ('terrain' | 'psr')[]
  /** Sol y Tierra desde el centro de la Luna para la fecha de inicio (`GET /ephemeris`): el cielo antes de evaluar. */
  ephemeris: Ephemeris | null
  /** PSR grandes de todo el polo (`GET /psr`), para la vista global. */
  polePsrs: PsrList | null
  loading: boolean
  error: ApiError | null
  lastRunMs: number | null

  // capa 3: reproducción
  stepIndex: number
  playing: boolean

  // compare
  scenarios: Scenario[]
  comparison: CompareResponse | null
  comparing: boolean
  compareError: ApiError | null
  shownScenario: string | null
  /** Criterio de la recomendación; también decide cuál pin A–E se resalta en el globo. */
  rankBy: Priority

  // selección dentro de History y Missions
  pickedRun: string | null
  pickedMission: string

  init: () => Promise<void>
  loadSky: () => Promise<void>
  setRankBy: (p: Priority) => void
  setWorkspace: (w: Workspace) => void
  setDetail: (d: DetailLevel) => void
  toggleFullscreen: () => void
  select: (s: SelectedSite) => void
  setConfig: (p: Partial<Pick<MissionState, 'startUtc' | 'durationDays' | 'stepMinutes' | 'panelAreaM2' | 'panelEfficiency'>>) => void
  evaluate: () => Promise<void>
  backToGlobe: () => void
  /** Vuelve a la escena local del sitio ya evaluado (sin pedir nada a la API). */
  showSite: () => void
  setStep: (i: number) => void
  setPlaying: (p: boolean) => void

  addScenario: (s: Omit<Scenario, 'key'>) => boolean
  removeScenario: (key: string) => void
  compare: () => Promise<void>
  showScenario: (key: string) => Promise<void>
  pickRun: (id: string | null) => void
  pickMission: (id: string) => void
}

let scenarioSeq = 0
let skySeq = 0 // descarta respuestas viejas de /ephemeris si la fecha cambió mientras tanto
/** Clave del lugar de la última corrida: terreno y PSR dependen solo de lat/lon (no de la fecha). */
let auxKey: string | null = null
export const PSR_MIN_AREA_KM2 = 50 // el catálogo tiene 1.531 regiones; las de ≥ 50 km² son ~67 y bastan para ver el polo
const sameScenario = (a: Omit<Scenario, 'key'>, b: Omit<Scenario, 'key'>) =>
  a.site.lat === b.site.lat && a.site.lon === b.site.lon && a.startUtc === b.startUtc

export const useMissionStore = create<MissionState>((set, get) => ({
  workspace: 'simulate', detail: 'simple', fullscreen: false, viewMode: 'globe',
  health: null, sites: [], selected: null,
  startUtc: toUtcIso(new Date('2026-12-01T00:00:00Z')), // valor de prueba de docs/07
  durationDays: 14, stepMinutes: 60, panelAreaM2: 4, panelEfficiency: 0.28,
  evaluation: null, terrain: null, psrs: null, auxFailed: [], ephemeris: null, polePsrs: null, loading: false, error: null, lastRunMs: null,
  stepIndex: 0, playing: false,
  scenarios: [], comparison: null, comparing: false, compareError: null, shownScenario: null, rankBy: 'balanced',
  pickedRun: null, pickedMission: 'im-1',

  init: async () => {
    try {
      const [health, sites] = await Promise.all([api.health(), api.sites()])
      set({ health, sites: sites.sites, error: null })
    } catch (e) { set({ error: e as ApiError }) }
    // El cielo y las PSR del polo son extras de la vista global: si fallan, el globo sigue sin ellos (no se inventan)
    void get().loadSky()
    api.psrList({ limit: 100, min_area_km2: PSR_MIN_AREA_KM2, simplify_m: 1000 }).then((polePsrs) => set({ polePsrs })).catch(() => {})
  },
  loadSky: async () => {
    const seq = ++skySeq
    try {
      const ephemeris = await api.ephemeris(get().startUtc)
      if (seq === skySeq) set({ ephemeris })
    } catch { /* sin efemérides el globo no dibuja Sol: es mejor que uno inventado */ }
  },
  setRankBy: (rankBy) => set({ rankBy }),
  setWorkspace: (workspace) => set({ workspace }),
  setDetail: (detail) => set({ detail }),
  toggleFullscreen: () => set((s) => ({ fullscreen: !s.fullscreen })),
  select: (selected) => set({ selected, error: null }),
  setConfig: (p) => {
    const dateChanged = p.startUtc !== undefined && p.startUtc !== get().startUtc
    set(p)
    if (dateChanged) void get().loadSky()
  },

  evaluate: async () => {
    const { selected, startUtc, durationDays, stepMinutes, panelAreaM2, panelEfficiency } = get()
    if (!selected) return
    set({ loading: true, error: null, stepIndex: 0, playing: false })
    const t0 = performance.now()
    try {
      const { lat, lon } = selected
      const key = `${lat},${lon}`
      const samePlace = key === auxKey && get().terrain !== null
      // El veredicto (/evaluate) no depende del parche ni de las PSR: si esas fallan, la corrida sigue.
      // Solo cambio de fecha en el mismo lugar -> solo /evaluate; el parche y las PSR no cambian.
      const [ev, tr, ps] = await Promise.allSettled([
        api.evaluate({ lat, lon, start_utc: startUtc, duration_days: durationDays, step_minutes: stepMinutes,
          panel_efficiency: panelEfficiency, panel_area_m2: panelAreaM2 }),
        samePlace ? Promise.resolve(get().terrain!) : api.terrainPatch({ lat, lon, size_km: 12, resolution: 256 }),
        samePlace ? Promise.resolve(get().psrs) : api.psrNearby({ lat, lon }),
      ])
      if (ev.status === 'rejected') throw ev.reason
      const terrain = tr.status === 'fulfilled' ? tr.value : null
      const psrs = ps.status === 'fulfilled' ? ps.value : null
      auxKey = terrain && psrs ? key : null
      const auxFailed: ('terrain' | 'psr')[] = [...(tr.status === 'rejected' ? ['terrain' as const] : []), ...(ps.status === 'rejected' ? ['psr' as const] : [])]
      // Con el globo disponible la simulación se queda en él (vuelo continuo, sin cambio de motor);
      // la escena local del parche queda como "Terrain detail". Sin globo, la escena local es el fondo.
      const globeOk = !!GLOBE_URL && useGlobeStore.getState().link !== 'unavailable'
      set({ evaluation: ev.value, terrain, psrs, auxFailed, loading: false, viewMode: !globeOk && terrain ? 'site' : 'globe', lastRunMs: performance.now() - t0 })
    } catch (e) { set({ error: e as ApiError, loading: false }) }
  },
  backToGlobe: () => set({ viewMode: 'globe', playing: false }),
  showSite: () => set((s) => (s.terrain ? { viewMode: 'site' } : {})),
  setStep: (stepIndex) => set({ stepIndex }),
  setPlaying: (playing) => set({ playing }),

  addScenario: (s) => {
    const { scenarios } = get()
    if (scenarios.length >= MAX_SCENARIOS || scenarios.some((x) => sameScenario(x, s))) return false
    set({ scenarios: [...scenarios, { ...s, key: `s${++scenarioSeq}` }], comparison: null })
    return true
  },
  removeScenario: (key) => set((st) => ({
    scenarios: st.scenarios.filter((x) => x.key !== key), comparison: null,
    shownScenario: st.shownScenario === key ? null : st.shownScenario,
  })),
  compare: async () => {
    const { scenarios, durationDays, panelAreaM2, panelEfficiency } = get()
    if (scenarios.length < 2) return
    set({ comparing: true, compareError: null })
    try {
      const comparison = await api.compare({
        scenarios: scenarios.map((s) => ({ label: s.label, lat: s.site.lat, lon: s.site.lon, start_utc: s.startUtc })),
        duration_days: durationDays, step_minutes: 120, panel_efficiency: panelEfficiency, panel_area_m2: panelAreaM2,
        include_timeline: false, // v1.2 (D-014): la tabla solo usa los resúmenes; el timeline se pide al mostrar un escenario
      })
      set({ comparison, comparing: false })
    } catch (e) { set({ compareError: e as ApiError, comparing: false }) }
  },
  // Mostrar un escenario en el terreno = evaluarlo como la simulación activa.
  showScenario: async (key) => {
    const sc = get().scenarios.find((x) => x.key === key)
    if (!sc) return
    set({ shownScenario: key, selected: sc.site, startUtc: sc.startUtc })
    await get().evaluate()
  },
  pickRun: (pickedRun) => set({ pickedRun }),
  pickMission: (pickedMission) => set({ pickedMission }),
}))
