/**
 * index.css print rules — Unit tests
 * Requirement: EXPO-04
 *
 * Verifies that print-specific CSS rules are present in index.css.
 * This test is a leading indicator: it will be RED until Plan 03 adds
 * the @media print rules. That is intentional at Wave 0.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('index.css print rules', () => {
  it('contains print-color-adjust: exact for faithful color rendering when printed', () => {
    const cssPath = resolve(__dirname, '../index.css')
    const cssContent = readFileSync(cssPath, 'utf-8')
    expect(cssContent).toContain('print-color-adjust: exact')
  })
})
