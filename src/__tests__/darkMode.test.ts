/**
 * Dark mode anti-flash script — unit stubs
 * Requirement: UX-06
 *
 * These stubs are Wave 0 placeholders. Plan 04-02 fills them with real tests.
 * Using it.todo (not it.skip) so Vitest counts as pending, not failing.
 */
import { describe, it } from 'vitest'

describe('darkMode: anti-flash script behavior', () => {
  describe('UX-06: OS dark-mode preference applied before first paint', () => {
    it.todo('adds .dark class to document.documentElement when matchMedia prefers-color-scheme: dark')
    it.todo('does not add .dark class when matchMedia prefers-color-scheme: light')
    it.todo('does not throw when matchMedia is unavailable (SSR/old browser safety)')
  })
})
