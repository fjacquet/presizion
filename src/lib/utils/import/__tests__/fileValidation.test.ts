import { describe, it, expect } from 'vitest'
import { validateFile, checkMagicBytes, ImportError } from '../fileValidation'

function makeFile(name: string): File {
  return new File([''], name, { type: 'application/octet-stream' })
}

function pkBuffer(): ArrayBuffer {
  const buf = new ArrayBuffer(4)
  new Uint8Array(buf).set([0x50, 0x4b, 0x03, 0x04])
  return buf
}

function badBuffer(): ArrayBuffer {
  const buf = new ArrayBuffer(4)
  new Uint8Array(buf).set([0x00, 0x00, 0x00, 0x00])
  return buf
}

describe('fileValidation', () => {
  it('validateFile accepts .xlsx extension', () => {
    expect(() => validateFile(makeFile('data.xlsx'))).not.toThrow()
  })

  it('validateFile accepts .csv extension', () => {
    expect(() => validateFile(makeFile('data.csv'))).not.toThrow()
  })

  it('validateFile accepts .zip extension', () => {
    expect(() => validateFile(makeFile('data.zip'))).not.toThrow()
  })

  it('validateFile throws ImportError for unsupported extension', () => {
    expect(() => validateFile(makeFile('data.xls'))).toThrow(ImportError)
    expect(() => validateFile(makeFile('data.txt'))).toThrow(ImportError)
  })

  it('checkMagicBytes passes for xlsx with PK header', () => {
    expect(() => checkMagicBytes(pkBuffer(), '.xlsx')).not.toThrow()
  })

  it('checkMagicBytes passes for zip with PK header', () => {
    expect(() => checkMagicBytes(pkBuffer(), '.zip')).not.toThrow()
  })

  it('checkMagicBytes throws ImportError for xlsx with wrong magic bytes', () => {
    expect(() => checkMagicBytes(badBuffer(), '.xlsx')).toThrow(ImportError)
  })
})
