import { useMemo } from 'react'
import * as THREE from 'three'
import type { TerrainPatch } from '@/types'
import { blurHeights, edgeFade, normalsFromHeights, slopeColor, smoothingPasses } from './terrainLook'

// D-008: elevations_m row-major Norte->Sur, Oeste->Este; PlaneGeometry rotada -90° en X.
// El color sale de `slopes_deg` del backend (escala de este parche); el sombreado, de la geometría y del Sol real.
export function TerrainMesh({ patch, exaggeration = 1 }: { patch: TerrainPatch; exaggeration?: number }) {
  const geometry = useMemo(() => {
    const { size_km, resolution: n, elevations_m, slopes_deg, cell_size_m, native_resolution_m } = patch.grid
    const size = size_km * 1000
    const g = new THREE.PlaneGeometry(size, size, n - 1, n - 1)
    g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position
    const maxSlope = slopes_deg?.length ? Math.max(...slopes_deg) : 0
    const colors = new Float32Array(pos.count * 4)
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, (elevations_m[i] - patch.center.elevation_m) * exaggeration)
      const [r, gg, b] = slopeColor(slopes_deg?.[i] ?? 0, maxSlope)
      colors.set([r, gg, b, edgeFade(pos.getX(i), pos.getZ(i), size / 2)], i * 4)
    }
    // Normales sobre una copia suavizada: la forma es la del dato, el sombreado no muestra las facetas de la interpolación
    const smooth = blurHeights(elevations_m, n, smoothingPasses(native_resolution_m, cell_size_m))
    g.setAttribute('normal', new THREE.BufferAttribute(normalsFromHeights(smooth, n, cell_size_m, exaggeration), 3))
    g.setAttribute('color', new THREE.BufferAttribute(colors, 4))
    pos.needsUpdate = true
    return g
  }, [patch, exaggeration])
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial vertexColors transparent roughness={1} metalness={0} />
    </mesh>
  )
}
