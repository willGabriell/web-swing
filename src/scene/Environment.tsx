import { useMemo } from 'react'
import { Grid, Sky } from '@react-three/drei'
import { buildCity, MAP_RADIUS } from './city'

const SKY_COLOR = '#c8d6e5'
// tons alternados por indice, so pra dar contraste de profundidade entre predios vizinhos
const BUILDING_COLORS = ['#8a8f98', '#767b85', '#9aa0ab']

export function Environment() {
  const buildings = useMemo(() => buildCity(), [])

  return (
    <>
      <Sky sunPosition={[100, 20, 100]} />
      <fogExp2 attach="fog" args={[SKY_COLOR, 0.006]} />
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[80, 100, 40]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-MAP_RADIUS}
        shadow-camera-right={MAP_RADIUS}
        shadow-camera-top={MAP_RADIUS}
        shadow-camera-bottom={-MAP_RADIUS}
        shadow-camera-near={1}
        shadow-camera-far={400}
      />
      {/* chao solido por baixo do Grid (shader material, nao recebe sombra) - mesma serventia de escala */}
      <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, -0.01, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#4a5058" />
      </mesh>
      <Grid
        args={[200, 200]}
        cellSize={1}
        sectionSize={10}
        infiniteGrid
        fadeDistance={100}
      />
      <group name="anchorables">
        {buildings.map((b, i) => (
          // ponytail: 48 draw calls, trocar por instancedMesh se a cidade crescer
          <mesh key={i} position={[b.x, b.h / 2, b.z]} castShadow receiveShadow>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial color={BUILDING_COLORS[i % BUILDING_COLORS.length]} />
          </mesh>
        ))}
      </group>
    </>
  )
}
