// Funciones puras del aspecto de "Terrain detail": sin React ni three, con pruebas.
// Todo se calcula sobre la geometría y las pendientes que entrega /terrain/patch (D-002: solo se dibuja).

import type { TerrainPatch } from '@/types'

/** Estado del encuadre vertical y color: exageración elegida por la persona (1 = escala real). */
export const EXAGGERATIONS = [1, 2, 4] as const
export type Exaggeration = (typeof EXAGGERATIONS)[number]

/** Tamaño angular real de los astros vistos desde la Luna (radio, grados). */
export const SUN_ANGULAR_RADIUS_DEG = 0.267
export const EARTH_ANGULAR_RADIUS_DEG = 0.95
/** Distancia a la que se pintan Sol y Tierra en la escena (m): solo cuenta la dirección y el tamaño angular. */
export const SKY_DISTANCE_M = 40_000
export const angularRadiusM = (deg: number, distanceM = SKY_DISTANCE_M) => distanceM * Math.tan((deg * Math.PI) / 180)

/** Pendiente → color (RGB 0..1): del gris del regolito a ámbar según la escala de ESTE parche (sin umbrales inventados). */
export const SLOPE_LOW: [number, number, number] = [0.5, 0.49, 0.47]
export const SLOPE_HIGH: [number, number, number] = [0.8, 0.52, 0.26]
export function slopeColor(slopeDeg: number, maxSlopeDeg: number): [number, number, number] {
  const t = maxSlopeDeg > 0 ? Math.min(1, Math.max(0, slopeDeg / maxSlopeDeg)) ** 0.8 : 0
  return [0, 1, 2].map((i) => SLOPE_LOW[i] + (SLOPE_HIGH[i] - SLOPE_LOW[i]) * t) as [number, number, number]
}

/** Opacidad por distancia al centro: 1 hasta el 88 % del radio y 0 en el borde, para que el parche no termine en un corte recto. */
export function edgeFade(x: number, z: number, halfSizeM: number): number {
  const r = Math.max(Math.abs(x), Math.abs(z)) / halfSizeM // 0 en el centro, 1 en el borde
  if (r <= 0.88) return 1
  if (r >= 1) return 0
  const u = (1 - r) / 0.12
  return u * u * (3 - 2 * u)
}

/** Desenfoque de caja (3×3) repetido: solo para calcular normales suaves; la geometría no se toca. */
export function blurHeights(h: ArrayLike<number>, n: number, passes: number): Float32Array {
  let src = Float32Array.from(h as ArrayLike<number>)
  for (let p = 0; p < passes; p++) {
    const dst = new Float32Array(src.length)
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        let sum = 0
        let cnt = 0
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const rr = r + dr
            const cc = c + dc
            if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue
            sum += src[rr * n + cc]
            cnt++
          }
        }
        dst[r * n + c] = sum / cnt
      }
    }
    src = dst
  }
  return src
}

/**
 * Pasadas de suavizado para las normales: si el dato nativo es mucho más grueso que la celda del parche
 * (p. ej. 474 m nativos en celdas de 47 m), el relieve se ve en facetas; se suaviza el sombreado, no los datos.
 */
export function smoothingPasses(nativeResolutionM: number | null | undefined, cellSizeM: number): number {
  if (!nativeResolutionM || cellSizeM <= 0) return 0
  return Math.max(0, Math.min(6, Math.round(nativeResolutionM / cellSizeM / 3)))
}

/** Normales por diferencias centrales en el marco de la escena (+X Este, +Y arriba, -Z Norte). Fila 0 = Norte. */
export function normalsFromHeights(h: ArrayLike<number>, n: number, cellM: number, exaggeration: number): Float32Array {
  const out = new Float32Array(n * n * 3)
  const at = (r: number, c: number) => h[Math.min(n - 1, Math.max(0, r)) * n + Math.min(n - 1, Math.max(0, c))] * exaggeration
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const dx = (at(r, c + 1) - at(r, c - 1)) / (2 * cellM) // pendiente hacia el Este
      const dzNorth = (at(r - 1, c) - at(r + 1, c)) / (2 * cellM) // pendiente hacia el Norte (la fila anterior es más al Norte)
      // normal = (-dh/dEste, 1, +dh/dNorte) con -Z = Norte  →  z = +dzNorth
      const nx = -dx
      const ny = 1
      const nz = dzNorth
      const len = Math.hypot(nx, ny, nz)
      const i = (r * n + c) * 3
      out[i] = nx / len
      out[i + 1] = ny / len
      out[i + 2] = nz / len
    }
  }
  return out
}

/** Datos para la leyenda: escala de pendiente de este parche y de dónde sale el relieve. */
export function terrainLegend(patch: TerrainPatch) {
  const g = patch.grid
  const maxSlope = g.slopes_deg?.length ? Math.max(...g.slopes_deg) : 0
  const source = g.source === 'lola_polar' ? 'LOLA polar' : g.source === 'lola_global' ? 'LOLA global' : g.source === 'synthetic' ? 'Synthetic (not real terrain)' : 'LOLA'
  return {
    maxSlopeDeg: maxSlope,
    reliefM: g.max_elevation_m - g.min_elevation_m,
    source,
    nativeM: g.native_resolution_m ?? null,
    sizeKm: g.size_km,
    synthetic: g.source === 'synthetic',
  }
}
