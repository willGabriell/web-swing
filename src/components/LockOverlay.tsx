type LockOverlayProps = {
  visible: boolean
}

export function LockOverlay({ visible }: LockOverlayProps) {
  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.5)',
        color: '#fff',
        fontFamily: 'sans-serif',
        fontSize: '1.5rem',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      clique pra jogar
    </div>
  )
}
