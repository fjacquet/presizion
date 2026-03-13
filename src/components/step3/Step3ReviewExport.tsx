/**
 * Step 3: Review & Export
 * Requirements: EXPO-01, EXPO-02, COMP-01, COMP-02, UX-04, UX-06
 *
 * Container component:
 * - Renders ComparisonTable for side-by-side scenario view
 * - Provides "Copy Summary" button (clipboard plain-text export) with "Copied!" feedback
 * - Provides "Download CSV" button (RFC 4180 CSV file download)
 *
 * Reads state from useClusterStore, useScenariosStore, useScenariosResults.
 * No data props — all data flows from Zustand stores.
 */
import { useState, useRef, useEffect } from 'react'
import { ComparisonTable } from './ComparisonTable'
import { Button } from '@/components/ui/button'
import { useScenariosResults } from '@/hooks/useScenariosResults'
import { useScenariosStore } from '@/store/useScenariosStore'
import { useClusterStore } from '@/store/useClusterStore'
import { buildSummaryText, copyToClipboard } from '@/lib/utils/clipboard'
import { buildCsvContent, downloadCsv, buildJsonContent, downloadJson } from '@/lib/utils/export'

export function Step3ReviewExport() {
  const currentCluster = useClusterStore((state) => state.currentCluster)
  const scenarios = useScenariosStore((state) => state.scenarios)
  const results = useScenariosResults()
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clear timeout on unmount to prevent memory leak / setState-after-unmount warning
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleCopy = async (): Promise<void> => {
    const text = buildSummaryText(currentCluster, scenarios, results)
    await copyToClipboard(text)
    setCopied(true)
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      setCopied(false)
      timeoutRef.current = null
    }, 2000)
  }

  const handleDownloadCsv = (): void => {
    const csv = buildCsvContent(currentCluster, scenarios, results)
    downloadCsv('cluster-sizing.csv', csv)
  }

  const handleDownloadJson = (): void => {
    const json = buildJsonContent(currentCluster, scenarios, results)
    downloadJson('cluster-sizing.json', json)
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
          {copied ? 'Copied!' : 'Copy Summary'}
        </Button>
        <Button variant="outline" onClick={handleDownloadCsv}>
          Download CSV
        </Button>
        <Button variant="outline" onClick={handleDownloadJson}>
          Download JSON
        </Button>
      </div>

      <ComparisonTable />
    </div>
  )
}
