import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { importFile, ImportError } from '@/lib/utils/import'
import type { AnyImportResult } from '@/lib/utils/import'
import { ImportPreviewModal } from './ImportPreviewModal'

export function FileImportButton() {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [importResult, setImportResult] = useState<AnyImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset so same file can be re-imported
    e.target.value = ''
    setError(null)
    setLoading(true)
    try {
      const result = await importFile(file)
      setImportResult(result)
    } catch (err) {
      if (err instanceof ImportError) {
        setError(err.message)
      } else {
        setError('Failed to read file. Please check the file and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.csv,.zip,.json"
        className="hidden"
        onChange={(e) => { void handleFileChange(e) }}
        aria-label="Upload cluster export file"
      />
      <div className="space-y-1">
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          aria-label="Import from file"
        >
          {loading ? 'Importing…' : 'Import from file'}
        </Button>
        {error && (
          <p className="text-xs text-destructive" role="alert">{error}</p>
        )}
      </div>

      {importResult && (
        <ImportPreviewModal
          result={importResult}
          open={true}
          onClose={() => setImportResult(null)}
        />
      )}
    </>
  )
}
