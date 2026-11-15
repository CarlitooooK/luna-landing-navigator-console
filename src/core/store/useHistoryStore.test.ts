import { beforeEach, expect, test } from 'vitest'
import type { CompareResponse, Evaluation } from '@/types'
import { groupByDay, isSameComparison, isSameRun, mergeEntries, migrateHistory, useHistoryStore, type HistoryComparison, type HistoryRun } from './useHistoryStore'

const run = (id: string, savedAt: string) => ({ id, savedAt }) as HistoryRun
const now = new Date('2026-11-14T15:00:00Z')

test('agrupa por día UTC con Today y Yesterday', () => {
  const g = groupByDay([run('a', '2026-11-14T12:04:00Z'), run('b', '2026-11-14T09:00:00Z'), run('c', '2026-11-13T18:21:00Z'), run('d', '2026-11-10T08:47:00Z')], now)
  expect(g.map((x) => [x.label, x.runs.map((r) => r.id)])).toEqual([['Today', ['a', 'b']], ['Yesterday', ['c']], ['Nov 10', ['d']]])
})

const site = { id: 'apollo-11', lat: 0.674, lon: 23.473, label: 'Apollo 11' }
const params = { site, startUtc: '2026-12-13T00:00:00Z', durationDays: 14, stepMinutes: 60, panelAreaM2: 4, panelEfficiency: 0.28 }
const saved = { ...params, id: 'x', savedAt: '2026-11-14T12:00:00Z' } as HistoryRun

test('isSameRun: la misma corrida no se guarda dos veces', () => {
  expect(isSameRun(params, saved)).toBe(true)
})
test('isSameRun: cualquier parámetro distinto es otra corrida', () => {
  for (const c of [{ site: { ...site, lat: 1 } }, { site: { ...site, lon: 24 } }, { startUtc: '2026-12-14T00:00:00Z' }, { durationDays: 7 },
    { stepMinutes: 120 }, { panelAreaM2: 6 }, { panelEfficiency: 0.3 }]) expect(isSameRun({ ...params, ...c }, saved)).toBe(false)
})
test('isSameRun: una corrida vieja sin paneles nunca se toma como igual', () => {
  const old = { ...saved, panelAreaM2: undefined, panelEfficiency: undefined }
  expect(isSameRun(params, old)).toBe(false)
})

// Guardado automático (pedido del usuario del 2026-11-15)

const evaluation = (status: string, sun: number) => ({ site: { status }, summary: { sun_visible_pct: sun } }) as unknown as Evaluation
beforeEach(() => useHistoryStore.setState({ runs: [], comparisons: [] }))

test('save: repetir la misma corrida no duplica; la sube con el resultado nuevo y conserva estrella y nota', () => {
  const h = useHistoryStore.getState()
  const a = h.save({ ...params, evaluation: evaluation('GO', 80) })
  h.save({ ...params, startUtc: '2026-12-20T00:00:00Z', evaluation: evaluation('GO', 70) })
  h.toggleStar(a.id); h.setNote(a.id, 'buena')
  const again = useHistoryStore.getState().save({ ...params, evaluation: evaluation('CAUTION', 60) })
  const { runs } = useHistoryStore.getState()
  expect(runs.map((r) => r.id)).toEqual([a.id, runs[1]!.id])
  expect([again.id, again.status, again.summary.sun_visible_pct, again.starred, again.note]).toEqual([a.id, 'CAUTION', 60, true, 'buena'])
})

const scen = [{ label: 'A', site, startUtc: '2026-12-13T00:00:00Z' }, { label: 'B', site: { ...site, lat: 26.13, lon: 3.63 }, startUtc: '2026-12-13T00:00:00Z' }]
const resp = { results: [{ site: { status: 'GO' }, summary: { sun_visible_pct: 88 } }, { site: { status: 'NO-GO' }, summary: { sun_visible_pct: 30 } }] } as unknown as CompareResponse
const cmp = { scenarios: scen, durationDays: 14, panelAreaM2: 4, panelEfficiency: 0.28 }

test('saveComparison: guarda el veredicto y el resumen de cada escenario, en orden', () => {
  const c = useHistoryStore.getState().saveComparison({ ...cmp, comparison: resp })
  expect(c.scenarios.map((x) => [x.label, x.status, x.summary.sun_visible_pct])).toEqual([['A', 'GO', 88], ['B', 'NO-GO', 30]])
  useHistoryStore.getState().saveComparison({ ...cmp, comparison: resp })
  expect(useHistoryStore.getState().comparisons).toHaveLength(1)
})

test('isSameComparison: otro orden, otra fecha, otra duración o otros paneles es otra comparación', () => {
  const saved = { ...cmp, id: 'c', savedAt: '', starred: false, note: '', scenarios: scen.map((s) => ({ ...s, status: 'GO', summary: {} })) } as HistoryComparison
  expect(isSameComparison(cmp, saved)).toBe(true)
  for (const c of [{ scenarios: [...scen].reverse() }, { scenarios: [scen[0]!, { ...scen[1]!, startUtc: '2026-12-20T00:00:00Z' }] }, { scenarios: [scen[0]!] },
    { durationDays: 7 }, { panelAreaM2: 6 }, { panelEfficiency: 0.3 }]) expect(isSameComparison({ ...cmp, ...c }, saved)).toBe(false)
})

test('remove, toggleStar y setNote sirven para corridas y comparaciones', () => {
  const h = useHistoryStore.getState()
  const c = h.saveComparison({ ...cmp, comparison: resp })
  h.toggleStar(c.id); h.setNote(c.id, 'n')
  expect(useHistoryStore.getState().comparisons[0]).toMatchObject({ starred: true, note: 'n' })
  h.remove(c.id)
  expect(useHistoryStore.getState().comparisons).toEqual([])
})

test('mergeEntries: corridas y comparaciones juntas, de la más nueva a la más vieja', () => {
  const runs = [run('r1', '2026-11-15T10:00:00Z'), run('r2', '2026-11-14T10:00:00Z')]
  const comparisons = [{ id: 'c1', savedAt: '2026-11-15T12:00:00Z' }, { id: 'c2', savedAt: '2026-11-14T20:00:00Z' }] as HistoryComparison[]
  expect(mergeEntries(runs, comparisons).map((e) => `${e.kind}:${e.id}`)).toEqual(['comparison:c1', 'run:r1', 'comparison:c2', 'run:r2'])
})

test('migrateHistory: el historial v1 conserva sus corridas y suma comparaciones vacías', () => {
  expect(migrateHistory({ runs: [saved] }, 1)).toEqual({ runs: [saved], comparisons: [] })
})
