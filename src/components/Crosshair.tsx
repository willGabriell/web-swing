import type { CSSProperties } from 'react'

const ARM = 8 // comprimento de cada braco da cruz, em px
const GAP = 3 // espaco vazio no centro
const THICKNESS = 2

const armStyle: CSSProperties = {
  position: 'absolute',
  background: '#fff',
  boxShadow: '0 0 2px rgba(0, 0, 0, 0.8)',
}

export function Crosshair() {
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
          top: -GAP - ARM,
          width: THICKNESS,
          height: ARM,
        }}
      />
      <div
        style={{
          ...armStyle,
          left: -THICKNESS / 2,
          top: GAP,
          width: THICKNESS,
          height: ARM,
        }}
      />
      {/* horizontal */}
      <div
        style={{
          ...armStyle,
          top: -THICKNESS / 2,
          left: -GAP - ARM,
          width: ARM,
          height: THICKNESS,
        }}
      />
      <div
        style={{
          ...armStyle,
          top: -THICKNESS / 2,
          left: GAP,
          width: ARM,
          height: THICKNESS,
        }}
      />
    </div>
  )
}
