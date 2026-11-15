import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { migrateOnboarding, type OnboardingPersisted, type TourStatus } from '@/features/onboarding/tour'

/**
 * Si la persona ya vio el tour (spec de onboarding, design.md §1.7, tarea D2). Solo en este dispositivo.
 * Sin localStorage el tour se ofrece en cada visita: saltarlo cuesta una tecla.
 */
interface OnboardingState extends OnboardingPersisted {
  /** Paso abierto del tour, o `null` si está cerrado. No se guarda. */
  step: number | null
  open: (step: number) => void
  go: (step: number) => void
  /** Esc, "Skip tour" o el botón de cierre. */
  dismiss: () => void
  /** "Done" en el último paso. */
  complete: () => void
}

const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
const finish = (status: TourStatus) => ({ step: null, tour: { status, at: now() } })

export const useOnboardingStore = create<OnboardingState>()(persist((set) => ({
  tour: { status: 'unseen', at: null },
  step: null,
  open: (step) => set({ step }),
  go: (step) => set({ step }),
  dismiss: () => set(finish('dismissed')),
  complete: () => set(finish('completed')),
}), {
  name: 'lunar-navigator.onboarding', version: 1, storage: createJSONStorage(() => localStorage),
  partialize: (s) => ({ tour: s.tour }),
  migrate: (persisted) => migrateOnboarding(persisted),
}))
