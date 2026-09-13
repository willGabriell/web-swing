import { Box3, Vector3 } from 'three'

// --- constantes de fisica (unidades/segundo, unidades/segundo^2) ---
export const GRAVITY = 20
export const EYE_HEIGHT = 1.7 // altura da camera em relacao ao chao (Y = 0)
export const WALK_SPEED = 4
export const GROUND_ACCEL = 30 // chao: velocidade horizontal vai pro alvo do WASD a essa taxa; alvo zero = atrito (pouso freia em ~v/30 s)
export const AIR_ACCEL = 6 // ar: controle leve; so soma, nunca freia (momentum da soltura fica)
export const SWING_ACCEL = 8 // teia: "bombear" o balanco com WASD. Knob principal de feel, testar 6..12
export const MAX_SPEED = 35 // teto de |v|; sem isso bombear cresce sem limite
export const JUMP_SPEED = 7
export const MAX_ROPE = 30 // alcance maximo da teia (raycast), em unidades
export const MIN_ROPE = 2 // hit mais perto que isso nao prende (evita grudar em parede colada)
export const MAX_STEP = 1 / 120 // substep maximo do integrador
export const MAX_DELTA = 0.1 // clamp do delta de frame (aba em background, lag spike)
export const HAND_RIGHT = 0.3 // corda visual: deslocamento lateral da origem em relacao a camera
export const HAND_DOWN = 0.25 // corda visual: deslocamento pra baixo, senao nasce dentro do olho
export const TILT_MAX = 0.35 // rad (~20deg), teto do roll de camera no balanco
export const TILT_SPEED_REF = 20 // |v| onde o tilt chega no maximo
export const TILT_LAMBDA = 6 // taxa da suavizacao exponencial (MathUtils.damp) do roll
export const PLAYER_RADIUS = 0.4 // raio horizontal do corpo, pra colisao com predios
export const HEAD_ROOM = 0.2 // quanto o corpo passa acima do olho (EYE_HEIGHT), topo do AABB
export const SPAWN = new Vector3(0, EYE_HEIGHT, 0) // celula central vazia da cidade (src/scene/city.ts)
export const KILL_Y = -20 // abaixo disso, respawna (rede de seguranca; hoje inalcancavel, chao infinito segura antes)

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

// vetores temporarios reutilizados por chamada pra evitar alocacao no loop de frame
const _radial = new Vector3()
const _toAnchor = new Vector3()

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
 * Empurra position pra fora da primeira caixa (AABB) com que colidir, pelo
 * eixo de menor penetracao (min das 6 distancias de correcao). Corpo do
 * jogador e um AABB: raio PLAYER_RADIUS em X/Z, de `position.y - EYE_HEIGHT`
 * (pes) a `position.y + HEAD_ROOM` (topo). Zera so a componente de velocity
 * do eixo empurrado (rope/chao ja fazem o mesmo padrao). Retorna true se o
 * empurrao foi pra cima (pousou em cima da caixa, vira chao).
 *
 * Muta position e velocity in-place.
 *
 * ponytail: varre todas as caixas por substep (ex.: 48 predios x 120 Hz).
 * Grid espacial (hash por celula) so se a cidade crescer e isso pesar.
 */
export function resolveCollisions(position: Vector3, velocity: Vector3, boxes: Box3[]): boolean {
  let landed = false
  for (const box of boxes) {
    const minX = position.x - PLAYER_RADIUS
    const maxX = position.x + PLAYER_RADIUS
    const minY = position.y - EYE_HEIGHT
    const maxY = position.y + HEAD_ROOM
    const minZ = position.z - PLAYER_RADIUS
    const maxZ = position.z + PLAYER_RADIUS

    if (maxX <= box.min.x || minX >= box.max.x) continue
    if (maxY <= box.min.y || minY >= box.max.y) continue
    if (maxZ <= box.min.z || minZ >= box.max.z) continue

    const pushXPos = box.max.x - minX
    const pushXNeg = maxX - box.min.x
    const pushYPos = box.max.y - minY
    const pushYNeg = maxY - box.min.y
    const pushZPos = box.max.z - minZ
    const pushZNeg = maxZ - box.min.z
    const min = Math.min(pushXPos, pushXNeg, pushYPos, pushYNeg, pushZPos, pushZNeg)

    if (min === pushYPos) {
      position.y += pushYPos
      if (velocity.y < 0) velocity.y = 0
      landed = true
    } else if (min === pushYNeg) {
      position.y -= pushYNeg
      if (velocity.y > 0) velocity.y = 0
    } else if (min === pushXPos) {
      position.x += pushXPos
      velocity.x = 0
    } else if (min === pushXNeg) {
      position.x -= pushXNeg
      velocity.x = 0
    } else if (min === pushZPos) {
      position.z += pushZPos
      velocity.z = 0
    } else {
      position.z -= pushZNeg
      velocity.z = 0
    }
  }
  return landed
}

/**
 * Avanca o corpo em `delta` segundos. Substeps de no maximo MAX_STEP pra
 * restricao da corda ficar estavel independente do framerate; delta clampado
 * em MAX_DELTA pra nao teleportar depois de uma aba em background.
 *
 * Ordem por substep: input -> gravidade -> clamp de velocidade -> integra
 * (Euler semi-implicito) -> corda -> predios -> chao. Corda, predios e chao
 * sao restricoes de posicao, todas corrigem posicao e velocidade no mesmo
 * passo. `boxes` default vazio (sem colisao) mantem o comportamento antigo.
 * Muta body in-place.
 *
 * ponytail: a projecao tangente da corda perde ~v^2*h/(2L^2) de velocidade
 * por segundo (<1% nos casos reais). Trocar por passo geodesico na esfera
 * se um dia virar problema perceptivel.
 */
export function stepBody(body: Body, input: Input, delta: number, boxes: Box3[] = []): void {
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
      // bombear: acelera na direcao do input, a corda remove a parte radial no passo 4
      // ponytail: sem atrito no chao durante o swing; adicionar se o arrasto incomodar
      v.addScaledVector(input.move, SWING_ACCEL * h)
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
      v.addScaledVector(input.move, AIR_ACCEL * h)
    }

    // 2. gravidade
    v.y -= GRAVITY * h

    // 3. clamp de velocidade
    if (v.lengthSq() > MAX_SPEED * MAX_SPEED) v.setLength(MAX_SPEED)

    // 4. integra
    p.addScaledVector(v, h)

    // 5. corda
    if (body.anchor) solveRopeConstraint(p, v, body.anchor, body.ropeLength)

    // 6. predios
    const landedOnRoof = boxes.length > 0 && resolveCollisions(p, v, boxes)

    // 7. chao
    if (p.y <= EYE_HEIGHT) {
      p.y = EYE_HEIGHT
      if (v.y < 0) v.y = 0
      body.grounded = true
    } else {
      body.grounded = landedOnRoof
    }
  }
}

/**
 * Fora da area de teste: abaixo do kill plane (KILL_Y) ou alem da borda do
 * mapa (raio XZ maior que mapRadius, tipicamente MAP_RADIUS de city.ts).
 * `mapRadius` vem por parametro pra essa funcao continuar pura e sem
 * depender de city.ts (fisica desacoplada de como o mapa e gerado).
 */
export function outOfBounds(position: Vector3, mapRadius: number): boolean {
  if (position.y < KILL_Y) return true
  return position.x * position.x + position.z * position.z > mapRadius * mapRadius
}

/**
 * Roll alvo (rad) da camera pro balanco atual: inclina pro lado do anchor,
 * proporcional a velocidade (mais rapido = mais inclinado, ate TILT_MAX).
 * Sem anchor, alvo e zero. `right` e o vetor lateral da camera (mundo, y = 0).
 *
 * Nao aplica suavizacao nem escreve em camera.rotation.z — isso e trabalho de
 * Player.tsx (MathUtils.damp por frame), essa funcao so calcula o alvo, pra
 * poder testar sem r3f/camera.
 */
export function tiltTarget(body: Body, right: Vector3): number {
  if (!body.anchor) return 0

  _toAnchor.copy(body.anchor).sub(body.position)
  _toAnchor.y = 0
  if (_toAnchor.lengthSq() === 0) return 0
  _toAnchor.normalize()

  const lateral = _toAnchor.dot(right) // >0 = anchor a direita, <0 = a esquerda
  const speedFactor = Math.min(body.velocity.length() / TILT_SPEED_REF, 1)
  return lateral * speedFactor * TILT_MAX
}
