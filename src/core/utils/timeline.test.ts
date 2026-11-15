import { describe, expect, test } from 'vitest'
import type { TimelinePoint } from '@/types'
import { bothRuns, coverage, dayOf, formatHours, pctWhole, runs, sliderStep, stepHours, sunRuns } from './timeline'

const pt = (i: number, sun: boolean, earth: boolean): TimelinePoint => ({
  timestamp_utc: new Date(Date.UTC(2026, 11, 1, i)).toISOString().replace(/\.\d{3}Z$/, 'Z'),
  sun_az_deg: 0, sun_el_deg: 0, sun_horizon_el_deg: 0, sun_visible: sun, sun_vector_3d: [0, 1, 0],
  earth_az_deg: 0, earth_el_deg: 0, earth_horizon_el_deg: 0, earth_visible: earth, earth_vector_3d: [0, 1, 0], power_factor: 0,
})
// sol: 1 1 0 0 1 · tierra: 0 1 1 0 1
const T = [pt(0, true, false), pt(1, true, true), pt(2, false, true), pt(3, false, false), pt(4, true, true)]

describe('runs', () => {
  test('agrupa tramos continuos y cierra el último', () => {
    expect(sunRuns(T)).toEqual([[0, 2], [4, 5]])
    expect(bothRuns(T)).toEqual([[1, 2], [4, 5]])
  })
  test('sin coincidencias', () => expect(runs(T, () => false)).toEqual([]))
  test('cobertura', () => expect(coverage(sunRuns(T), T.length)).toBeCloseTo(0.6))
})

test('stepHours lee el paso de las marcas', () => expect(stepHours(T)).toBe(1))

describe('formatHours', () => {
  test('null = el evento no ocurre en la ventana', () => expect(formatHours(null)).toBeNull())
  test('menos de 2 días en horas', () => expect(formatHours(36)).toEqual({ value: '36', unit: 'hours' }))
  test('días exactos', () => expect(formatHours(168)).toEqual({ value: '7', unit: 'days' }))
  test('días y horas', () => expect(formatHours(112)).toEqual({ value: '4d 16h', unit: '' }))
})

test('pctWhole no redondea a 0 % algo que sí pasó', () => {
  expect(pctWhole(0)).toBe('0%')
  expect(pctWhole(0.3)).toBe('<1%')
  expect(pctWhole(1)).toBe('1%')
  expect(pctWhole(71.1)).toBe('71%')
  expect(pctWhole(null)).toBe('—')
})

test('dayOf cuenta el día de la misión desde 1, igual en el reloj y en el eje', () => {
  expect(dayOf(0)).toBe(1)
  expect(dayOf(23)).toBe(1)
  expect(dayOf(24)).toBe(2)
  expect(dayOf(72)).toBe(4)
})
describe('sliderStep', () => {
  // 14 días a 60 min: 336 pasos, 24 por día
  test('flechas mueven un paso y no se salen', () => {
    expect(sliderStep('ArrowRight', 0, 336, 24)).toBe(1)
    expect(sliderStep('ArrowLeft', 0, 336, 24)).toBe(0)
    expect(sliderStep('ArrowRight', 335, 336, 24)).toBe(335)
  })
  test('PageUp y PageDown saltan un día', () => {
    expect(sliderStep('PageUp', 10, 336, 24)).toBe(34)
    expect(sliderStep('PageDown', 10, 336, 24)).toBe(0)
    expect(sliderStep('PageUp', 10, 168, 12)).toBe(22)
  })
  test('Home y End van a los extremos', () => {
    expect(sliderStep('Home', 100, 336, 24)).toBe(0)
    expect(sliderStep('End', 100, 336, 24)).toBe(335)
  })
  test('otras teclas no mueven el scrubber', () => {
    expect(sliderStep('Enter', 5, 336, 24)).toBeNull()
    expect(sliderStep('f', 5, 336, 24)).toBeNull()
  })
})
