import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { SpecResult, SpecLookupResult } from '@/lib/utils/specLookup'

interface SpecResultsPanelProps {
  results: SpecResult[]
  status: SpecLookupResult['status']
  isLoading: boolean
  onSelect: (result: SpecResult) => void
  selectedScore?: number | undefined
}

/**
 * Collapsible panel displaying SPECrate2017 benchmark results.
 * Collapsed by default. Clicking a result row calls onSelect with baseResult.
 */
export function SpecResultsPanel({
  results,
  status,
  isLoading,
  onSelect,
  selectedScore,
}: SpecResultsPanelProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border rounded-md mb-3">
      <button
        type="button"
        className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-left hover:bg-muted/50"
        onClick={() => setOpen(!open)}
      >
        <ChevronRight
          className={`h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`}
        />
        SPECrate2017 Results
      </button>

      {open && (
        <div className="px-3 pb-3">
          {isLoading && (
            <p className="text-sm text-muted-foreground py-2">Loading...</p>
          )}

          {!isLoading && status === 'no-results' && (
            <p className="text-sm text-muted-foreground py-2">
              No SPECrate2017 results found for this CPU model
            </p>
          )}

          {!isLoading && status === 'error' && (
            <p className="text-sm text-destructive py-2">
              Could not fetch SPEC results. Use manual entry below.
            </p>
          )}

          {!isLoading && status === 'ok' && results.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-1 pr-3">Vendor</th>
                    <th className="py-1 pr-3">System</th>
                    <th className="py-1 pr-3">Base Score</th>
                    <th className="py-1 pr-3">Cores</th>
                    <th className="py-1">Chips</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((row, i) => (
                    <tr
                      key={`${row.vendor}-${row.system}-${i}`}
                      className={`cursor-pointer hover:bg-muted ${
                        selectedScore === row.baseResult ? 'bg-primary/10' : ''
                      }`}
                      onClick={() => onSelect(row)}
                    >
                      <td className="py-1 pr-3">{row.vendor}</td>
                      <td className="py-1 pr-3">{row.system}</td>
                      <td className="py-1 pr-3">{row.baseResult}</td>
                      <td className="py-1 pr-3">{row.cores}</td>
                      <td className="py-1">{row.chips}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
