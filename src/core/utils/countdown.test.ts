import { expect, test } from 'vitest'
import { countdown, countdownFromSummary } from './countdown'

const sum = (o: Partial<Record<'sun' | 'earth' | 'sunset' | 'earthset', number | null>>) => ({
  sun_visible_pct: o.sun ?? 50, earth_visible_pct: o.earth ?? 50,
  hours_to_next_sunset: o.sunset ?? null, hours_to_next_earthset: o.earthset ?? null,
})
// Un punto por hora desde 2026-12-01T00:00Z; `vis` dice si el astro se ve en cada hora.
const line = (sun: boolean[], earth: boolean[] = sun.map(() => true)) =>
  sun.map((v, i) => ({ timestamp_utc: `2026-12-01T${String(i).padStart(2, '0')}:00:00Z`, sun_visible: v, earth_visible: earth[i] }))

test('fila 1: 0 % gana a todo, aunque llegue un número de horas', () => {
  expect(countdown(sum({ earth: 0, earthset: 3 }), line([true, true]), 'earth')).toEqual({ kind: 'never' })
  expect(countdown(sum({ sun: 0 }), line([false, false]), 'sun')).toEqual({ kind: 'never' })
})
test('fila 2: oculto al inicio, cuenta las horas hasta el primer punto visible (Peak Near Shackleton)', () => {
  const t = line([true, true, true, true], [false, false, false, true])
  expect(countdown(sum({ earth: 5, earthset: null }), t, 'earth')).toEqual({ kind: 'until-rise', hours: 3 })
})
test('fila 2: el Sol oculto al inicio no se lee como "no se pone" (Apollo 11 de noche)', () => {
  expect(countdown(sum({ sun: 2.4, sunset: null }), line([false, false, true]), 'sun')).toEqual({ kind: 'until-rise', hours: 2 })
})
test('fila 3: visible al inicio y con horas, es un ocaso (Shackleton Rim)', () => {
  expect(countdown(sum({ sun: 0.3, sunset: 1 }), line([true, false]), 'sun')).toEqual({ kind: 'until-set', hours: 1 })
})
test('fila 4: visible al inicio y sin horas, no se pone en la ventana', () => {
  expect(countdown(sum({ sun: 100, sunset: null }), line([true, true]), 'sun')).toEqual({ kind: 'always' })
})
test('oculto al inicio y nunca visible en el timeline: nunca se ve', () => {
  expect(countdown(sum({ earth: 1 }), line([true, true], [false, false]), 'earth')).toEqual({ kind: 'never' })
})
test('sin timeline se decide con el resumen', () => {
  expect(countdown(sum({ sun: 40, sunset: 12 }), [], 'sun')).toEqual({ kind: 'until-set', hours: 12 })
  expect(countdown(sum({ sun: 40 }), [], 'sun')).toEqual({ kind: 'rises-later' })
})
test('Compare: null con 0 %, 100 % o un porcentaje intermedio', () => {
  expect(countdownFromSummary(sum({ earth: 0 }), 'earth')).toEqual({ kind: 'never' })
  expect(countdownFromSummary(sum({ earth: 100 }), 'earth')).toEqual({ kind: 'always' })
  expect(countdownFromSummary(sum({ earth: 45.8 }), 'earth')).toEqual({ kind: 'rises-later' })
})
