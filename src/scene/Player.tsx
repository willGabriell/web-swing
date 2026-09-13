import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Line, PointerLockControls } from '@react-three/drei'
import { Raycaster, Vector3 } from 'three'
import type { Line2 } from 'three-stdlib'
import { useKeyboard } from '../hooks/useKeyboard'
import { EYE_HEIGHT, HAND_DOWN, HAND_RIGHT, stepBody, type Body, type Input } from './swing'

const MAX_ROPE = 30 // alcance maximo da teia, em unidades

// vetores reutilizados por frame pra evitar alocacao dentro do useFrame
const _forward = new Vector3()
const _right = new Vector3()
const _dir = new Vector3()
const _hand = new Vector3()
const _raycaster = new Raycaster()
const _input: Input = { move: new Vector3(), jump: false }

type PlayerProps = {
  onLock?: () => void
  onUnlock?: () => void
  onAimChange?: (valid: boolean) => void
}

// resultado do raycast de mira, atualizado todo frame; anchorPoint e reutilizado (sem clone por frame)
const _aim: { valid: boolean; anchorPoint: Vector3; ropeLength: number } = {
  valid: false,
  anchorPoint: new Vector3(),
  ropeLength: 0,
}

export function Player({ onLock, onUnlock, onAimChange }: PlayerProps) {
  const { camera, scene } = useThree()
  const keys = useKeyboard()
  const rope = useRef<Line2>(null)
  const lastAimValid = useRef(false)
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

  // clique esquerdo consome o resultado do raycast continuo (calculado no useFrame); soltar limpa o anchor
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 || !document.pointerLockElement || !_aim.valid) return
      // clique nao e por frame: clone() aqui e igual ao custo de antes (hit.point.clone())
      body.current.anchor = _aim.anchorPoint.clone()
      body.current.ropeLength = _aim.ropeLength
    }

    const onPointerUp = (e: PointerEvent) => {
      if (e.button !== 0) return
      // spec 1.3: so limpa o anchor. velocity fica intacta = momentum preservado
      body.current.anchor = null
      if (rope.current) rope.current.visible = false
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [])

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

    // raycast de mira: roda todo frame pra alimentar o crosshair dinamico e o clique
    camera.getWorldDirection(_dir)
    _raycaster.set(camera.position, _dir)
    _raycaster.far = MAX_ROPE
    const anchorables = scene.getObjectByName('anchorables')
    const [hit] = anchorables ? _raycaster.intersectObjects(anchorables.children, true) : []
    _aim.valid = !!hit
    if (hit) {
      _aim.anchorPoint.copy(hit.point)
      _aim.ropeLength = hit.distance
    }
    if (_aim.valid !== lastAimValid.current) {
      lastAimValid.current = _aim.valid
      onAimChange?.(_aim.valid)
    }

    // corda visual: liga a "mao" (camera deslocada, senao nasce dentro do olho) ao anchor
    const anchor = body.current.anchor
    if (rope.current) {
      if (!anchor) {
        rope.current.visible = false
      } else {
        _hand.copy(camera.position).addScaledVector(_right, HAND_RIGHT)
        _hand.y -= HAND_DOWN
        rope.current.geometry.setPositions([
          _hand.x, _hand.y, _hand.z,
          anchor.x, anchor.y, anchor.z,
        ])
        rope.current.visible = true
      }
    }
  })

  return (
    <>
      <PointerLockControls onLock={onLock} onUnlock={onUnlock} />
      <Line ref={rope} points={[[0, 0, 0], [0, 0, 0]]} color="#f2f2f2" lineWidth={2} visible={false} />
    </>
  )
}
