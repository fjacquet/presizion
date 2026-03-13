import { describe, it } from 'vitest'

describe('fileValidation', () => {
  it.todo('validateFile accepts .xlsx extension')
  it.todo('validateFile accepts .csv extension')
  it.todo('validateFile accepts .zip extension')
  it.todo('validateFile throws ImportError for unsupported extension')
  it.todo('checkMagicBytes passes for xlsx with PK header')
  it.todo('checkMagicBytes passes for zip with PK header')
  it.todo('checkMagicBytes throws ImportError for xlsx with wrong magic bytes')
})
