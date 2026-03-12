/**
 * Step3ReviewExport — Integration tests
 * Requirements: EXPO-01, EXPO-02
 *
 * Wave 0 stubs — implementations filled in by plan 03-02.
 */
import { describe, it } from 'vitest'

describe('Step3ReviewExport', () => {
  describe('EXPO-01: copy plain-text summary to clipboard', () => {
    it.todo('renders a "Copy Summary" button')
    it.todo('calls navigator.clipboard.writeText with non-empty string when Copy Summary clicked')
    it.todo('clipboard text includes current cluster data')
    it.todo('clipboard text includes scenario names and results')
  })

  describe('EXPO-02: download CSV file', () => {
    it.todo('renders a "Download CSV" button')
    it.todo('calls URL.createObjectURL with a Blob when Download CSV clicked')
    it.todo('triggers anchor download on Download CSV click')
  })
})
