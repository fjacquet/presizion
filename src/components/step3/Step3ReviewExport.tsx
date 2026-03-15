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
import { SizingChart } from './SizingChart'
import { CoreCountChart } from './CoreCountChart'
import { CapacityStackedChart } from './CapacityStackedChart'
import { MinNodesChart } from './MinNodesChart'
import { Button } from '@/components/ui/button'
import { useScenariosResults } from '@/hooks/useScenariosResults'
import { useScenariosStore } from '@/store/useScenariosStore'
import { useClusterStore } from '@/store/useClusterStore'
import { useWizardStore } from '@/store/useWizardStore'
import { buildSummaryText, copyToClipboard } from '@/lib/utils/clipboard'
import { buildCsvContent, downloadCsv, buildJsonContent, downloadJson } from '@/lib/utils/export'
import { encodeSessionToHash } from '@/lib/utils/persistence'

export function Step3ReviewExport() {
  const currentCluster = useClusterStore((state) => state.currentCluster)
  const scenarios = useScenariosStore((state) => state.scenarios)
  const results = useScenariosResults()
  const sizingMode = useWizardStore((state) => state.sizingMode)
  const layoutMode = useWizardStore((state) => state.layoutMode)
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shareTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Shared chart container refs for PDF/PPTX export (Plans 02 & 03) */
  const chartRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Clear timeouts on unmount to prevent memory leak / setState-after-unmount warning
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
      }
      if (shareTimeoutRef.current !== null) {
        clearTimeout(shareTimeoutRef.current)
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

  const handleShare = async (): Promise<void> => {
    const hash = encodeSessionToHash({ cluster: currentCluster, scenarios, sizingMode, layoutMode })
    const url = `${window.location.origin}${window.location.pathname}#${hash}`
    await copyToClipboard(url)
    setShared(true)
    if (shareTimeoutRef.current !== null) clearTimeout(shareTimeoutRef.current)
    shareTimeoutRef.current = setTimeout(() => {
      setShared(false)
      shareTimeoutRef.current = null
    }, 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Review &amp; Export</h2>
        <p className="text-muted-foreground mt-1">
          Compare your target scenarios side-by-side, then export the results.
        </p>
      </div>

      <div className="flex gap-3 mb-6 print:hidden">
        <Button variant="outline" onClick={() => { void handleCopy() }}>
          {copied ? 'Copied!' : 'Copy Summary'}
        </Button>
        <Button variant="outline" onClick={handleDownloadCsv}>
          Download CSV
        </Button>
        <Button variant="outline" onClick={handleDownloadJson}>
          Download JSON
        </Button>
        <Button variant="outline" onClick={() => { void handleShare() }}>
          {shared ? 'Link Copied!' : 'Share'}
        </Button>
      </div>

      <ComparisonTable />

      <div className="print:hidden space-y-8">
        <SizingChart />
        <CoreCountChart />
        <CapacityStackedChart chartRefs={chartRefs} />
        <MinNodesChart chartRefs={chartRefs} />
      </div>
    </div>
  )
}
