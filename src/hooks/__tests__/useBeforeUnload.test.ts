/**
 * useBeforeUnload — Unit tests
 * Requirements: UX-05
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useBeforeUnload } from '../useBeforeUnload'

describe('useBeforeUnload', () => {
  let addEventSpy: ReturnType<typeof vi.spyOn>
  let removeEventSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    addEventSpy = vi.spyOn(window, 'addEventListener')
    removeEventSpy = vi.spyOn(window, 'removeEventListener')
  })

  afterEach(() => {
    addEventSpy.mockRestore()
    removeEventSpy.mockRestore()
  })

  describe('UX-05: warn before navigating away with unsaved data', () => {
    it('adds a beforeunload event listener when enabled is true', () => {
      renderHook(() => useBeforeUnload(true))
      expect(addEventSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))
    })

    it('does NOT add a beforeunload listener when enabled is false', () => {
      renderHook(() => useBeforeUnload(false))
      const beforeunloadCalls = addEventSpy.mock.calls.filter(
        ([event]: [string, ...unknown[]]) => event === 'beforeunload'
      )
      expect(beforeunloadCalls).toHaveLength(0)
    })

    it('removes the beforeunload listener on unmount', () => {
      const { unmount } = renderHook(() => useBeforeUnload(true))
      unmount()
      expect(removeEventSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))
    })

    it('calls event.preventDefault() inside the handler', () => {
      renderHook(() => useBeforeUnload(true))
      const handler = addEventSpy.mock.calls.find(
        ([event]: [string, ...unknown[]]) => event === 'beforeunload'
      )?.[1] as EventListener
      const mockEvent = { preventDefault: vi.fn(), returnValue: '' } as unknown as BeforeUnloadEvent
      handler(mockEvent)
      expect(mockEvent.preventDefault).toHaveBeenCalled()
    })

    it('sets event.returnValue to empty string inside the handler', () => {
      renderHook(() => useBeforeUnload(true))
      const handler = addEventSpy.mock.calls.find(
        ([event]: [string, ...unknown[]]) => event === 'beforeunload'
      )?.[1] as EventListener
      const mockEvent = { preventDefault: vi.fn(), returnValue: 'before' } as unknown as BeforeUnloadEvent
      handler(mockEvent)
      expect((mockEvent as BeforeUnloadEvent).returnValue).toBe('')
    })
  })
})
