import { Grid, Sky } from '@react-three/drei'

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
    </>
  )
}
