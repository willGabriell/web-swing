import { PointerLockControls } from '@react-three/drei'

type PlayerProps = {
  onLock?: () => void
  onUnlock?: () => void
}

export function Player({ onLock, onUnlock }: PlayerProps) {
  return <PointerLockControls onLock={onLock} onUnlock={onUnlock} />
}
