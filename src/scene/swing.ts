import { Vector3 } from 'three'

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
