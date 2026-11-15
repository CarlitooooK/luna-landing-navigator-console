import { expect, test } from 'vitest'
import { atMidnight, dateVariants, shiftDays } from './scenarios'

const T = '2026-12-13T00:00:00Z'

test('shiftDays desplaza en días UTC y respeta el rango del contrato', () => {
  expect(shiftDays(T, 7)).toBe('2026-12-20T00:00:00Z')
  expect(shiftDays(T, 14)).toBe('2026-12-27T00:00:00Z')
  expect(shiftDays('2050-12-25T00:00:00Z', 14)).toBeNull()
  expect(shiftDays('1900-01-03T00:00:00Z', -7)).toBeNull()
})
test('dateVariants: la actual, +7 y +14', () => {
  expect(dateVariants(T, [7, 14], [], 5)).toEqual([T, '2026-12-20T00:00:00Z', '2026-12-27T00:00:00Z'])
})
test('dateVariants no repite fechas que ya están', () => {
  expect(dateVariants(T, [7, 14], [T], 5)).toEqual(['2026-12-20T00:00:00Z', '2026-12-27T00:00:00Z'])
})
test('dateVariants no pasa del lugar libre (máximo 5 escenarios)', () => {
  expect(dateVariants(T, [7, 14], [], 2)).toEqual([T, '2026-12-20T00:00:00Z'])
  expect(dateVariants(T, [7, 14], [], 0)).toEqual([])
})
test('dateVariants descarta las fechas fuera de rango', () => {
  expect(dateVariants('2050-12-20T00:00:00Z', [7, 14], [], 5)).toEqual(['2050-12-20T00:00:00Z', '2050-12-27T00:00:00Z'])
})
test('atMidnight lleva la fecha a las 00:00 UTC de Compare', () => {
  expect(atMidnight('2026-12-13T05:00:00Z')).toBe('2026-12-13T00:00:00Z')
})
