import { Upload } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { AnyImportResult } from '@/lib/utils/import';
import { ImportError, importFile } from '@/lib/utils/import';
import { ImportPreviewModal } from './ImportPreviewModal';

/**
 * Drag-and-drop file import zone with a native click-to-browse fallback.
 *
 * Why a `<label>` (not a button calling `inputRef.click()`): some Chrome states
 * refuse to open the OS file dialog from a programmatic `.click()`. A native
 * `<label htmlFor>` opens the dialog with no JS, and drag-and-drop reads
 * `dataTransfer.files` directly — so neither path depends on a programmatic
 * click. Reuses the existing `importFile` pipeline + `ImportPreviewModal`.
 */
export function FileDropzone() {
  const { t } = useTranslation('step1');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const inputId = useId();
  const [importResult, setImportResult] = useState<AnyImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file || loading) return;
    setError(null);
    setLoading(true);
    try {
      setImportResult(await importFile(file));
    } catch (err) {
      setError(err instanceof ImportError ? err.message : t('fileImport.errorFallback'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* biome-ignore lint/a11y/noLabelWithoutControl: the file input control is nested below */}
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          if (!loading) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (!loading) void handleFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center backdrop-blur-sm transition-colors',
          isDragging
            ? 'border-primary-500 bg-primary-500/10 shadow-[0_0_24px_-6px_rgba(80,104,255,0.5)]'
            : 'border-slate-300/70 bg-white/40 hover:border-primary-400 dark:border-surface-700 dark:bg-surface-900/40',
          loading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        )}
      >
        <Upload className="h-5 w-5 text-primary-500" aria-hidden="true" />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {loading
            ? t('fileImport.importing')
            : isDragging
              ? t('fileImport.dropzone.active')
              : t('fileImport.dropzone.instruction')}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {t('fileImport.dropzone.hint')}
        </span>
        {/* Native label→input: clicking the label opens the dialog with no JS .click(). */}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".xlsx,.csv,.zip,.json"
          className="sr-only"
          disabled={loading}
          aria-label={t('fileImport.uploadAriaLabel')}
          onChange={(e) => {
            void handleFile(e.target.files?.[0]);
            e.target.value = ''; // allow re-selecting the same file
          }}
        />
      </label>
      {error && (
        <p className="text-xs text-util-high mt-1" role="alert">
          {error}
        </p>
      )}
      {importResult && (
        <ImportPreviewModal result={importResult} open onClose={() => setImportResult(null)} />
      )}
    </>
  );
}
