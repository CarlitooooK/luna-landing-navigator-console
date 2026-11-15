import { expect, test } from 'vitest'
import type { CompareResponse } from '@/types'
import { bestIndex, rank, score } from './compare'

type R = CompareResponse['results'][number]
const r = (label: string, status: string, sun: number, earth: number) =>
  ({ label, site: { status }, summary: { sun_visible_pct: sun, earth_visible_pct: earth } }) as unknown as R

const A = r('A', 'GO', 82, 64), B = r('B', 'NO-GO', 18, 71), C = r('C', 'CAUTION', 71, 96)

test('el estado manda antes que las métricas', () => {
  expect(rank([B, C, A], 'balanced').map((x) => x.label)).toEqual(['A', 'C', 'B'])
})
test('dentro del mismo estado, ordena por la prioridad', () => {
  const D = r('D', 'GO', 60, 99)
  expect(rank([A, D], 'earth').map((x) => x.label)).toEqual(['D', 'A'])
  expect(rank([A, D], 'power').map((x) => x.label)).toEqual(['A', 'D'])
})
test('bestIndex', () => {
  expect(bestIndex([1, 3, 2])).toBe(1)
  expect(bestIndex([3, 3])).toBeNull()
})
test('score: lo que ordena cada criterio de "Rank by"', () => {
  expect(score(A, 'balanced')).toBe(146)
  expect(score(A, 'power')).toBe(82)
  expect(score(A, 'earth')).toBe(64)
})
