import { useEffect, useRef, useState, type RefObject } from 'react'

type SpeedHudProps = {
  speed: RefObject<number>
}

// HUD de dev pra tuning de feel (AGENTS.md: knobs em swing.ts). F3 esconde/mostra.
export function SpeedHud({ speed }: SpeedHudProps) {
  const [visible, setVisible] = useState(true)
  const el = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'F3') return
      e.preventDefault() // F3 e "localizar" no navegador
      setVisible((v) => !v)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (!visible) return
    let frame: number
    const tick = () => {
      if (el.current) el.current.textContent = `${speed.current.toFixed(1)} m/s`
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [visible, speed])

  if (!visible) return null

  return (
    <div
      ref={el}
      style={{
        position: 'fixed',
        left: 12,
        bottom: 12,
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: 14,
        textShadow: '0 0 2px rgba(0, 0, 0, 0.8)',
        pointerEvents: 'none',
      }}
    />
  )
}
