import { test, expect } from 'vitest'
import { Box3, Vector3 } from 'three'
import {
  outOfBounds,
  resolveCollisions,
  solveRopeConstraint,
  stepBody,
  tiltTarget,
  type Body,
  EYE_HEIGHT,
  GRAVITY,
  WALK_SPEED,
  KILL_Y,
  MAX_DELTA,
  MAX_SPEED,
  PLAYER_RADIUS,
  TILT_MAX,
} from './swing'

const ZERO = new Vector3()
const FORWARD = new Vector3(0, 0, -1)

test('corda frouxa: posicao e velocidade ficam inalteradas', () => {
  const position = new Vector3(0, 8, 0)
  const velocity = new Vector3(1, -2, 0)
  const anchor = new Vector3(0, 10, 0)

  solveRopeConstraint(position, velocity, anchor, 5)

  expect(position.equals(new Vector3(0, 8, 0))).toBe(true)
  expect(velocity.equals(new Vector3(1, -2, 0))).toBe(true)
})

test('corda esticada: posicao corrigida pra distancia == ropeLength', () => {
  const anchor = new Vector3(0, 10, 0)
  const position = new Vector3(10, 10, 0) // 10 de distancia, corda tem 5
  const velocity = new Vector3(0, -3, 2)

  solveRopeConstraint(position, velocity, anchor, 5)

  expect(position.distanceTo(anchor)).toBeCloseTo(5, 10)
})

test('componente radial da velocidade removido', () => {
  const anchor = new Vector3(0, 0, 0)
  const position = new Vector3(10, 0, 0)
  const velocity = new Vector3(-3, -4, 0) // parte radial + parte tangencial

  solveRopeConstraint(position, velocity, anchor, 5)

  const radial = position.clone().sub(anchor).normalize()
  expect(velocity.dot(radial)).toBeCloseTo(0, 10)
})

test('componente tangencial preservado em magnitude, sem freio artificial', () => {
  const anchor = new Vector3(0, 0, 0)
  const position = new Vector3(10, 0, 0)
  const velocity = new Vector3(-3, -4, 0)

  // decompoe a velocidade original em radial + tangencial pra saber o esperado
  const radialDir = position.clone().sub(anchor).normalize()
  const radialPart = radialDir.clone().multiplyScalar(velocity.dot(radialDir))
  const expectedTangent = velocity.clone().sub(radialPart)

  solveRopeConstraint(position.clone(), velocity, anchor, 5)

  expect(velocity.length()).toBeCloseTo(expectedTangent.length(), 10)
  expect(velocity.equals(expectedTangent)).toBe(true)
})

// --- stepBody ---

function makeBody(over: Partial<Body> = {}): Body {
  return {
    position: new Vector3(0, EYE_HEIGHT, 0),
    velocity: new Vector3(),
    anchor: null,
    ropeLength: 0,
    grounded: true,
    ...over,
  }
}

/** roda `seconds` de simulacao em frames de `dt`, com input constante */
function run(body: Body, seconds: number, dt = 1 / 60, move = ZERO, jump = false): void {
  const n = Math.round(seconds / dt)
  for (let i = 0; i < n; i++) stepBody(body, { move, jump }, dt)
}

/** energia mecanica por unidade de massa: cinetica + potencial */
function energy(b: Body): number {
  return 0.5 * b.velocity.lengthSq() + GRAVITY * b.position.y
}

test('parado no chao: fica em EYE_HEIGHT, grounded, sem velocidade', () => {
  const body = makeBody()
  run(body, 1)
  expect(body.position.y).toBeCloseTo(EYE_HEIGHT, 10)
  expect(body.grounded).toBe(true)
  expect(body.velocity.length()).toBeCloseTo(0, 10)
})

test('andar: atinge WALK_SPEED na direcao do input e para ao soltar', () => {
  const body = makeBody()
  run(body, 1, 1 / 60, FORWARD)
  expect(body.velocity.z).toBeCloseTo(-WALK_SPEED, 6)
  expect(body.velocity.x).toBeCloseTo(0, 6)
  run(body, 1)
  expect(body.velocity.length()).toBeCloseTo(0, 6)
})

test('pulo: sai do chao e volta a pousar', () => {
  const body = makeBody()
  stepBody(body, { move: ZERO, jump: true }, 1 / 60)
  expect(body.grounded).toBe(false)
  expect(body.position.y).toBeGreaterThan(EYE_HEIGHT)
  run(body, 2)
  expect(body.grounded).toBe(true)
  expect(body.position.y).toBeCloseTo(EYE_HEIGHT, 10)
})

test('pouso preserva momentum horizontal: freia gradual, nao zera', () => {
  const body = makeBody({
    position: new Vector3(0, EYE_HEIGHT + 0.5, 0),
    velocity: new Vector3(20, 0, 0),
    grounded: false,
  })
  // no ar, sem input: horizontal nao muda
  stepBody(body, { move: ZERO, jump: false }, 1 / 60)
  expect(body.velocity.x).toBe(20)

  let frames = 0
  while (!body.grounded && frames < 120) {
    stepBody(body, { move: ZERO, jump: false }, 1 / 60)
    frames++
  }
  expect(body.grounded).toBe(true)
  expect(body.velocity.x).toBeGreaterThan(15) // ainda deslizando no primeiro frame de chao
  run(body, 2)
  expect(body.velocity.length()).toBeCloseTo(0, 6) // atrito parou
})

test('delta gigante e clampado em MAX_DELTA', () => {
  const body = makeBody({ position: new Vector3(0, 100, 0), grounded: false })
  stepBody(body, { move: ZERO, jump: false }, 5)
  // queda real de MAX_DELTA s (~0.1 unidade); sem clamp seriam ~250 unidades
  expect(body.position.y).toBeGreaterThan(100 - 0.5 * GRAVITY * MAX_DELTA * MAX_DELTA - 1)
})

test('pendulo: corda nunca estica e energia se conserva (< 5% em 3 s)', () => {
  const anchor = new Vector3(0, 20, 0)
  const body = makeBody({
    position: new Vector3(10, 20, 0), // corda horizontal, esticada, em repouso
    anchor,
    ropeLength: 10,
    grounded: false,
  })
  const e0 = energy(body)
  let minY = Infinity
  for (let i = 0; i < 180; i++) {
    stepBody(body, { move: ZERO, jump: false }, 1 / 60)
    expect(body.position.distanceTo(anchor)).toBeLessThanOrEqual(10 + 1e-6)
    expect(Math.abs(energy(body) - e0) / e0).toBeLessThan(0.05)
    minY = Math.min(minY, body.position.y)
  }
  expect(minY).toBeLessThan(15) // desceu de perto do ponto de partida (y=20) em direcao ao fundo do arco
})

test('framerate independente: 30fps vs 144fps convergem', () => {
  function make(): Body {
    return makeBody({
      position: new Vector3(10, 20, 0),
      anchor: new Vector3(0, 20, 0),
      ropeLength: 10,
      grounded: false,
    })
  }
  const slow = make()
  const fast = make()
  run(slow, 2, 1 / 30)
  run(fast, 2, 1 / 144)
  expect(slow.position.distanceTo(fast.position)).toBeLessThan(0.5)
})

test('soltar a teia preserva a velocidade (spec 1.3)', () => {
  const body = makeBody({
    position: new Vector3(0, 10, 0),
    velocity: new Vector3(5, 5, 0),
    anchor: new Vector3(0, 20, 0),
    ropeLength: 10,
    grounded: false,
  })
  body.anchor = null // solta a teia, como Player.tsx faz no pointerup
  const v0 = body.velocity.clone()
  stepBody(body, { move: ZERO, jump: false }, 1 / 60)
  expect(body.velocity.x).toBeCloseTo(v0.x, 6)
  expect(body.velocity.z).toBeCloseTo(v0.z, 6)
})

test('teto de velocidade', () => {
  const body = makeBody({
    position: new Vector3(0, 100, 0),
    velocity: new Vector3(100, 0, 0),
    grounded: false,
  })
  stepBody(body, { move: ZERO, jump: false }, 1 / 60)
  expect(body.velocity.length()).toBeLessThanOrEqual(MAX_SPEED + 1e-9)
})

test('bombear com WASD inicia o balanco do repouso', () => {
  const body = makeBody({
    position: new Vector3(0, 10, 0), // pendurado reto abaixo do anchor, parado
    anchor: new Vector3(0, 20, 0),
    ropeLength: 10,
    grounded: false,
  })
  run(body, 1, 1 / 60, FORWARD)
  expect(body.velocity.length()).toBeGreaterThan(1)
  expect(body.position.z).toBeLessThan(-1)
})

test('controle no ar: input soma velocidade, sem input nao freia', () => {
  const body = makeBody({
    position: new Vector3(0, 100, 0),
    velocity: new Vector3(10, 0, 0),
    grounded: false,
  })
  run(body, 0.5, 1 / 60, FORWARD)
  expect(body.velocity.x).toBe(10)
  expect(body.velocity.z).toBeLessThan(-1)
})

// --- tiltTarget ---

const RIGHT = new Vector3(1, 0, 0)

test('tilt: sem anchor, alvo e zero', () => {
  const body = makeBody({ velocity: new Vector3(20, 0, 0) })
  expect(tiltTarget(body, RIGHT)).toBe(0)
})

test('tilt: anchor a direita com velocidade alta, sinal positivo e dentro do teto', () => {
  const body = makeBody({
    position: new Vector3(0, 10, 0),
    anchor: new Vector3(10, 10, 0), // anchor no eixo +x, mesmo lado de RIGHT
    ropeLength: 10,
    velocity: new Vector3(0, 0, 30), // rapido, acima de TILT_SPEED_REF
  })
  const tilt = tiltTarget(body, RIGHT)
  expect(tilt).toBeGreaterThan(0)
  expect(tilt).toBeLessThanOrEqual(TILT_MAX)
})

test('tilt: velocidade baixa inclina bem menos que velocidade alta', () => {
  const slow = makeBody({
    position: new Vector3(0, 10, 0),
    anchor: new Vector3(10, 10, 0),
    ropeLength: 10,
    velocity: new Vector3(0, 0, 1),
  })
  const fast = makeBody({
    position: new Vector3(0, 10, 0),
    anchor: new Vector3(10, 10, 0),
    ropeLength: 10,
    velocity: new Vector3(0, 0, 30),
  })
  expect(tiltTarget(slow, RIGHT)).toBeLessThan(tiltTarget(fast, RIGHT) / 2)
})

// --- resolveCollisions ---

test('colisao lateral bloqueia eixo X e preserva velocidade vertical', () => {
  const box = new Box3(new Vector3(-5, 0, -5), new Vector3(5, 20, 5))
  const position = new Vector3(5.2, 10, 0) // penetra 0.2 na face +x do box
  const velocity = new Vector3(-3, -2, 0)

  const landed = resolveCollisions(position, velocity, [box])

  expect(landed).toBe(false)
  expect(position.x).toBeCloseTo(box.max.x + PLAYER_RADIUS, 10)
  expect(velocity.x).toBe(0)
  expect(velocity.y).toBe(-2) // eixo nao envolvido na colisao fica intacto
})

test('colisao no topo vira grounded e zera velocidade vertical', () => {
  const box = new Box3(new Vector3(-5, 0, -5), new Vector3(5, 20, 5))
  const position = new Vector3(0, box.max.y + EYE_HEIGHT - 0.1, 0) // pes 0.1 dentro do telhado
  const velocity = new Vector3(2, -5, 0)

  const landed = resolveCollisions(position, velocity, [box])

  expect(landed).toBe(true)
  expect(velocity.y).toBe(0)
  expect(velocity.x).toBe(2) // horizontal preservado, so a queda para
  expect(position.y).toBeCloseTo(box.max.y + EYE_HEIGHT, 10)
})

test('caixa distante nao altera posicao nem velocidade', () => {
  const box = new Box3(new Vector3(100, 0, 100), new Vector3(110, 20, 110))
  const position = new Vector3(0, 10, 0)
  const velocity = new Vector3(1, -2, 3)

  const landed = resolveCollisions(position, velocity, [box])

  expect(landed).toBe(false)
  expect(position.equals(new Vector3(0, 10, 0))).toBe(true)
  expect(velocity.equals(new Vector3(1, -2, 3))).toBe(true)
})

test('colisao durante o balanco nao atravessa a parede (sem tunelamento)', () => {
  const box = new Box3(new Vector3(-5, 0, -25), new Vector3(5, 20, 25))
  const body = makeBody({
    position: new Vector3(20, 15, 0),
    anchor: new Vector3(0, 20, 0),
    ropeLength: 20,
    grounded: false,
  })

  let minX = Infinity
  for (let i = 0; i < 300; i++) {
    stepBody(body, { move: new Vector3(-1, 0, 0), jump: false }, 1 / 60, [box])
    minX = Math.min(minX, body.position.x)
  }

  // margem de meio substep (MAX_SPEED * h) pra penetracao antes da correcao do proximo passo
  expect(minX).toBeGreaterThan(box.max.x + PLAYER_RADIUS - 0.5)
})

// --- outOfBounds ---

test('dentro da borda do mapa e acima do kill plane: dentro dos limites', () => {
  expect(outOfBounds(new Vector3(10, EYE_HEIGHT, -10), 100)).toBe(false)
})

test('abaixo do kill plane: fora dos limites', () => {
  expect(outOfBounds(new Vector3(0, KILL_Y - 1, 0), 100)).toBe(true)
})

test('alem do raio horizontal do mapa: fora dos limites', () => {
  expect(outOfBounds(new Vector3(150, EYE_HEIGHT, 0), 100)).toBe(true)
})
