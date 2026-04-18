import { useMemo, useState } from 'react'
import type { VmRow } from '@/lib/utils/import'
import { useExclusionsStore } from '@/store/useExclusionsStore'
import { applyExclusions } from '@/lib/utils/import/exclusions'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { VirtualizedVmList } from './VirtualizedVmList'

interface VmExclusionPanelProps {
  readonly rows: readonly VmRow[]
}

export function VmExclusionPanel({ rows }: VmExclusionPanelProps) {
  const rules = useExclusionsStore((s) => s.rules)
  const setRules = useExclusionsStore((s) => s.setRules)
  const toggleManual = useExclusionsStore((s) => s.toggleManual)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [showOnlyExcluded, setShowOnlyExcluded] = useState(false)

  const hasPowerState = rows.some((r) => r.powerState !== undefined)

  const { filtered, stats } = useMemo(() => {
    const grouped = new Map<string, VmRow[]>([['__all__', [...rows]]])
    const { filteredByScope, stats } = applyExclusions(grouped, rules)
    return { filtered: filteredByScope.get('__all__') ?? [], stats }
  }, [rows, rules])

  const excludedNames = useMemo(() => {
    const keep = new Set(filtered.map((r) => r.name))
    return new Set(rows.filter((r) => !keep.has(r.name)).map((r) => r.name))
  }, [rows, filtered])

  const listedRows = useMemo(() => {
    let list: readonly VmRow[] = rows
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((r) => r.name.toLowerCase().includes(q))
    }
    if (showOnlyExcluded) list = list.filter((r) => excludedNames.has(r.name))
    return list
  }, [rows, search, showOnlyExcluded, excludedNames])

  const handleRowToggle = (name: string): void => {
    const kind = excludedNames.has(name) ? 'included' : 'excluded'
    toggleManual(name, kind)
  }

  return (
    <div className="space-y-3 border rounded-md p-3">
      <h3 className="text-sm font-medium">VM Exclusions</h3>

      <div className="grid gap-2">
        <label className="text-xs font-medium">
          Name patterns
          <Input
            aria-label="Name patterns"
            value={rules.namePattern}
            onChange={(e) => setRules({ namePattern: e.target.value })}
            placeholder="test-*, dev-??-*"
          />
        </label>
        <label className="text-xs font-medium">
          Exact names
          <Textarea
            aria-label="Exact names"
            value={rules.exactNames.join('\n')}
            onChange={(e) => setRules({
              exactNames: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
            })}
            rows={3}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            aria-label="Exclude powered-off VMs"
            checked={rules.excludePoweredOff}
            disabled={!hasPowerState}
            onCheckedChange={(c) => setRules({ excludePoweredOff: c === true })}
          />
          Exclude powered-off VMs
          {!hasPowerState && (
            <span className="text-xs text-muted-foreground">
              (power state not available in source file)
            </span>
          )}
        </label>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setReviewOpen((v) => !v)}
      >
        {reviewOpen ? 'Hide' : 'Review'} {rows.length} VMs individually
      </Button>

      {reviewOpen && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Search VM names"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <label className="flex items-center gap-1 text-xs">
              <Checkbox
                checked={showOnlyExcluded}
                onCheckedChange={(c) => setShowOnlyExcluded(c === true)}
              />
              Excluded only
            </label>
          </div>
          <VirtualizedVmList
            rows={listedRows}
            excludedNames={excludedNames}
            onToggle={handleRowToggle}
            height={240}
            rowHeight={32}
          />
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        <p>Excluded: {stats.excludedCount} of {stats.totalVms} VMs</p>
        <ul className="list-disc pl-5">
          <li>{stats.excludedByRule.namePattern} by name pattern</li>
          <li>{stats.excludedByRule.powerState} powered-off</li>
          <li>{stats.excludedByRule.manual} manual</li>
        </ul>
      </div>
    </div>
  )
}
