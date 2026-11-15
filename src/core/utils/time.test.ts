import { expect, test } from 'vitest'
import { formatUtc, parseUtcTime, toUtcIso } from './time'

test('toUtcIso quita milisegundos', () => {
  expect(toUtcIso(new Date('2026-12-01T00:00:00.000Z'))).toBe('2026-12-01T00:00:00Z')
})
test('formatUtc', () => {
  expect(formatUtc('2026-12-04T14:00:00Z')).toBe('2026-12-04 14:00 UTC')
  // timestamp_utc puede traer milisegundos
  expect(formatUtc('2026-12-01T00:00:00.000Z')).toBe('2026-12-01 00:00 UTC')
})
test('parseUtcTime acepta 24 horas y normaliza a HH:MM', () => {
  expect(parseUtcTime('00:00')).toBe('00:00')
  expect(parseUtcTime('5:00')).toBe('05:00')
  expect(parseUtcTime(' 23:59 ')).toBe('23:59')
})
test('parseUtcTime rechaza lo que no es una hora de 24 horas', () => {
  for (const t of ['24:00', '12:60', '12', '12:5', '1200', '12:00 PM', 'ab:cd', '']) expect(parseUtcTime(t)).toBeNull()
})
