/**
 * useBeforeUnload — Unit tests
 * Requirements: UX-05
 *
 * Wave 0 stubs — implementations filled in by plan 03-03.
 */
import { describe, it } from 'vitest'

describe('useBeforeUnload', () => {
  describe('UX-05: warn before navigating away with unsaved data', () => {
    it.todo('adds a beforeunload event listener when enabled is true')
    it.todo('does NOT add a beforeunload listener when enabled is false')
    it.todo('removes the beforeunload listener on unmount')
    it.todo('calls event.preventDefault() inside the handler')
    it.todo('sets event.returnValue to empty string inside the handler')
  })
})
