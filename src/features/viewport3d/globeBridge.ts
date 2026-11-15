// Funciones puras del puente con el globo (sin React, sin red): fáciles de probar.
import type { Ephemeris, Evaluation, PsrList, PsrNearby, Site } from '@/types'
import type { Scenario, SelectedSite } from '@/core/store/useMissionStore'
import type { CompareResponse } from '@/types'
import { rank, type Priority } from '@/core/utils/compare'
import type { FromGlobe, GlobeComparePin, GlobePsr, GlobeSite, SkyBody, ToGlobe, Vec3 } from './globeProtocol'

/** Si el globo no avisa READY en este tiempo se considera no disponible y la consola sigue con su escena local. */
export const READY_TIMEOUT_MS = 8000

const sameSpot = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) =>
  Math.abs(a.lat - b.lat) < 1e-6 && Math.abs(a.lon - b.lon) < 1e-6

/** Sitios para los pines. El estado GO/CAUTION/NO-GO solo se conoce del sitio evaluado (es el que dio el backend). */
export function toGlobeSites(sites: Site[], evaluation: Evaluation | null): GlobeSite[] {
  return sites.map((s) => ({
    id: s.id, name: s.name, category: s.category, lat: s.lat, lon: s.lon,
    status: evaluation && sameSpot(evaluation.site, s) ? evaluation.site.status : undefined,
  }))
}

const isVec3 = (v: unknown): v is Vec3 => Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number' && Number.isFinite(n))

/**
 * Sol y Tierra del paso actual del scrubber, tal cual los entrega el backend (D-002, D-006: el cliente no calcula física).
 * Vacío si no hay evaluación, el paso no existe o el vector no es válido: el globo no inventa un Sol.
 */
export function skyMessages(evaluation: Evaluation | null, stepIndex: number): ToGlobe[] {
  const tp = evaluation?.timeline[stepIndex]
  if (!evaluation || !tp) return []
  const { lat, lon } = evaluation.site
  const out: ToGlobe[] = []
  if (isVec3(tp.sun_vector_3d)) out.push({ type: 'SET_SUN_LOCAL', payload: { lat, lon, vector: tp.sun_vector_3d } })
  if (isVec3(tp.earth_vector_3d)) out.push({ type: 'SET_EARTH_LOCAL', payload: { lat, lon, vector: tp.earth_vector_3d } })
  return out
}

/** Perfil de horizonte de `evaluate`, tal cual: la silueta que el globo dibuja es la que muestra el panel Horizon 360°. */
export function horizonMessage(evaluation: Evaluation | null): ToGlobe | null {
  if (!evaluation || evaluation.horizon_profile.length < 8) return null
  const { lat, lon } = evaluation.site
  return { type: 'SET_HORIZON', payload: { lat, lon, profile: evaluation.horizon_profile.map((p) => ({ az_deg: p.az_deg, horizon_el_deg: p.horizon_el_deg })) } }
}

/** Azimut, elevación, horizonte del terreno y visibilidad de Sol y Tierra en el paso actual (D-002: solo se dibuja). */
export function skyStateMessage(evaluation: Evaluation | null, stepIndex: number): ToGlobe | null {
  const t = evaluation?.timeline[stepIndex]
  if (!t) return null
  const body = (az: number, el: number, horizonEl: number, visible: boolean): SkyBody | null =>
    [az, el, horizonEl].every((n) => typeof n === 'number' && Number.isFinite(n)) ? { az, el, horizonEl, visible } : null
  const sun = body(t.sun_az_deg, t.sun_el_deg, t.sun_horizon_el_deg, t.sun_visible)
  const earth = body(t.earth_az_deg, t.earth_el_deg, t.earth_horizon_el_deg, t.earth_visible)
  return sun && earth ? { type: 'SET_SKY_STATE', payload: { sun, earth } } : null
}

/**
 * Cielo de la vista global: Sol y Tierra desde el centro de la Luna, tal cual `GET /ephemeris` (D-002: no se calcula nada).
 * Solo se usa sin evaluación; con una evaluación el cielo sale de los vectores del sitio (`skyMessages`).
 */
export function skyGlobalMessage(eph: Ephemeris | null): ToGlobe | null {
  if (!eph || !isVec3(eph.sun.direction) || !isVec3(eph.earth.direction)) return null
  const km = eph.earth.distance_km
  return { type: 'SET_SKY_GLOBAL', payload: { sun: { direction: eph.sun.direction }, earth: { direction: eph.earth.direction, distanceKm: Number.isFinite(km) && km > 0 ? km : undefined } } }
}

/** Pines A–E. Con comparación hecha llevan el estado del backend y el recomendado según el criterio elegido (`rank`). */
export function comparePins(scenarios: Scenario[], comparison: CompareResponse | null, priority: Priority): GlobeComparePin[] {
  const best = comparison ? rank(comparison.results, priority)[0] : undefined
  return scenarios.map((s, i) => {
    const r = comparison?.results[i]
    return { id: s.key, label: String.fromCharCode(65 + i), lat: s.site.lat, lon: s.site.lon, status: r?.site.status, best: !!r && r === best }
  })
}

/** Mismo lugar (aunque cambie la fecha o el nombre): el globo no necesita volar de nuevo. */
export const samePlace = (a: { lat: number; lon: number } | null | undefined, b: { lat: number; lon: number } | null | undefined): boolean =>
  !!a && !!b && sameSpot(a, b)

/** Marcador para un lugar elegido que no es un sitio del catálogo (clic libre en el globo o una misión). */
export function customPinMessage(selected: SelectedSite | null, sites: Site[]): Extract<ToGlobe, { type: 'SET_CUSTOM_PIN' }> {
  if (!selected || sites.some((s) => s.id === selected.id)) return { type: 'SET_CUSTOM_PIN', payload: null }
  return { type: 'SET_CUSTOM_PIN', payload: { lat: selected.lat, lon: selected.lon, label: selected.label } }
}

/** PSR de `GET /psr` (catálogo del polo) o de `GET /psr/nearby` (un sitio), sin tocar. */
export function globalPsrItems(psrs: PsrList | null): GlobePsr[] {
  return (psrs?.psrs ?? []).map((p) => ({ gid: p.gid, name: p.name, geometry: p.geometry }))
}

/** PSR de `GET /psr/nearby`, sin tocar. */
export const psrItems = (psrs: PsrNearby | null): GlobePsr[] =>
  (psrs?.psrs ?? []).map((p) => ({ gid: p.gid, name: p.name, geometry: p.geometry }))

/** Escena de alunizaje en el sitio evaluado. Solo lat/lon: el resto son decisiones de cámara con valores por defecto del globo. */
export function landingMessage(evaluation: Evaluation | null, opts: { astronaut?: boolean } = {}): ToGlobe | null {
  if (!evaluation) return null
  return { type: 'PLAY_LANDING_SCENE', payload: { lat: evaluation.site.lat, lon: evaluation.site.lon, ...(opts.astronaut === false ? { astronaut: false } : {}) } }
}

/** Acepta solo mensajes del iframe del globo y de su origen exacto (docs/11 §3, seguridad). */
export function fromGlobe(e: { source: unknown; origin: string; data: unknown }, frameWindow: unknown, origin: string): FromGlobe | null {
  if (!frameWindow || e.source !== frameWindow || e.origin !== origin) return null
  const d = e.data as { type?: unknown } | null
  if (!d || typeof d !== 'object' || typeof d.type !== 'string') return null
  return d as FromGlobe
}
