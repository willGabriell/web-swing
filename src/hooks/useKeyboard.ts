import { useEffect, useRef } from 'react'

/** Set de teclas pressionadas no momento, em ref pra nao causar re-render por frame. */
export function useKeyboard() {
  const keys = useRef(new Set<string>())

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => keys.current.add(e.code)
    const onKeyUp = (e: KeyboardEvent) => keys.current.delete(e.code)

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  return keys
}
