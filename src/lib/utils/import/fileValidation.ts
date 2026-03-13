export class ImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImportError'
  }
}

const ALLOWED_EXTENSIONS = new Set(['.xlsx', '.csv', '.zip'])

export function validateFile(file: File): void {
  const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase()
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new ImportError(
      `Unsupported file type "${ext}". Please upload an .xlsx, .csv, or .zip file.`,
    )
  }
}

// PK\x03\x04 is the magic bytes for zip-based formats (xlsx, zip)
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04]

export function checkMagicBytes(buffer: ArrayBuffer, ext: string): void {
  if (ext !== '.xlsx' && ext !== '.zip') return
  const bytes = new Uint8Array(buffer, 0, 4)
  const valid = ZIP_MAGIC.every((b, i) => bytes[i] === b)
  if (!valid) {
    throw new ImportError(
      `File does not appear to be a valid ${ext} file (wrong file signature).`,
    )
  }
}
