import { test, expect } from 'vitest'
import { Vector3 } from 'three'
import {
  solveRopeConstraint,
  stepBody,
  type Body,
  EYE_HEIGHT,
  GRAVITY,
  WALK_SPEED,
  MAX_DELTA,
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
