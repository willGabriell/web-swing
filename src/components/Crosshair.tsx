import type { CSSProperties } from 'react'

const ARM = 8 // comprimento de cada braco da cruz, em px
const GAP = 3 // espaco vazio no centro sem alvo valido
const GAP_VALID = 5 // espaco vazio quando o alvo mirado e valido pra teia
const THICKNESS = 2
const COLOR_NEUTRAL = '#fff'
const COLOR_VALID = '#6ee7a8'

type CrosshairProps = {
  valid?: boolean
}

export function Crosshair({ valid = false }: CrosshairProps) {
  const gap = valid ? GAP_VALID : GAP
  const armStyle: CSSProperties = {
    position: 'absolute',
    background: valid ? COLOR_VALID : COLOR_NEUTRAL,
    boxShadow: '0 0 2px rgba(0, 0, 0, 0.8)',
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 0,
        height: 0,
        pointerEvents: 'none',
      }}
    >
      {/* vertical */}
      <div
        style={{
          ...armStyle,
          left: -THICKNESS / 2,
          top: -gap - ARM,
          width: THICKNESS,
          height: ARM,
        }}
      />
      <div
        style={{
          ...armStyle,
          left: -THICKNESS / 2,
          top: gap,
          width: THICKNESS,
          height: ARM,
        }}
      />
      {/* horizontal */}
      <div
        style={{
          ...armStyle,
          top: -THICKNESS / 2,
          left: -gap - ARM,
          width: ARM,
          height: THICKNESS,
        }}
      />
      <div
        style={{
          ...armStyle,
          top: -THICKNESS / 2,
          left: gap,
          width: ARM,
          height: THICKNESS,
        }}
      />
    </div>
  )
}
