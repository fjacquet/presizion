import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { AnyImportResult } from '@/lib/utils/import';
import { ImportError, importFile } from '@/lib/utils/import';
import { ImportPreviewModal } from './ImportPreviewModal';

export function FileImportButton() {
  const { t } = useTranslation('step1');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [importResult, setImportResult] = useState<AnyImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so same file can be re-imported
    e.target.value = '';
    setError(null);
    setLoading(true);
    try {
      const result = await importFile(file);
      setImportResult(result);
    } catch (err) {
      if (err instanceof ImportError) {
        setError(err.message);
      } else {
        setError(t('fileImport.errorFallback'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.csv,.zip,.json"
        className="hidden"
        onChange={(e) => {
          void handleFileChange(e);
        }}
        aria-label={t('fileImport.uploadAriaLabel')}
      />
      <div className="space-y-1">
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          aria-label={t('fileImport.ariaLabel')}
        >
          {loading ? t('fileImport.importing') : t('fileImport.buttonLabel')}
        </Button>
        {error && (
          <p className="text-xs text-util-high" role="alert">
            {error}
          </p>
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
  );
}
