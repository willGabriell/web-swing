import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Player } from './scene/Player'
import { LockOverlay } from './components/LockOverlay'

function App() {
  const [locked, setLocked] = useState(false)

  return (
    <>
      <Canvas style={{ width: '100vw', height: '100vh', display: 'block' }}>
        <color attach="background" args={['#111']} />
        <Player onLock={() => setLocked(true)} onUnlock={() => setLocked(false)} />
      </Canvas>
      <LockOverlay visible={!locked} />
    </>
  )
}

export default App
