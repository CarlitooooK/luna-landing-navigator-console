import { describe, expect, it } from 'vitest'
import { angularRadiusM, blurHeights, edgeFade, normalsFromHeights, slopeColor, smoothingPasses, SLOPE_HIGH, SLOPE_LOW, terrainLegend } from './terrainLook'
import type { TerrainPatch } from '@/types'

describe('slopeColor', () => {
  it('va del gris del regolito al ámbar según la escala del parche', () => {
    expect(slopeColor(0, 10)).toEqual(SLOPE_LOW)
    expect(slopeColor(10, 10)).toEqual(SLOPE_HIGH)
    expect(slopeColor(99, 10)).toEqual(SLOPE_HIGH)
  })
  it('un parche sin pendiente no se tiñe', () => {
    expect(slopeColor(3, 0)).toEqual(SLOPE_LOW)
  })
})

describe('edgeFade', () => {
  it('opaco en el centro, transparente en el borde', () => {
    expect(edgeFade(0, 0, 6000)).toBe(1)
    expect(edgeFade(6000, 0, 6000)).toBe(0)
    const mid = edgeFade(5400, 0, 6000)
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(1)
  })
})

describe('normalsFromHeights', () => {
  it('terreno plano: normal hacia arriba', () => {
    const n = normalsFromHeights(new Float32Array(9), 3, 50, 1)
    expect(n[12]).toBeCloseTo(0)
    expect(n[13]).toBeCloseTo(1)
    expect(n[14]).toBeCloseTo(0)
  })
  it('una rampa que sube al Este inclina la normal hacia el Oeste (-X)', () => {
    const h = new Float32Array([0, 10, 20, 0, 10, 20, 0, 10, 20])
    const n = normalsFromHeights(h, 3, 10, 1)
    expect(n[12]).toBeLessThan(0)
    expect(n[14]).toBeCloseTo(0)
  })
  it('una rampa que sube al Norte (fila 0) inclina la normal hacia el Sur (+Z)', () => {
    const h = new Float32Array([20, 20, 20, 10, 10, 10, 0, 0, 0])
    const n = normalsFromHeights(h, 3, 10, 1)
    expect(n[14]).toBeGreaterThan(0)
  })
  it('la exageración vertical aumenta la inclinación', () => {
    const h = new Float32Array([0, 10, 20, 0, 10, 20, 0, 10, 20])
    expect(Math.abs(normalsFromHeights(h, 3, 10, 4)[12])).toBeGreaterThan(Math.abs(normalsFromHeights(h, 3, 10, 1)[12]))
  })
})

describe('blurHeights / smoothingPasses', () => {
  it('el desenfoque promedia y no cambia el tamaño', () => {
    const h = new Float32Array(9)
    h[4] = 9
    const b = blurHeights(h, 3, 1)
    expect(b).toHaveLength(9)
    expect(b[4]).toBeCloseTo(1)
  })
  it('suaviza más cuanto más grueso es el dato nativo frente a la celda', () => {
    expect(smoothingPasses(20, 47)).toBe(0)
    expect(smoothingPasses(474, 47)).toBe(3)
    expect(smoothingPasses(undefined, 47)).toBe(0)
  })
})

describe('angularRadiusM', () => {
  it('el Sol a 40 km pinta un radio de ~186 m', () => {
    expect(angularRadiusM(0.267)).toBeCloseTo(186.4, 0)
  })
})

describe('terrainLegend', () => {
  const patch = (g: Record<string, unknown>) => ({ grid: { size_km: 12, min_elevation_m: 100, max_elevation_m: 400, slopes_deg: [1, 7.5, 3], ...g } }) as unknown as TerrainPatch
  it('toma la escala y la fuente del parche', () => {
    expect(terrainLegend(patch({ source: 'lola_polar', native_resolution_m: 20 }))).toMatchObject({ maxSlopeDeg: 7.5, reliefM: 300, source: 'LOLA polar', nativeM: 20, synthetic: false })
  })
  it('avisa si el relieve es sintético', () => {
    const l = terrainLegend(patch({ source: 'synthetic' }))
    expect(l.synthetic).toBe(true)
    expect(l.source).toMatch(/not real/)
  })
})
