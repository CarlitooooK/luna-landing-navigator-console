/**
 * Mensajes con el globo lunar (D-011, handoff docs/11 §3).
 * FUENTE ÚNICA del protocolo: README.md del repo del globo (luna-render-nasa-space-challenge).
 * Aquí solo se declaran los mensajes que la consola usa; si el globo cambia uno, se cambia SOLO este archivo.
 */
import type { MissionStatus } from '@/types'

export interface GlobeSite { id: string; name: string; category?: string; lat: number; lon: number; status?: MissionStatus }
/** Un PSR tal como llega de GET /psr/nearby (geometría en metros estereográficos polares sur). */
export interface GlobePsr { gid: number; name?: string | null; geometry: { type: string; coordinates: unknown } }
export type ScenePhase = 'arrival' | 'descent' | 'landed' | 'done'
export type Vec3 = [number, number, number]
export interface SkyBody { az: number; el: number; horizonEl: number; visible: boolean }
/** Pin de un escenario de Compare: `label` es la letra (A–E). */
export interface GlobeComparePin { id: string; label: string; lat: number; lon: number; status?: MissionStatus; best?: boolean }
export type HorizonPhase = 'arrival' | 'ready' | 'leaving'

export type ToGlobe =
  | { type: 'SET_SITES'; payload: GlobeSite[] }
  | { type: 'SELECT_SITE'; payload: { id?: string; lat: number; lon: number; label?: string } }
  /** `sun_vector_3d` / `earth_vector_3d` tal cual, en el marco local del sitio (D-008). Sin Sol enviado, el globo no lo dibuja. */
  | { type: 'SET_SUN_LOCAL'; payload: { lat: number; lon: number; vector: Vec3 } }
  | { type: 'SET_EARTH_LOCAL'; payload: { lat: number; lon: number; vector: Vec3 } }
  | { type: 'SET_PSR'; payload: GlobePsr[] }
  /** `GET /ephemeris` tal cual: Sol y Tierra desde el centro de la Luna (marco fijo lunar). Para la vista global, antes de evaluar. */
  | { type: 'SET_SKY_GLOBAL'; payload: { sun: { direction: Vec3 }; earth: { direction: Vec3; distanceKm?: number } } }
  /** Pines A–E de los escenarios de Compare; el recomendado lleva `best`. Lista vacía los quita. */
  | { type: 'SET_COMPARE_PINS'; payload: GlobeComparePin[] }
  /** Marcador del lugar elegido que no es un sitio del catálogo (clic en el globo o misión). `null` lo quita. */
  | { type: 'SET_CUSTOM_PIN'; payload: { lat: number; lon: number; label?: string } | null }
  /** `horizon_profile` de `POST /evaluate`, tal cual. Va antes de SHOW_HORIZON. */
  | { type: 'SET_HORIZON'; payload: { lat: number; lon: number; profile: { az_deg: number; horizon_el_deg: number }[] } }
  /** Cielo del paso actual del scrubber (campos de `timeline[stepIndex]`). */
  | { type: 'SET_SKY_STATE'; payload: { sun: SkyBody; earth: SkyBody } }
  /** Detiene o reanuda el dibujado del globo (mientras "Terrain detail" lo tapa). */
  | { type: 'SET_PAUSED'; payload: { paused: boolean } }
  | { type: 'SET_HORIZON_DETAIL'; payload: { detailed: boolean } }
  /** Vista de horizonte (Lander POV, docs/05 §5.2): del globo al suelo del sitio. */
  | { type: 'SHOW_HORIZON'; payload: { lat: number; lon: number; headingDeg?: number } }
  | { type: 'EXIT_HORIZON' }
  | { type: 'PLAY_LANDING_SCENE'; payload: { lat: number; lon: number; headingDeg?: number; startAltM?: number; durationS?: number; distanceM?: number; astronaut?: boolean } }
  | { type: 'STOP_LANDING_SCENE' }
  | { type: 'RESET' }

export type FromGlobe =
  | { type: 'READY' }
  | { type: 'SITE_CLICKED'; payload: GlobeSite }
  | { type: 'GLOBE_CLICKED'; payload: { lat: number; lon: number } }
  | { type: 'LOADING'; payload: { pending: number } }
  | { type: 'HORIZON_PHASE'; payload: { phase: HorizonPhase } }
  | { type: 'SCENE_PHASE'; payload: { phase: ScenePhase } }
  /** Curva ILUSTRATIVA de descenso (no es física): rotular siempre como tal. */
  | { type: 'SCENE_TELEMETRY'; payload: { t: number; altM: number; vMps: number } }
  | { type: 'SCENE_ERROR'; payload: { reason: string } }
