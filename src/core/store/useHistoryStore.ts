import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Evaluation } from '@/types'
import type { SelectedSite } from './useMissionStore'

/**
 * Historial de simulaciones del usuario, solo en este dispositivo (localStorage).
 * El contrato no tiene endpoints para guardar corridas (docs/ideas/console-ui-figma.md).
 * Se guardan los parámetros y el resumen, no el timeline completo (~180 KB por corrida):
 * al reabrir una corrida se vuelve a evaluar.
 */
export interface HistoryRun {
  id: string
  savedAt: string // ISO UTC
  site: SelectedSite
  startUtc: string
  durationDays: number
  stepMinutes: number
  /** Paneles de la corrida. Faltan en las corridas guardadas antes de la tarea A7. */
  panelAreaM2?: number
  panelEfficiency?: number
  status: string
  summary: Evaluation['summary']
  starred: boolean
  note: string
}

export const HISTORY_LIMIT = 100

interface HistoryState {
  runs: HistoryRun[]
  /** Guarda la corrida. Si ya hay una igual (`isSameRun`), no la duplica y devuelve `null`. */
  save: (r: RunToSave) => HistoryRun | null
  remove: (id: string) => void
  toggleStar: (id: string) => void
  setNote: (id: string, note: string) => void
}

export type RunToSave = Pick<HistoryRun, 'site' | 'startUtc' | 'durationDays' | 'stepMinutes'> & {
  panelAreaM2: number; panelEfficiency: number; evaluation: Evaluation
}

/**
 * ¿Es la misma corrida? Mismo lugar, inicio, duración, paso y paneles (tarea A7).
 * Una corrida vieja sin paneles nunca se considera igual: podría ser de otros paneles.
 */
export function isSameRun(a: Omit<RunToSave, 'evaluation'>, b: HistoryRun): boolean {
  return a.site.lat === b.site.lat && a.site.lon === b.site.lon && a.startUtc === b.startUtc
    && a.durationDays === b.durationDays && a.stepMinutes === b.stepMinutes
    && b.panelAreaM2 !== undefined && b.panelEfficiency !== undefined
    && a.panelAreaM2 === b.panelAreaM2 && a.panelEfficiency === b.panelEfficiency
}

const newId = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`)

export const useHistoryStore = create<HistoryState>()(persist((set, get) => ({
  runs: [],
  save: ({ evaluation, ...params }) => {
    if (get().runs.some((r) => isSameRun(params, r))) return null
    const run: HistoryRun = {
      id: newId(), savedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'), ...params,
      status: evaluation.site.status, summary: evaluation.summary, starred: false, note: '',
    }
    set((s) => ({ runs: [run, ...s.runs].slice(0, HISTORY_LIMIT) }))
    return run
  },
  remove: (id) => set((s) => ({ runs: s.runs.filter((r) => r.id !== id) })),
  toggleStar: (id) => set((s) => ({ runs: s.runs.map((r) => (r.id === id ? { ...r, starred: !r.starred } : r)) })),
  setNote: (id, note) => set((s) => ({ runs: s.runs.map((r) => (r.id === id ? { ...r, note } : r)) })),
}), { name: 'lunar-navigator.history', version: 1, storage: createJSONStorage(() => localStorage) }))

/** Agrupa por día (UTC) para la lista: "Today", "Yesterday" o la fecha. */
export function groupByDay(runs: HistoryRun[], now = new Date()): { label: string; runs: HistoryRun[] }[] {
  const day = (iso: string) => iso.slice(0, 10)
  const today = now.toISOString().slice(0, 10)
  const yesterday = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10)
  const groups = new Map<string, HistoryRun[]>()
  for (const r of runs) {
    const d = day(r.savedAt)
    const label = d === today ? 'Today' : d === yesterday ? 'Yesterday'
      : new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    groups.set(label, [...(groups.get(label) ?? []), r])
  }
  return [...groups].map(([label, runs]) => ({ label, runs }))
}
