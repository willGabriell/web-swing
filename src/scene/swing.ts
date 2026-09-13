import { Vector3 } from 'three'

// --- constantes de fisica (unidades/segundo, unidades/segundo^2) ---
export const GRAVITY = 20
export const EYE_HEIGHT = 1.7 // altura da camera em relacao ao chao (Y = 0)
export const WALK_SPEED = 4
export const GROUND_ACCEL = 30 // chao: velocidade horizontal vai pro alvo do WASD a essa taxa; alvo zero = atrito (pouso freia em ~v/30 s)
export const JUMP_SPEED = 7
export const MAX_STEP = 1 / 120 // substep maximo do integrador
export const MAX_DELTA = 0.1 // clamp do delta de frame (aba em background, lag spike)

export type Body = {
  position: Vector3
  velocity: Vector3
  anchor: Vector3 | null
  ropeLength: number
  grounded: boolean
}

export type Input = {
  move: Vector3 // direcao horizontal desejada, espaco do mundo, y = 0, unitaria ou zero
  jump: boolean
}

// vetor temporario reutilizado por chamada pra evitar alocacao no loop de frame
const _radial = new Vector3()

/**
 * Restricao de distancia da corda (position based dynamics simplificado):
 * se o jogador estiver mais longe do anchor que ropeLength, corrige a
 * posicao de volta pra esfera de raio ropeLength e remove da velocidade o
 * componente radial (mantendo so o tangencial). Corda frouxa (distancia <=
 * ropeLength) nao faz nada, deixa em queda livre.
 *
 * Muta position e velocity in-place. Posicao e velocidade sao corrigidas
 * juntas: aplicar so uma das duas estica a corda ou trava o movimento.
 */
export function solveRopeConstraint(
  position: Vector3,
  velocity: Vector3,
  anchor: Vector3,
  ropeLength: number,
): void {
  _radial.copy(position).sub(anchor)
  const distance = _radial.length()
  if (distance <= ropeLength || distance === 0) return

  _radial.divideScalar(distance) // normaliza
  position.copy(anchor).addScaledVector(_radial, ropeLength)
  velocity.addScaledVector(_radial, -velocity.dot(_radial))
}

/**
 * Avanca o corpo em `delta` segundos. Substeps de no maximo MAX_STEP pra
 * restricao da corda ficar estavel independente do framerate; delta clampado
 * em MAX_DELTA pra nao teleportar depois de uma aba em background.
 *
 * Ordem por substep: input -> gravidade -> integra (Euler semi-implicito) ->
 * corda -> chao. Corda e chao sao restricoes de posicao, ambas corrigem
 * posicao e velocidade no mesmo passo. Muta body in-place.
 *
 * ponytail: a projecao tangente da corda perde ~v^2*h/(2L^2) de velocidade
 * por segundo (<1% nos casos reais). Trocar por passo geodesico na esfera
 * se um dia virar problema perceptivel.
 */
export function stepBody(body: Body, input: Input, delta: number): void {
  delta = Math.min(delta, MAX_DELTA)
  if (delta <= 0) return

  const { position: p, velocity: v } = body

  // pulo e evento de borda: uma vez por frame, usando grounded do frame anterior
  if (input.jump && body.grounded && !body.anchor) v.y = JUMP_SPEED

  const n = Math.ceil(delta / MAX_STEP)
  const h = delta / n
  for (let i = 0; i < n; i++) {
    // 1. input
    if (body.anchor) {
      // spec 1.5
    } else if (body.grounded) {
      const tx = input.move.x * WALK_SPEED
      const tz = input.move.z * WALK_SPEED
      const dx = tx - v.x
      const dz = tz - v.z
      const dist = Math.hypot(dx, dz)
      const step = GROUND_ACCEL * h
      if (dist <= step) {
        v.x = tx
        v.z = tz
      } else {
        v.x += (dx / dist) * step
        v.z += (dz / dist) * step
      }
    } else {
      // spec 1.5
    }

    // 2. gravidade
    v.y -= GRAVITY * h

    // 3. integra
    p.addScaledVector(v, h)

    // 4. corda
    if (body.anchor) solveRopeConstraint(p, v, body.anchor, body.ropeLength)

    // 5. chao
    if (p.y <= EYE_HEIGHT) {
      p.y = EYE_HEIGHT
      if (v.y < 0) v.y = 0
      body.grounded = true
    } else {
      body.grounded = false
    }
  }
}
