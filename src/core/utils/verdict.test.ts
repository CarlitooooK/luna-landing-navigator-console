import { expect, test } from 'vitest'
import { verdictReasons, type Check } from './verdict'

const c = (code: string, level: Check['level']): Check => ({ code, level, value: 1, threshold: 1, unit: 'pct', message: code })

test('con checks, los ordena del más grave al menos grave y conserva el orden a igual nivel', () => {
  const r = verdictReasons({ reasons: ['x'], checks: [c('SLOPE_SAFE', 'ok'), c('SUN_LIMITED', 'caution'), c('DTE_NONE', 'caution'), c('SUN_CRITICAL', 'nogo')] })
  expect(r.source).toBe('checks')
  expect(r.items.map((i) => (typeof i === 'string' ? i : i.code))).toEqual(['SUN_CRITICAL', 'SUN_LIMITED', 'DTE_NONE', 'SLOPE_SAFE'])
})
test('sin checks (v1.1) o con la lista vacía, quedan las razones en español', () => {
  expect(verdictReasons({ reasons: ['Pendiente segura'] })).toEqual({ source: 'reasons', items: ['Pendiente segura'], lang: 'es' })
  expect(verdictReasons({ reasons: ['Pendiente segura'], checks: [] }).source).toBe('reasons')
})
test('no modifica la lista del servidor', () => {
  const checks = [c('A', 'ok'), c('B', 'nogo')]
  verdictReasons({ reasons: [], checks })
  expect(checks.map((x) => x.code)).toEqual(['A', 'B'])
})
