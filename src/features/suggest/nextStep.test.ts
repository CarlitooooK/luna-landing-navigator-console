import { describe, expect, test } from 'vitest'
import { nextStepCompare, nextStepHistory, nextStepMissions, nextStepSimulate, worstCheck, type CheckLite, type SimulateState } from './nextStep'

const base: SimulateState = { offline: false, loading: false, site: 'Apollo 11', startUtc: '2026-12-13T00:00:00Z', durationDays: 14, error: null, stale: false, verdict: null }
const sim = (o: Partial<SimulateState>) => nextStepSimulate({ ...base, ...o })
const v = (status: string, checks: CheckLite[] | null) => ({ verdict: { status, checks } })
const c = (code: string, level: CheckLite['level']): CheckLite => ({ code, level })

describe('Simulate (§3.2)', () => {
  test('sin conexión gana a todo', () => expect(sim({ offline: true, error: 'ERR_NETWORK', ...v('GO', null) })?.id).toBe('offline'))
  test('calculando no sugiere nada', () => expect(sim({ loading: true })).toBeNull())
  test('sin sitio: buscar o una misión real', () => {
    const s = sim({ site: null })!
    expect([s.id, s.action?.id, s.secondary?.id]).toEqual(['no-site', 'focus-search', 'go-missions'])
  })
  test('listo para simular nombra sitio, fecha y duración', () => expect(sim({})?.text).toBe('Ready: Apollo 11, Dec 13, 2026, 14 days. Run the simulation to see the verdict.'))
  test('desactualizado pide correr otra vez', () => expect(sim({ stale: true, ...v('GO', null) })?.action?.id).toBe('run-again'))
  test('GO: comparar fechas y guardar', () => {
    const s = sim(v('GO', []))!
    expect([s.id, s.tone, s.action?.id, s.secondary?.id]).toEqual(['go', 'go', 'compare-dates', 'save'])
  })
  test('CAUTION y NO-GO sin checks (v1.1)', () => {
    expect(sim(v('CAUTION', null))?.id).toBe('caution')
    expect(sim(v('NO-GO', null))?.id).toBe('nogo')
    expect(sim(v('NO-GO', []))?.secondary?.id).toBe('change-site')
  })
})

describe('Del check a la recomendación (§3.3)', () => {
  test('pendiente: otro sitio', () => expect(sim(v('NO-GO', [c('SLOPE_CRITICAL', 'nogo')]))?.action?.id).toBe('change-site'))
  test('pendiente moderada también', () => expect(sim(v('CAUTION', [c('SLOPE_MODERATE', 'caution')]))?.id).toBe('check:slope'))
  test('Sol: otras fechas o una misión más corta', () => {
    const s = sim(v('CAUTION', [c('SUN_LIMITED', 'caution')]))!
    expect([s.action?.id, s.secondary?.id]).toEqual(['compare-dates', 'shorten-mission'])
  })
  test('Tierra reducida: otras fechas', () => expect(sim(v('CAUTION', [c('DTE_REDUCED', 'caution')]))?.id).toBe('check:dte-reduced'))
  test('Tierra nunca a la vista: otros sitios', () => expect(sim(v('CAUTION', [c('DTE_NONE', 'caution')]))?.action?.id).toBe('compare-sites'))
  test('nogo gana a caution aunque la familia vaya después', () => {
    expect(worstCheck([c('SLOPE_MODERATE', 'caution'), c('SUN_CRITICAL', 'nogo')])?.code).toBe('SUN_CRITICAL')
  })
  test('a igual nivel: pendiente, después Sol, después Tierra', () => {
    expect(worstCheck([c('DTE_NONE', 'caution'), c('SUN_LIMITED', 'caution'), c('SLOPE_MODERATE', 'caution')])?.code).toBe('SLOPE_MODERATE')
    expect(worstCheck([c('DTE_NONE', 'caution'), c('SUN_LIMITED', 'caution')])?.code).toBe('SUN_LIMITED')
  })
  test('los checks en ok y los códigos desconocidos no cuentan', () => {
    expect(worstCheck([c('SLOPE_SAFE', 'ok'), c('NEW_RULE', 'nogo')])).toBeNull()
    expect(sim(v('CAUTION', [c('NEW_RULE', 'caution')]))?.id).toBe('caution')
  })
  test('el tono sigue al veredicto', () => expect(sim(v('NO-GO', [c('SUN_CRITICAL', 'nogo')]))?.tone).toBe('nogo'))
})

describe('Errores (§3.5)', () => {
  test.each([
    ['ERR_NETWORK', 'try-again'], ['ERR_UPSTREAM_SERVICE', 'try-again'], ['ERR_TERRAIN_UNAVAILABLE', 'change-site'],
    ['ERR_DATE_OUT_OF_RANGE', 'change-date'], ['ERR_INVALID_COORDINATES', 'fix-coordinates'], ['ERR_INVALID_PAYLOAD', 'review-setup'],
  ])('%s → %s', (code, action) => expect(sim({ error: code })?.action?.id).toBe(action))
  test('un código desconocido queda a la vista para soporte', () => {
    const s = sim({ error: 'ERR_UNKNOWN' })!
    expect([s.id, s.code]).toEqual(['error:unknown', 'ERR_UNKNOWN'])
  })
})

describe('Compare, History y Missions (§3.6)', () => {
  const cmp = (o: Partial<Parameters<typeof nextStepCompare>[0]>) => nextStepCompare({ count: 0, hasSite: false, comparing: false, error: null, best: null, ...o })
  test('sin escenarios, ofrece agregar la simulación actual solo si hay sitio', () => {
    expect(cmp({})?.action).toBeUndefined()
    expect(cmp({ hasSite: true })?.action?.id).toBe('add-current')
  })
  test('con uno, sugiere +7 días', () => expect(cmp({ count: 1 })?.action?.id).toBe('add-plus-7'))
  test('con dos o más sin comparar, nada: "Compare scenarios" ya es la acción', () => expect(cmp({ count: 2 })).toBeNull())
  test('comparando, nada', () => expect(cmp({ count: 3, comparing: true })).toBeNull())
  test('el mejor es GO o CAUTION: abrirlo en Simulate', () => {
    const s = cmp({ count: 3, best: { letter: 'B', site: 'Peak Near Shackleton', startUtc: '2026-12-13T00:00:00Z', status: 'CAUTION' } })!
    expect([s.text, s.action?.id]).toEqual(['B: Peak Near Shackleton, Dec 13, 2026 ranks first.', 'open-in-simulate'])
  })
  test('el mejor es NO-GO: el menos malo, y agregar otros', () => {
    expect(cmp({ count: 2, best: { letter: 'A', site: 'Shackleton Rim', startUtc: '2026-12-01T00:00:00Z', status: 'NO-GO' } })?.id).toBe('compare:least-bad')
  })
  test('error de comparación', () => expect(cmp({ count: 2, error: 'ERR_NETWORK' })?.action?.id).toBe('compare-again'))
  test('History vacío y sin corrida elegida', () => {
    expect(nextStepHistory({ runs: 0, picked: false })?.action?.id).toBe('start-simulation')
    expect(nextStepHistory({ runs: 2, picked: false })?.id).toBe('history:pick')
    expect(nextStepHistory({ runs: 2, picked: true })).toBeNull()
  })
  test('Missions reproducida: abrirla como simulación', () => {
    expect(nextStepMissions({ picked: true, replayed: true })?.action?.id).toBe('open-as-simulation')
    expect(nextStepMissions({ picked: true, replayed: false })).toBeNull()
  })
})
