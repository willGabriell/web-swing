import { Box3, Vector3 } from 'three'

// --- constantes da cidade procedural (grid de ruas, centro reservado pro spawn) ---
export const CITY_SEED = 1337
export const CITY_COLS = 7 // grid CITY_COLS x CITY_COLS, celula central vazia (spawn) = COLS^2 - 1 predios
export const CITY_SPACING = 26 // centro a centro entre celulas
export const CITY_FOOT_MIN = 8
export const CITY_FOOT_MAX = 14
export const CITY_H_MIN = 14
export const CITY_H_MAX = 55
export const CITY_JITTER = 3 // deslocamento aleatorio do centro da celula, evita grid perfeito
export const MAP_RADIUS = (CITY_COLS * CITY_SPACING) / 2 + 20

// Racional do espacamento (spec 3.4): vizinho ortogonal fica a CITY_SPACING (26m)
// centro a centro; com footprint 8-14, a rua entre fachadas sobra ~12-18m -
// longe demais pra pulo (JUMP_SPEED = 7) mas dentro de MAX_ROPE (30), forca usar
// a teia. Vizinho diagonal fica a ~sqrt(2)*26 =~ 37m, fora do alcance de uma
// teia so - so da pra alcancar do alto (telhado) ou encadeando dois baloncos.

export type Building = { x: number; z: number; w: number; d: number; h: number }

// PRNG determinístico (mulberry32): mesma seed = mesma cidade todo reload,
// condicao pra tunar feel e reproduzir bug.
function mulberry32(seed: number): () => number {
  let t = seed
  return () => {
    t = (t + 0x6d2b79f5) | 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

/** Gera a cidade num grid CITY_COLS x CITY_COLS, celula central vazia (spawn em 0,0). */
export function buildCity(seed = CITY_SEED): Building[] {
  const rand = mulberry32(seed)
  const center = (CITY_COLS - 1) / 2
  const buildings: Building[] = []

  for (let i = 0; i < CITY_COLS; i++) {
    for (let j = 0; j < CITY_COLS; j++) {
      if (i === center && j === center) continue // rua de spawn

      const jitterX = (rand() * 2 - 1) * CITY_JITTER
      const jitterZ = (rand() * 2 - 1) * CITY_JITTER
      buildings.push({
        x: (i - center) * CITY_SPACING + jitterX,
        z: (j - center) * CITY_SPACING + jitterZ,
        w: CITY_FOOT_MIN + rand() * (CITY_FOOT_MAX - CITY_FOOT_MIN),
        d: CITY_FOOT_MIN + rand() * (CITY_FOOT_MAX - CITY_FOOT_MIN),
        h: CITY_H_MIN + rand() * (CITY_H_MAX - CITY_H_MIN),
      })
    }
  }

  return buildings
}

/** Caixas de colisao (AABB) dos predios, base em y=0. */
export function cityColliders(buildings: Building[]): Box3[] {
  return buildings.map(
    (b) =>
      new Box3(
        new Vector3(b.x - b.w / 2, 0, b.z - b.d / 2),
        new Vector3(b.x + b.w / 2, b.h, b.z + b.d / 2),
      ),
  )
}
