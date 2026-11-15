import { expect, test } from 'vitest'
import { isStale, type RunParams } from './stale'

const run: RunParams = { lat: -88.81, lon: 123.5, label: 'Peak Near Shackleton', startUtc: '2026-12-13T00:00:00Z',
  durationDays: 14, stepMinutes: 60, panelAreaM2: 4, panelEfficiency: 0.28 }
const { label: _label, ...same } = run

test('sin evaluación no hay nada desactualizado', () => {
  expect(isStale(same, null)).toBe(false)
})
test('con los mismos parámetros sigue vigente', () => {
  expect(isStale({ ...same }, run)).toBe(false)
})
test('cualquier parámetro distinto lo marca', () => {
  const changes: Partial<typeof same>[] = [
    { lat: -84.79 }, { lon: 31.2 }, { startUtc: '2026-12-17T00:00:00Z' }, { durationDays: 7 },
    { stepMinutes: 120 }, { panelAreaM2: 6 }, { panelEfficiency: 0.3 },
  ]
  for (const c of changes) expect(isStale({ ...same, ...c }, run)).toBe(true)
})
test('sin sitio elegido no se marca', () => {
  expect(isStale({ ...same, lat: undefined, lon: undefined }, run)).toBe(false)
})
