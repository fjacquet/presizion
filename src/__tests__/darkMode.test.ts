/**
 * Dark mode anti-flash script — unit tests
 * Requirement: UX-06
 *
 * Tests the logic of the anti-flash script in isolation.
 * We extract the script as a testable function — same logic as in index.html <script>.
 * jsdom mocks window.matchMedia so we can control the preference.
 */
import { describe, it, expect, vi } from 'vitest'

/** Pure function mirroring the index.html anti-flash script logic */
function applyDarkModeClass(
  matchMedia: typeof window.matchMedia | undefined,
  classList: { add: (cls: string) => void }
): void {
  try {
    if (matchMedia?.('(prefers-color-scheme: dark)').matches) {
      classList.add('dark')
    }
  } catch (_) {}
}

describe('darkMode: anti-flash script behavior', () => {
  describe('UX-06: OS dark-mode preference applied before first paint', () => {
    it('adds .dark class to document.documentElement when matchMedia prefers-color-scheme: dark', () => {
      const mockMatchMedia = vi.fn().mockReturnValue({ matches: true })
      const mockClassList = { add: vi.fn() }
      applyDarkModeClass(mockMatchMedia as typeof window.matchMedia, mockClassList)
      expect(mockClassList.add).toHaveBeenCalledWith('dark')
    })

    it('does not add .dark class when matchMedia prefers-color-scheme: light', () => {
      const mockMatchMedia = vi.fn().mockReturnValue({ matches: false })
      const mockClassList = { add: vi.fn() }
      applyDarkModeClass(mockMatchMedia as typeof window.matchMedia, mockClassList)
      expect(mockClassList.add).not.toHaveBeenCalled()
    })

    it('does not throw when matchMedia is unavailable (SSR/old browser safety)', () => {
      const mockClassList = { add: vi.fn() }
      expect(() => applyDarkModeClass(undefined, mockClassList)).not.toThrow()
      expect(mockClassList.add).not.toHaveBeenCalled()
    })
  })
})
