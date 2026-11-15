import { useMissionStore } from '@/core/store/useMissionStore'
import { vec } from '@/core/utils/coordinates'
import { EARTH_ANGULAR_RADIUS_DEG, SKY_DISTANCE_M, SUN_ANGULAR_RADIUS_DEG, angularRadiusM } from './terrainLook'

const scale = (v: [number, number, number], k: number) => v.map((x) => x * k) as [number, number, number]

/**
 * Luz y astros del paso actual del scrubber (capa 3: lee `timeline[stepIndex]` de memoria, cero red).
 * La dirección y la visibilidad vienen del backend; el tamaño de cada astro es su tamaño angular real.
 * Con el Sol oculto la luz casi se apaga y solo queda la luz de la Tierra.
 */
export function CelestialBodies() {
  const point = useMissionStore((s) => s.evaluation?.timeline[s.stepIndex])
  if (!point) return <hemisphereLight args={['#9fb4d8', '#101014', 0.6]} />
  const sunDir = vec(point.sun_vector_3d)
  const earthDir = vec(point.earth_vector_3d)
  return (
    <>
      <hemisphereLight args={['#9fb4d8', '#101014', point.sun_visible ? 0.4 : 1]} />
      <directionalLight
        position={scale(sunDir, 12_000)} intensity={point.sun_visible ? 2.3 : 0} color="#fff1d6" castShadow
        shadow-mapSize={[4096, 4096]} shadow-camera-left={-7000} shadow-camera-right={7000} shadow-camera-top={7000} shadow-camera-bottom={-7000}
        shadow-camera-near={100} shadow-camera-far={30_000} shadow-bias={-0.0004} shadow-normalBias={3}
      />
      {/* Luz de la Tierra: poca, pero es la que da forma al relieve cuando el Sol está oculto (la escala está realzada) */}
      <directionalLight position={scale(earthDir, 12_000)} intensity={point.earth_visible ? (point.sun_visible ? 0.15 : 0.9) : 0} color="#b9d0f5" />
      <mesh position={scale(sunDir, SKY_DISTANCE_M)}>
        <sphereGeometry args={[angularRadiusM(SUN_ANGULAR_RADIUS_DEG), 24, 16]} />
        <meshBasicMaterial color="#fff6e0" toneMapped={false} fog={false} transparent opacity={point.sun_visible ? 1 : 0.18} />
      </mesh>
      <mesh position={scale(earthDir, SKY_DISTANCE_M)}>
        <sphereGeometry args={[angularRadiusM(EARTH_ANGULAR_RADIUS_DEG), 32, 20]} />
        <meshBasicMaterial color="#5b9bd5" toneMapped={false} fog={false} transparent opacity={point.earth_visible ? 1 : 0.18} />
      </mesh>
    </>
  )
}
