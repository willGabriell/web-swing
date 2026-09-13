import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PointerLockControls } from '@react-three/drei'
import { Mesh, Raycaster, Vector3 } from 'three'
import { useKeyboard } from '../hooks/useKeyboard'
import { EYE_HEIGHT, stepBody, type Body, type Input } from './swing'

const MAX_ROPE = 30 // alcance maximo da teia, em unidades

// vetores reutilizados por frame pra evitar alocacao dentro do useFrame
const _forward = new Vector3()
const _right = new Vector3()
const _dir = new Vector3()
const _raycaster = new Raycaster()
const _input: Input = { move: new Vector3(), jump: false }

type PlayerProps = {
  onLock?: () => void
  onUnlock?: () => void
}

export function Player({ onLock, onUnlock }: PlayerProps) {
  const { camera, scene } = useThree()
  const keys = useKeyboard()
  const marker = useRef<Mesh>(null)
  // body.position e a propria camera.position (alias): a fisica move a camera direto,
  // sem copia por frame. Tudo em ref, nada de state: clique nao re-renderiza.
  const body = useRef<Body>({
    position: camera.position,
    velocity: new Vector3(),
    anchor: null,
    ropeLength: 0,
    grounded: true,
  })

  // camera comeca em pe no chao (uma vez so, nao a cada render)
  useEffect(() => {
    camera.position.y = EYE_HEIGHT
  }, [camera])

  // raycast de teia: clique esquerdo procura anchor, soltar limpa o anchor
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

      body.current.anchor = hit.point.clone()
      body.current.ropeLength = hit.distance
      if (marker.current) {
        marker.current.position.copy(hit.point)
        marker.current.visible = true
      }
    }

    const onPointerUp = (e: PointerEvent) => {
      if (e.button !== 0) return
      // spec 1.3: so limpa o anchor. velocity fica intacta = momentum preservado
      body.current.anchor = null
      if (marker.current) marker.current.visible = false
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

    // direcao de input relativa ao yaw da camera (pitch ignorado)
    camera.getWorldDirection(_forward)
    _forward.y = 0
    _forward.normalize()
    _right.set(-_forward.z, 0, _forward.x)

    _input.move.set(0, 0, 0)
    if (k.has('KeyW')) _input.move.add(_forward)
    if (k.has('KeyS')) _input.move.sub(_forward)
    if (k.has('KeyD')) _input.move.add(_right)
    if (k.has('KeyA')) _input.move.sub(_right)
    if (_input.move.lengthSq() > 0) _input.move.normalize()
    _input.jump = k.has('Space')

    stepBody(body.current, _input, delta)
  })

  return (
    <>
      <PointerLockControls onLock={onLock} onUnlock={onUnlock} />
      {/* marcador de debug visual do anchor; trocado pela corda de verdade na sprint 2 */}
      <mesh ref={marker} visible={false}>
        <sphereGeometry args={[0.2]} />
        <meshBasicMaterial color="red" />
      </mesh>
    </>
  )
}
