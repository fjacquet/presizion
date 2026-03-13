export class ImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImportError'
  }
}

export function validateFile(_file: File): void {
  throw new Error('not implemented')
}

export function checkMagicBytes(_buffer: ArrayBuffer, _ext: string): void {
  throw new Error('not implemented')
}
