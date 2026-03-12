/**
 * export utils — Unit tests
 * Requirements: EXPO-02
 *
 * Wave 0 stubs — implementations filled in by plan 03-02.
 */
import { describe, it } from 'vitest'

describe('buildCsvContent', () => {
  it.todo('returns a string starting with a header row')
  it.todo('includes one data row per scenario')
  it.todo('includes scenario name in each row')
  it.todo('includes final server count in each row')
  it.todo('includes limiting resource in each row')
  it.todo('escapes fields containing commas by wrapping in double-quotes')
  it.todo('escapes fields containing double-quotes by doubling them')
})

describe('downloadCsv', () => {
  it.todo('calls URL.createObjectURL with a Blob')
  it.todo('calls URL.revokeObjectURL after the download is triggered')
})
