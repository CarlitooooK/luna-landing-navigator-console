import { expect, test } from 'vitest'
import { groupByDay, isSameRun, type HistoryRun } from './useHistoryStore'

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
