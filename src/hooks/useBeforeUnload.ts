import { useEffect } from 'react'

/**
 * Registers a beforeunload event listener when enabled is true.
 * Used to warn the user before navigating away from the page when data has been entered.
 *
 * Requirements: UX-05
 *
 * @param enabled - Register the listener when true; no-op when false.
 */
export function useBeforeUnload(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [enabled])
}
