import { describe, expect, test } from 'vitest'
import { buildCity, cityColliders, CITY_COLS, CITY_SEED } from './city'

describe('buildCity', () => {
  test('celula central fica vazia (rua de spawn)', () => {
    const buildings = buildCity()
    expect(buildings.length).toBe(CITY_COLS * CITY_COLS - 1)
    for (const b of buildings) {
      const closeToOrigin = Math.abs(b.x) < 5 && Math.abs(b.z) < 5
      expect(closeToOrigin).toBe(false)
    }
  })

  test('mesma seed gera a mesma cidade (determinístico)', () => {
    const a = buildCity(CITY_SEED)
    const b = buildCity(CITY_SEED)
    expect(a).toEqual(b)
  })

  test('seeds diferentes geram cidades diferentes', () => {
    const a = buildCity(1)
    const b = buildCity(2)
    expect(a).not.toEqual(b)
  })
})

describe('cityColliders', () => {
  test('caixa cobre a base (y=0) ate a altura do predio', () => {
    const buildings = buildCity()
    const boxes = cityColliders(buildings)
    boxes.forEach((box, i) => {
      const b = buildings[i]
      expect(box.min.y).toBe(0)
      expect(box.max.y).toBeCloseTo(b.h)
      expect(box.max.x - box.min.x).toBeCloseTo(b.w)
      expect(box.max.z - box.min.z).toBeCloseTo(b.d)
    })
  })
})
