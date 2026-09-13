import { test, expect } from 'vitest'
import { Vector3 } from 'three'
import { solveRopeConstraint } from './swing'

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
