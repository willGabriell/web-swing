import { useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Player } from './scene/Player'
import { Environment } from './scene/Environment'
import { LockOverlay } from './components/LockOverlay'
import { Crosshair } from './components/Crosshair'
import { SpeedHud } from './components/SpeedHud'

function App() {
  const [locked, setLocked] = useState(false)
  const [canGrapple, setCanGrapple] = useState(false)
  const speed = useRef(0)

  return (
    <>
      <Canvas style={{ width: '100vw', height: '100vh', display: 'block' }}>
        <Environment />
        <Player
          onLock={() => setLocked(true)}
          onUnlock={() => setLocked(false)}
          onAimChange={setCanGrapple}
          speed={speed}
        />
      </Canvas>
      <LockOverlay visible={!locked} />
      <Crosshair valid={canGrapple} />
      <SpeedHud speed={speed} />
    </>
  )
}

export default App
