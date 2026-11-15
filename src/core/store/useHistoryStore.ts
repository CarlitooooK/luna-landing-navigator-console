import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { CompareResponse, Evaluation } from '@/types'
import type { SelectedSite } from './useMissionStore'

/**
 * Historial de simulaciones y comparaciones del usuario, solo en este dispositivo (localStorage).
 * El contrato no tiene endpoints para guardar corridas (docs/ideas/console-ui-figma.md).
 * Se guardan los parámetros y el resumen, no el timeline completo (~180 KB por corrida):
 * al reabrir una corrida o una comparación se vuelve a pedir al servidor.
 *
 * Se guarda solo (pedido del usuario del 2026-11-15): cada "Run simulation" de Simulate, cada replay de Missions
 * y cada comparación que responde. El tour no guarda. Repetir lo mismo no duplica: sube la entrada con la hora nueva.
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

/** Un escenario de una comparación guardada, con lo que respondió `/compare` (sin timeline). */
export interface HistoryScenario {
  label: string
  site: SelectedSite
  startUtc: string
  status: string
  summary: CompareResponse['results'][number]['summary']
}

export interface HistoryComparison {
  id: string
  savedAt: string // ISO UTC
  scenarios: HistoryScenario[]
  durationDays: number
  panelAreaM2: number
  panelEfficiency: number
  starred: boolean
  note: string
}

export const HISTORY_LIMIT = 100
export const COMPARISON_LIMIT = 50

interface HistoryState {
  runs: HistoryRun[]
  comparisons: HistoryComparison[]
  /** Guarda la corrida. Si ya hay una igual (`isSameRun`), la sube con la hora y el resultado nuevos y conserva estrella y nota. */
  save: (r: RunToSave) => HistoryRun
  /** Igual que `save`, para una comparación (`isSameComparison`). */
  saveComparison: (c: ComparisonToSave) => HistoryComparison
  /** Borra, marca o anota una corrida o una comparación por su id. */
  remove: (id: string) => void
  toggleStar: (id: string) => void
  setNote: (id: string, note: string) => void
}

export type RunToSave = Pick<HistoryRun, 'site' | 'startUtc' | 'durationDays' | 'stepMinutes'> & {
  panelAreaM2: number; panelEfficiency: number; evaluation: Evaluation
}
export type ComparisonToSave = Pick<HistoryComparison, 'durationDays' | 'panelAreaM2' | 'panelEfficiency'> & {
  scenarios: { label: string; site: SelectedSite; startUtc: string }[]
  comparison: CompareResponse
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

/** ¿Es la misma comparación? Los mismos escenarios en el mismo orden (las letras A–E dependen de él), duración y paneles. */
export function isSameComparison(a: Omit<ComparisonToSave, 'comparison'>, b: HistoryComparison): boolean {
  return a.durationDays === b.durationDays && a.panelAreaM2 === b.panelAreaM2 && a.panelEfficiency === b.panelEfficiency
    && a.scenarios.length === b.scenarios.length
    && a.scenarios.every((s, i) => s.site.lat === b.scenarios[i]!.site.lat && s.site.lon === b.scenarios[i]!.site.lon && s.startUtc === b.scenarios[i]!.startUtc)
}

const newId = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`)
const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')

/** Pone `item` arriba; si había uno igual, lo reemplaza conservando su id, estrella y nota. */
function upsert<T extends { id: string; starred: boolean; note: string }>(list: T[], item: Omit<T, 'id' | 'starred' | 'note'>, same: (x: T) => boolean, limit: number): [T[], T] {
  const prev = list.find(same)
  const next = { ...item, id: prev?.id ?? newId(), starred: prev?.starred ?? false, note: prev?.note ?? '' } as T
  return [[next, ...list.filter((x) => x !== prev)].slice(0, limit), next]
}

const patch = <T extends { id: string }>(list: T[], id: string, f: (x: T) => T) => list.map((x) => (x.id === id ? f(x) : x))

export const useHistoryStore = create<HistoryState>()(persist((set, get) => ({
  runs: [],
  comparisons: [],
  save: ({ evaluation, ...params }) => {
    const [runs, run] = upsert<HistoryRun>(get().runs,
      { savedAt: nowIso(), ...params, status: evaluation.site.status, summary: evaluation.summary }, (r) => isSameRun(params, r), HISTORY_LIMIT)
    set({ runs })
    return run
  },
  saveComparison: ({ comparison, ...params }) => {
    // `/compare` responde en el mismo orden que los escenarios pedidos (quien llama comprueba que coincidan en número)
    const scenarios = params.scenarios.map((s, i) => ({ ...s, status: comparison.results[i]!.site.status, summary: comparison.results[i]!.summary }))
    const [comparisons, c] = upsert<HistoryComparison>(get().comparisons,
      { savedAt: nowIso(), ...params, scenarios }, (x) => isSameComparison(params, x), COMPARISON_LIMIT)
    set({ comparisons })
    return c
  },
  remove: (id) => set((s) => ({ runs: s.runs.filter((r) => r.id !== id), comparisons: s.comparisons.filter((c) => c.id !== id) })),
  toggleStar: (id) => set((s) => ({ runs: patch(s.runs, id, (r) => ({ ...r, starred: !r.starred })), comparisons: patch(s.comparisons, id, (c) => ({ ...c, starred: !c.starred })) })),
  setNote: (id, note) => set((s) => ({ runs: patch(s.runs, id, (r) => ({ ...r, note })), comparisons: patch(s.comparisons, id, (c) => ({ ...c, note })) })),
}), {
  name: 'lunar-navigator.history', version: 2, storage: createJSONStorage(() => localStorage),
  migrate: (old, version) => migrateHistory(old, version) as HistoryState,
}))

/** v1 solo tenía corridas: se conservan tal cual y se agrega la lista de comparaciones. */
export function migrateHistory(old: unknown, version: number): unknown {
  return version < 2 ? { ...(old as object), comparisons: [] } : old
}

export type HistoryEntry = ({ kind: 'run' } & HistoryRun) | ({ kind: 'comparison' } & HistoryComparison)

/** Corridas y comparaciones en una sola lista, de la más nueva a la más vieja. */
export function mergeEntries(runs: HistoryRun[], comparisons: HistoryComparison[]): HistoryEntry[] {
  return [...runs.map((r) => ({ kind: 'run' as const, ...r })), ...comparisons.map((c) => ({ kind: 'comparison' as const, ...c }))]
    .sort((a, b) => (a.savedAt < b.savedAt ? 1 : a.savedAt > b.savedAt ? -1 : 0))
}

/** Agrupa por día (UTC) para la lista: "Today", "Yesterday" o la fecha. */
export function groupByDay<T extends { savedAt: string }>(runs: T[], now = new Date()): { label: string; runs: T[] }[] {
  const day = (iso: string) => iso.slice(0, 10)
  const today = now.toISOString().slice(0, 10)
  const yesterday = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10)
  const groups = new Map<string, T[]>()
  for (const r of runs) {
    const d = day(r.savedAt)
    const label = d === today ? 'Today' : d === yesterday ? 'Yesterday'
      : new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    groups.set(label, [...(groups.get(label) ?? []), r])
  }
  return [...groups].map(([label, runs]) => ({ label, runs }))
}
