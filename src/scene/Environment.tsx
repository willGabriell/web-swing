import { useMemo } from 'react'
import { Grid, Sky } from '@react-three/drei'
import { buildCity } from './city'

export function Environment() {
  const buildings = useMemo(() => buildCity(), [])

  return (
    <>
      <Sky sunPosition={[100, 20, 100]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[50, 50, 25]} intensity={1.5} />
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
          <mesh key={i} position={[b.x, b.h / 2, b.z]}>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial color="#8a8f98" />
          </mesh>
        ))}
      </group>
    </>
  )
}
