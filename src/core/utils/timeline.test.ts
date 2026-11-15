import { describe, expect, test } from 'vitest'
import type { TimelinePoint } from '@/types'
import { bothRuns, coverage, formatHours, pctWhole, runs, stepHours, sunRuns } from './timeline'

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
