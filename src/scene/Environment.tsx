import { Grid, Sky } from '@react-three/drei'

// ponytail: alvos placeholder pra teia, substituidos pelos predios da sprint 3
const BLOCKS: Array<{ position: [number, number, number]; size: [number, number, number] }> = [
  { position: [15, 12, -10], size: [8, 24, 8] },
  { position: [-18, 10, -20], size: [6, 20, 6] },
  { position: [10, 15, -35], size: [10, 30, 10] },
  { position: [-12, 9, -5], size: [7, 18, 7] },
  { position: [25, 11, -28], size: [6, 22, 6] },
  { position: [-25, 13, -15], size: [8, 26, 8] },
]

export function Environment() {
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
        {BLOCKS.map((b, i) => (
          <mesh key={i} position={b.position}>
            <boxGeometry args={b.size} />
            <meshStandardMaterial color="#8a8f98" />
          </mesh>
        ))}
      </group>
    </>
  )
}
