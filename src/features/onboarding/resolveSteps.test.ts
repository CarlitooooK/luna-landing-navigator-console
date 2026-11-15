import { describe, expect, test } from 'vitest'
import { TOUR_SCENARIO, autoStart, migrateOnboarding, resolveSteps, tourParam, tourScenario, type TourInput } from './steps'

const SITES = [{ id: 'shackleton-rim', name: 'Shackleton Rim' }, { id: 'apollo-11', name: 'Apollo 11' }]
const base: TourInput = { selected: null, startUtc: '2026-12-13T00:00:00Z', sites: SITES, evaluated: false, offline: false,
  globe: true, terrain: true, viewMode: 'globe', detail: 'simple' }
const ran: TourInput = { ...base, selected: { id: 'shackleton-rim', label: 'Shackleton Rim' }, evaluated: true }
const step = (st: TourInput, id: string) => resolveSteps(st).find((s) => s.id === id)

describe('variantes de design.md §1.3', () => {
  test('completo: siete pasos en orden, con sus anclas', () => {
    expect(resolveSteps(ran).map((s) => s.anchor)).toEqual([null, 'setup', 'results', 'timeline', 'scene', 'detail', 'rail'])
  })
  test('sin sitio: "Try Apollo 11"', () => {
    expect(step(base, 'setup')!.action).toEqual({ id: 'try-scenario', label: 'Try Apollo 11' })
  })
  test('ya hay sitio: sin "Try" y el texto empieza con "You picked"', () => {
    const s = step({ ...base, selected: { id: 'shackleton-rim', label: 'Shackleton Rim' } }, 'setup')!
    expect(s.action).toEqual({ id: 'run', label: 'Run simulation' })
    expect(s.text.startsWith('You picked Shackleton Rim.')).toBe(true)
  })
  test('con el escenario del tour cargado, su texto propio', () => {
    const s = step({ ...base, selected: { id: 'apollo-11', label: 'Apollo 11' } }, 'setup')!
    expect(s.text).toMatch(/^Apollo 11 on Dec 13, 2026.*Run the simulation/)
    expect(step({ ...base, selected: { id: 'apollo-11', label: 'Apollo 11' }, evaluated: true }, 'setup')!.text).toMatch(/Press Next/)
  })
  test('hay evaluación: "Run again"', () => {
    expect(step(ran, 'setup')!.action!.label).toBe('Run again')
  })
  test('sin evaluación: Results lo anuncia y el timeline va centrado, sin Play', () => {
    expect(step(base, 'results')!.text).toMatch(/after you run a simulation/)
    expect(step(base, 'timeline')!.anchor).toBeNull()
    expect(step(base, 'timeline')!.action).toBeUndefined()
  })
  test('sin píldoras (sin evaluación) se omite la escena y el contador baja a 6', () => {
    expect(resolveSteps(base)).toHaveLength(6)
    expect(step(base, 'scene')).toBeUndefined()
  })
  test('sin globo y sin terreno tampoco hay escena', () => {
    expect(resolveSteps({ ...ran, globe: false, terrain: false })).toHaveLength(6)
  })
  test('sin globo: solo la frase de Terrain detail, o la de Global view con la escena local de fondo', () => {
    const s = step({ ...ran, globe: false }, 'scene')!
    expect(s.text).toMatch(/^Terrain detail/)
    expect(s.text).not.toMatch(/Horizon view|Landing scene/)
    expect(s.action).toBeUndefined()
    expect(step({ ...ran, globe: false, viewMode: 'site' }, 'scene')!.text).toMatch(/^Global view/)
  })
  test('sin backend: Setup sin acciones y con la nota; Results y timeline sin evaluación', () => {
    const off = { ...ran, offline: true }
    expect(step(off, 'setup')!.action).toBeUndefined()
    expect(step(off, 'setup')!.note).toMatch(/unreachable/)
    expect(step(off, 'results')!.text).toMatch(/after you run/)
    expect(step(off, 'timeline')!.anchor).toBeNull()
  })
  test('con Horizon view ya abierta, el paso de escena la describe y no ofrece el botón', () => {
    const s = step({ ...ran, horizon: true }, 'scene')!
    expect(s.action).toBeUndefined()
    expect(s.text).toMatch(/^You are on the ground now/)
    expect(resolveSteps({ ...ran, horizon: true })).toHaveLength(7)
  })
  test('el botón de detalle dice el modo al que lleva', () => {
    expect(step(ran, 'detail')!.action!.label).toBe('Show Detailed')
    expect(step({ ...ran, detail: 'detailed' }, 'detail')!.action!.label).toBe('Show Simple')
  })
})

describe('escenario del tour', () => {
  test('Apollo 11 con la fecha y duración del tour', () => {
    expect(tourScenario(SITES, '2030-01-01T00:00:00Z')).toEqual({ siteId: 'apollo-11', label: 'Apollo 11',
      startUtc: TOUR_SCENARIO.startUtc, durationDays: TOUR_SCENARIO.durationDays })
  })
  test('sin apollo-11 en /sites: el primer sitio con la fecha de Setup', () => {
    const only = [{ id: 'shackleton-rim', name: 'Shackleton Rim' }]
    expect(tourScenario(only, '2030-01-01T00:00:00Z')).toEqual({ siteId: 'shackleton-rim', label: 'Shackleton Rim', startUtc: '2030-01-01T00:00:00Z' })
    expect(step({ ...base, sites: only }, 'setup')!.action!.label).toBe('Try Shackleton Rim')
  })
  test('sin sitios no hay botón "Try"', () => {
    expect(step({ ...base, sites: [] }, 'setup')!.action).toBeUndefined()
  })
})

describe('autoarranque y URL', () => {
  test('?tour=0 y ?tour=1', () => {
    expect(tourParam('?tour=0')).toBe('0')
    expect(tourParam('?x=2&tour=1')).toBe('1')
    expect(tourParam('?tour=yes')).toBeNull()
    expect(tourParam('')).toBeNull()
  })
  test('unseen abre en la invitación; dismissed y completed no se abren solos', () => {
    expect(autoStart('unseen', null)).toBe(0)
    expect(autoStart('dismissed', null)).toBeNull()
    expect(autoStart('completed', null)).toBeNull()
  })
  test('?tour=0 lo suprime siempre; ?tour=1 lo abre desde el paso 2', () => {
    expect(autoStart('unseen', '0')).toBeNull()
    expect(autoStart('completed', '1')).toBe(1)
  })
})

describe('persistencia', () => {
  test('sin version ni datos válidos vuelve a unseen', () => {
    expect(migrateOnboarding(undefined)).toEqual({ tour: { status: 'unseen', at: null } })
    expect(migrateOnboarding({ seen: true })).toEqual({ tour: { status: 'unseen', at: null } })
    expect(migrateOnboarding({ tour: { status: 'raro' } })).toEqual({ tour: { status: 'unseen', at: null } })
  })
  test('conserva un estado conocido y su fecha', () => {
    expect(migrateOnboarding({ tour: { status: 'completed', at: '2026-11-14T00:00:00Z' } }))
      .toEqual({ tour: { status: 'completed', at: '2026-11-14T00:00:00Z' } })
  })
})
