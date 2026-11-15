import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { useMissionStore } from '@/core/store/useMissionStore'
import { TerrainMesh } from './TerrainMesh'
import { CelestialBodies } from './CelestialBodies'
import { useSiteViewStore } from './useSiteViewStore'

/**
 * Escena local del sitio (dueña la consola, handoff docs/11 §1). Ocupa todo el fondo.
 * Geometría de /terrain/patch con el Sol y la Tierra reales del paso del scrubber, sombras proyectadas por el
 * relieve, color por pendiente y un marcador en el punto de aterrizaje. Cámara oblicua, sin poder bajar del suelo.
 */
export function LunarCanvas() {
  const terrain = useMissionStore((s) => s.terrain)
  const exaggeration = useSiteViewStore((s) => s.exaggeration)
  const minY = terrain ? (terrain.grid.min_elevation_m - terrain.center.elevation_m) * exaggeration : 0
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 700, 2600], fov: 42, near: 5, far: 120_000 }} className="h-full w-full">
      <color attach="background" args={['#020307']} />
      <fogExp2 attach="fog" args={['#020307', 0.000035]} />
      <Stars radius={90_000} depth={20} count={2500} factor={90} saturation={0} fade />
      <CelestialBodies />
      {/* El resto de la superficie, fuera del parche: oculta el Sol cuando está bajo el horizonte */}
      <mesh rotation-x={-Math.PI / 2} position-y={minY - 6} receiveShadow={false}>
        <circleGeometry args={[80_000, 64]} />
        <meshStandardMaterial color="#4a4845" roughness={1} />
      </mesh>
      {terrain && <TerrainMesh patch={terrain} exaggeration={exaggeration} />}
      {/* Punto de aterrizaje: el centro del parche */}
      <group position={[0, 0, 0]}>
        <mesh position-y={90}><cylinderGeometry args={[2.5, 2.5, 180, 8]} /><meshBasicMaterial color="#fbbf24" /></mesh>
        <mesh rotation-x={-Math.PI / 2} position-y={4}><ringGeometry args={[60, 72, 48]} /><meshBasicMaterial color="#fbbf24" side={2} transparent opacity={0.9} /></mesh>
      </group>
      <OrbitControls target={[0, 0, 0]} enableDamping dampingFactor={0.08} minDistance={120} maxDistance={16_000} maxPolarAngle={1.4} />
    </Canvas>
  )
}
