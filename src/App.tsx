import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Player } from './scene/Player'
import { Environment } from './scene/Environment'
import { LockOverlay } from './components/LockOverlay'
import { Crosshair } from './components/Crosshair'

function App() {
  const [locked, setLocked] = useState(false)

  return (
    <>
      <Canvas style={{ width: '100vw', height: '100vh', display: 'block' }}>
        <Environment />
        <Player onLock={() => setLocked(true)} onUnlock={() => setLocked(false)} />
      </Canvas>
      <LockOverlay visible={!locked} />
      <Crosshair />
    </>
  )
}

export default App
