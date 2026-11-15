import { create } from 'zustand'
import { EXAGGERATIONS, type Exaggeration } from './terrainLook'

/** Ajustes de la escena local "Terrain detail" (solo visuales). */
interface SiteViewState {
  exaggeration: Exaggeration
  cycleExaggeration: () => void
}

export const useSiteViewStore = create<SiteViewState>((set) => ({
  exaggeration: 2,
  cycleExaggeration: () => set((s) => ({ exaggeration: EXAGGERATIONS[(EXAGGERATIONS.indexOf(s.exaggeration) + 1) % EXAGGERATIONS.length] })),
}))
