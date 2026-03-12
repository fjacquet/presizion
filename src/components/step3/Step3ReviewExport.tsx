/**
 * Step 3: Review & Export
 * Requirements: EXPO-01, EXPO-02, COMP-01, COMP-02, UX-04
 *
 * Container component:
 * - Renders ComparisonTable for side-by-side scenario view
 * - Provides "Copy Summary" button (clipboard plain-text export)
 * - Provides "Download CSV" button (RFC 4180 CSV file download)
 *
 * Reads state from useClusterStore, useScenariosStore, useScenariosResults.
 * No data props — all data flows from Zustand stores.
 */
import { ComparisonTable } from './ComparisonTable'
import { Button } from '@/components/ui/button'
import { useScenariosResults } from '@/hooks/useScenariosResults'
import { useScenariosStore } from '@/store/useScenariosStore'
import { useClusterStore } from '@/store/useClusterStore'
import { buildSummaryText, copyToClipboard } from '@/lib/utils/clipboard'
import { buildCsvContent, downloadCsv } from '@/lib/utils/export'

export function Step3ReviewExport(): JSX.Element {
  const currentCluster = useClusterStore((state) => state.currentCluster)
  const scenarios = useScenariosStore((state) => state.scenarios)
  const results = useScenariosResults()

  const handleCopy = async (): Promise<void> => {
    const text = buildSummaryText(currentCluster, scenarios, results)
    await copyToClipboard(text)
  }

  const handleDownloadCsv = (): void => {
    const csv = buildCsvContent(currentCluster, scenarios, results)
    downloadCsv('cluster-sizing.csv', csv)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Review &amp; Export</h2>
        <p className="text-muted-foreground mt-1">
          Compare your target scenarios side-by-side, then export the results.
        </p>
      </div>

      <div className="flex gap-3 mb-6">
        <Button variant="outline" onClick={() => { void handleCopy() }}>
          Copy Summary
        </Button>
        <Button variant="outline" onClick={handleDownloadCsv}>
          Download CSV
        </Button>
      </div>

      <ComparisonTable />
    </div>
  )
}
