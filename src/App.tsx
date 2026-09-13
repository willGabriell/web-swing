import { Canvas } from '@react-three/fiber'

function App() {
  return (
    <Canvas style={{ width: '100vw', height: '100vh', display: 'block' }}>
      <color attach="background" args={['#111']} />
    </Canvas>
  )
}

export default App
