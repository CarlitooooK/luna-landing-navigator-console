import { create } from 'zustand'
import type { HorizonPhase, ScenePhase } from '@/features/viewport3d/globeProtocol'

/** Estado del enlace con el globo y de la escena de alunizaje. Aparte del store de misión: lo escribe solo el puente. */
export type GlobeLink = 'idle' | 'loading' | 'ready' | 'unavailable'
export interface Landing { requested: boolean; phase: ScenePhase | null; altM: number | null; vMps: number | null; error: string | null }

const NONE: Landing = { requested: false, phase: null, altM: null, vMps: null, error: null }

/** Vista de horizonte (Lander POV): la cámara baja al suelo del sitio y mira el cielo sobre su horizonte real. */
export interface Horizon { requested: boolean; phase: HorizonPhase | null }
const HORIZON_NONE: Horizon = { requested: false, phase: null }

interface GlobeState {
  link: GlobeLink
  /** Si aparece un astronauta junto al módulo al posarse (opción de `PLAY_LANDING_SCENE`). */
  astronaut: boolean
  /** Regiones de sombra permanente (PSR) sobre el globo: se pueden ocultar para ver el relieve limpio. */
  showPsr: boolean
  togglePsr: () => void
  setAstronaut: (on: boolean) => void
  landing: Landing
  horizon: Horizon
  requestHorizon: () => void
  clearHorizon: () => void
  setHorizonPhase: (p: HorizonPhase) => void
  setLink: (l: GlobeLink) => void
  requestLanding: () => void
  clearLanding: () => void
  setPhase: (p: ScenePhase) => void
  setTelemetry: (altM: number, vMps: number) => void
  setLandingError: (reason: string) => void
}

export const useGlobeStore = create<GlobeState>((set) => ({
  link: 'idle',
  astronaut: true,
  showPsr: true,
  togglePsr: () => set((s) => ({ showPsr: !s.showPsr })),
  setAstronaut: (astronaut) => set({ astronaut }),
  landing: NONE,
  horizon: HORIZON_NONE,
  requestHorizon: () => set({ horizon: { requested: true, phase: null }, landing: NONE }),
  clearHorizon: () => set({ horizon: HORIZON_NONE }),
  setHorizonPhase: (phase) => set((s) => ({ horizon: { ...s.horizon, phase } })),
  setLink: (link) => set({ link }),
  // La escena de alunizaje y la vista de horizonte se excluyen: el globo solo muestra una a la vez
  requestLanding: () => set({ landing: { ...NONE, requested: true }, horizon: HORIZON_NONE }),
  clearLanding: () => set({ landing: NONE }),
  setPhase: (phase) => set((s) => ({ landing: { ...s.landing, phase } })),
  setTelemetry: (altM, vMps) => set((s) => ({ landing: { ...s.landing, altM, vMps } })),
  setLandingError: (error) => set((s) => ({ landing: { ...s.landing, error, requested: false } })),
}))
