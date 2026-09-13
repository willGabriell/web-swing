import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PointerLockControls } from '@react-three/drei'
import { Raycaster, Vector3 } from 'three'
import { useKeyboard } from '../hooks/useKeyboard'
import { solveRopeConstraint } from './swing'

const SPEED = 4 // unidades/segundo
const GRAVITY = 20 // unidades/segundo^2
const JUMP_SPEED = 7 // unidades/segundo
const EYE_HEIGHT = 1.7 // altura da camera em relacao ao chao (Y = 0)
const MAX_ROPE = 30 // alcance maximo da teia, em unidades

// vetores reutilizados por frame pra evitar alocacao dentro do useFrame
const _forward = new Vector3()
const _right = new Vector3()
const _move = new Vector3()
const _dir = new Vector3()
const _raycaster = new Raycaster()

type PlayerProps = {
  onLock?: () => void
  onUnlock?: () => void
}

export function Player({ onLock, onUnlock }: PlayerProps) {
  const { camera, scene } = useThree()
  const keys = useKeyboard()
  const velocity = useRef(new Vector3())
  const [anchor, setAnchor] = useState<Vector3 | null>(null)
  const ropeLength = useRef(0)

  // camera comeca em pe no chao (uma vez so, nao a cada render)
  useEffect(() => {
    camera.position.y = EYE_HEIGHT
  }, [camera])

  // raycast de teia: clique esquerdo procura anchor, soltar limpa o estado
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 || !document.pointerLockElement) return

      camera.getWorldDirection(_dir)
      _raycaster.set(camera.position, _dir)
      _raycaster.far = MAX_ROPE

      const anchorables = scene.getObjectByName('anchorables')
      if (!anchorables) return
      const [hit] = _raycaster.intersectObjects(anchorables.children, true)
      if (!hit) return

      setAnchor(hit.point.clone())
      ropeLength.current = hit.distance
    }

    const onPointerUp = (e: PointerEvent) => {
      if (e.button !== 0) return
      setAnchor(null)
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [camera, scene])

  useFrame((_, delta) => {
    const k = keys.current

    if (anchor) {
      // --- balanco: fisica ditada pela corda, sem input direto de WASD ---
      velocity.current.y -= GRAVITY * delta
      camera.position.addScaledVector(velocity.current, delta)
      solveRopeConstraint(camera.position, velocity.current, anchor, ropeLength.current)

      if (camera.position.y < EYE_HEIGHT) {
        camera.position.y = EYE_HEIGHT
        velocity.current.y = 0
      }
      return
    }

    // --- movimento horizontal, relativo ao yaw da camera (pitch ignorado) ---
    camera.getWorldDirection(_forward)
    _forward.y = 0
    _forward.normalize()
    _right.set(-_forward.z, 0, _forward.x)

    _move.set(0, 0, 0)
    if (k.has('KeyW')) _move.add(_forward)
    if (k.has('KeyS')) _move.sub(_forward)
    if (k.has('KeyD')) _move.add(_right)
    if (k.has('KeyA')) _move.sub(_right)
    if (_move.lengthSq() > 0) {
      _move.normalize().multiplyScalar(SPEED * delta)
      camera.position.add(_move)
    }

    // --- gravidade + pulo ---
    const grounded = camera.position.y <= EYE_HEIGHT
    if (grounded && k.has('Space')) {
      velocity.current.y = JUMP_SPEED
    }

    velocity.current.y -= GRAVITY * delta
    camera.position.addScaledVector(velocity.current, delta)

    if (camera.position.y < EYE_HEIGHT) {
      camera.position.y = EYE_HEIGHT
      velocity.current.set(0, 0, 0)
    }
  })

  return (
    <>
      <PointerLockControls onLock={onLock} onUnlock={onUnlock} />
      {anchor && (
        // marcador de debug visual do anchor; trocado pela corda de verdade na spec 2
        <mesh position={anchor}>
          <sphereGeometry args={[0.2]} />
          <meshBasicMaterial color="red" />
        </mesh>
      )}
    </>
  )
}
