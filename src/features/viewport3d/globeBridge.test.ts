import { describe, expect, it } from 'vitest'
import { comparePins, customPinMessage, samePlace, fromGlobe, globalPsrItems, horizonMessage, skyGlobalMessage, landingMessage, psrItems, skyMessages, skyStateMessage, toGlobeSites } from './globeBridge'
import type { CompareResponse, Ephemeris, Evaluation, PsrList, PsrNearby, Site } from '@/types'
import type { Scenario } from '@/core/store/useMissionStore'

const site = (o: Partial<Site> = {}) => ({ id: 'a', name: 'A', category: 'Artemis III', lat: -84.79, lon: 31.2, ...o }) as Site
const evaluation = (o: Record<string, unknown> = {}) =>
  ({
    site: { lat: -84.79, lon: 31.2, status: 'NO-GO' },
    timeline: [
      { sun_vector_3d: [0.1, 0.2, -0.9], earth_vector_3d: [-0.5, 0.1, -0.8] },
      { sun_vector_3d: [0.3, 0.1, -0.9], earth_vector_3d: [-0.4, 0.1, -0.9] },
    ],
    ...o,
  }) as unknown as Evaluation

describe('toGlobeSites', () => {
  it('copia los campos del contrato y marca el estado solo del sitio evaluado', () => {
    const out = toGlobeSites([site(), site({ id: 'b', name: 'B', lat: -88, lon: 10 })], evaluation())
    expect(out[0]).toEqual({ id: 'a', name: 'A', category: 'Artemis III', lat: -84.79, lon: 31.2, status: 'NO-GO' })
    expect(out[1].status).toBeUndefined()
  })
  it('sin evaluación no inventa estados', () => {
    expect(toGlobeSites([site()], null)[0].status).toBeUndefined()
  })
})

describe('skyMessages', () => {
  it('envía los vectores del paso tal cual, con lat/lon del sitio evaluado', () => {
    const m = skyMessages(evaluation(), 1)
    expect(m).toEqual([
      { type: 'SET_SUN_LOCAL', payload: { lat: -84.79, lon: 31.2, vector: [0.3, 0.1, -0.9] } },
      { type: 'SET_EARTH_LOCAL', payload: { lat: -84.79, lon: 31.2, vector: [-0.4, 0.1, -0.9] } },
    ])
  })
  it('no envía nada sin evaluación o con un paso inexistente', () => {
    expect(skyMessages(null, 0)).toEqual([])
    expect(skyMessages(evaluation(), 99)).toEqual([])
  })
  it('descarta vectores inválidos en lugar de inventar un Sol', () => {
    const bad = evaluation({ timeline: [{ sun_vector_3d: [1, 2], earth_vector_3d: [0, 1, Number.NaN] }] })
    expect(skyMessages(bad, 0)).toEqual([])
  })
})

describe('horizonMessage', () => {
  const profile = Array.from({ length: 360 }, (_, az) => ({ az_deg: az, horizon_el_deg: 1 + az / 100 }))
  it('envía el perfil de 360° tal cual con lat/lon del sitio evaluado', () => {
    const m = horizonMessage(evaluation({ horizon_profile: profile }))
    expect(m).toEqual({ type: 'SET_HORIZON', payload: { lat: -84.79, lon: 31.2, profile } })
  })
  it('sin evaluación o con un perfil incompleto no envía nada', () => {
    expect(horizonMessage(null)).toBeNull()
    expect(horizonMessage(evaluation({ horizon_profile: profile.slice(0, 3) }))).toBeNull()
  })
})

describe('skyStateMessage', () => {
  const t = (o = {}) => ({ sun_az_deg: 5.4, sun_el_deg: 6.5, sun_horizon_el_deg: 1.9, sun_visible: true,
    earth_az_deg: 322.1, earth_el_deg: 10.4, earth_horizon_el_deg: 3.2, earth_visible: true, ...o })
  it('copia azimut, elevación, horizonte y visibilidad del paso', () => {
    expect(skyStateMessage(evaluation({ timeline: [t()] }), 0)).toEqual({
      type: 'SET_SKY_STATE',
      payload: { sun: { az: 5.4, el: 6.5, horizonEl: 1.9, visible: true }, earth: { az: 322.1, el: 10.4, horizonEl: 3.2, visible: true } },
    })
  })
  it('conserva "oculto" cuando el astro queda bajo el terreno', () => {
    const m = skyStateMessage(evaluation({ timeline: [t({ sun_visible: false, sun_el_deg: 1.0 })] }), 0)
    expect(m && m.type === 'SET_SKY_STATE' && m.payload.sun.visible).toBe(false)
  })
  it('descarta pasos inexistentes o con números inválidos', () => {
    expect(skyStateMessage(null, 0)).toBeNull()
    expect(skyStateMessage(evaluation({ timeline: [t()] }), 5)).toBeNull()
    expect(skyStateMessage(evaluation({ timeline: [t({ sun_az_deg: Number.NaN })] }), 0)).toBeNull()
  })
})

describe('landingMessage', () => {
  it('usa solo lat/lon del sitio evaluado (el resto lo decide el globo)', () => {
    expect(landingMessage(evaluation())).toEqual({ type: 'PLAY_LANDING_SCENE', payload: { lat: -84.79, lon: 31.2 } })
    expect(landingMessage(null)).toBeNull()
  })
})

describe('psrItems', () => {
  it('pasa los PSR sin tocar la geometría', () => {
    const geometry = { type: 'MultiPolygon', coordinates: [[[[1, 2], [3, 4], [5, 6]]]] }
    const out = psrItems({ psrs: [{ gid: 7, name: null, distance_km: 3, geometry }] } as unknown as PsrNearby)
    expect(out).toEqual([{ gid: 7, name: null, geometry }])
    expect(psrItems(null)).toEqual([])
  })
})

describe('fromGlobe (seguridad)', () => {
  const win = {}
  const ok = { source: win, origin: 'http://localhost:5174', data: { type: 'READY' } }
  it('acepta solo el iframe del globo y su origen exacto', () => {
    expect(fromGlobe(ok, win, 'http://localhost:5174')).toEqual({ type: 'READY' })
    expect(fromGlobe({ ...ok, origin: 'http://evil.example' }, win, 'http://localhost:5174')).toBeNull()
    expect(fromGlobe({ ...ok, source: {} }, win, 'http://localhost:5174')).toBeNull()
    expect(fromGlobe(ok, null, 'http://localhost:5174')).toBeNull()
  })
  it('descarta datos que no son mensajes', () => {
    expect(fromGlobe({ ...ok, data: 'hola' }, win, 'http://localhost:5174')).toBeNull()
    expect(fromGlobe({ ...ok, data: null }, win, 'http://localhost:5174')).toBeNull()
    expect(fromGlobe({ ...ok, data: { type: 3 } }, win, 'http://localhost:5174')).toBeNull()
  })
})

describe('skyGlobalMessage', () => {
  const eph = (o: Record<string, unknown> = {}) => ({
    utc: '2026-12-13T00:00:00Z', frame: 'MOON_ME_DE421',
    sun: { direction: [-0.69279, 0.720726, -0.024415], distance_km: 146992684.3 },
    earth: { direction: [0.997851, -0.053579, 0.037717], distance_km: 405170.2 }, ...o,
  }) as unknown as Ephemeris
  it('manda las direcciones y la distancia real a la Tierra tal cual', () => {
    expect(skyGlobalMessage(eph())).toEqual({ type: 'SET_SKY_GLOBAL', payload: {
      sun: { direction: [-0.69279, 0.720726, -0.024415] }, earth: { direction: [0.997851, -0.053579, 0.037717], distanceKm: 405170.2 } } })
  })
  it('sin efemérides o con un vector inválido no inventa un cielo', () => {
    expect(skyGlobalMessage(null)).toBeNull()
    expect(skyGlobalMessage(eph({ sun: { direction: [1, 2], distance_km: 1 } }))).toBeNull()
  })
})

describe('comparePins', () => {
  const sc = (key: string, lat: number): Scenario => ({ key, label: key, startUtc: '2026-12-13T00:00:00Z', site: { lat, lon: 10, label: key } })
  const res = (status: string, sun: number, earth: number) => ({ site: { status }, summary: { sun_visible_pct: sun, earth_visible_pct: earth } })
  const cmp = (...r: ReturnType<typeof res>[]) => ({ results: r }) as unknown as CompareResponse
  it('antes de comparar solo hay letras y lugares, sin estado ni recomendado', () => {
    expect(comparePins([sc('a', -80), sc('b', -85)], null, 'balanced')).toEqual([
      { id: 'a', label: 'A', lat: -80, lon: 10, status: undefined, best: false },
      { id: 'b', label: 'B', lat: -85, lon: 10, status: undefined, best: false }])
  })
  it('resalta el recomendado según el criterio y copia el estado del backend', () => {
    const c = cmp(res('GO', 90, 10), res('GO', 50, 80), res('NO-GO', 99, 99))
    const power = comparePins([sc('a', -80), sc('b', -81), sc('c', -82)], c, 'power')
    expect(power.map((p) => p.best)).toEqual([true, false, false])
    expect(power.map((p) => p.status)).toEqual(['GO', 'GO', 'NO-GO'])
    expect(comparePins([sc('a', -80), sc('b', -81), sc('c', -82)], c, 'earth').map((p) => p.best)).toEqual([false, true, false])
  })
})

describe('customPinMessage', () => {
  const sel = (o = {}) => ({ lat: -85, lon: 20, label: 'Custom pin', ...o })
  it('un sitio del catálogo no lleva marcador propio', () => {
    expect(customPinMessage(sel({ id: 'a' }), [site()])).toEqual({ type: 'SET_CUSTOM_PIN', payload: null })
    expect(customPinMessage(null, [site()])).toEqual({ type: 'SET_CUSTOM_PIN', payload: null })
  })
  it('un clic libre o una misión sí', () => {
    expect(customPinMessage(sel(), [site()])).toEqual({ type: 'SET_CUSTOM_PIN', payload: { lat: -85, lon: 20, label: 'Custom pin' } })
    expect(customPinMessage(sel({ id: 'mission:im-1', label: 'IM-1 Odysseus' }), [site()]).payload).toMatchObject({ label: 'IM-1 Odysseus' })
  })
})

describe('globalPsrItems', () => {
  it('copia gid, nombre y geometría del catálogo', () => {
    const l = { psrs: [{ gid: 1, name: 'X', area_km2: 100, label_point: {}, geometry: { type: 'MultiPolygon', coordinates: [] } }] } as unknown as PsrList
    expect(globalPsrItems(l)).toEqual([{ gid: 1, name: 'X', geometry: { type: 'MultiPolygon', coordinates: [] } }])
    expect(globalPsrItems(null)).toEqual([])
  })
})

describe('landingMessage con opciones', () => {
  it('el astronauta va solo cuando se apaga (el globo lo trae por defecto)', () => {
    expect(landingMessage(evaluation(), { astronaut: false })).toEqual({ type: 'PLAY_LANDING_SCENE', payload: { lat: -84.79, lon: 31.2, astronaut: false } })
    expect(landingMessage(evaluation(), { astronaut: true })).toEqual({ type: 'PLAY_LANDING_SCENE', payload: { lat: -84.79, lon: 31.2 } })
  })
})

describe('samePlace', () => {
  it('compara solo lat/lon', () => {
    expect(samePlace({ lat: -80, lon: 1 }, { lat: -80, lon: 1 })).toBe(true)
    expect(samePlace({ lat: -80, lon: 1 }, { lat: -80.1, lon: 1 })).toBe(false)
    expect(samePlace(null, { lat: 0, lon: 0 })).toBe(false)
  })
})
