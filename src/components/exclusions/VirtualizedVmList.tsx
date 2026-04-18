import { useRef, useState, useMemo } from 'react'
import type { VmRow } from '@/lib/utils/import'
import { Checkbox } from '@/components/ui/checkbox'

interface VirtualizedVmListProps {
  readonly rows: readonly VmRow[]
  readonly excludedNames: ReadonlySet<string>
  readonly onToggle: (name: string) => void
  readonly height: number
  readonly rowHeight: number
  readonly overscan?: number
}

export function VirtualizedVmList({
  rows,
  excludedNames,
  onToggle,
  height,
  rowHeight,
  overscan = 6,
}: VirtualizedVmListProps) {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const { start, end, padTop, padBottom } = useMemo(() => {
    const visible = Math.ceil(height / rowHeight)
    const s = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
    const e = Math.min(rows.length, s + visible + overscan * 2)
    return {
      start: s,
      end: e,
      padTop: s * rowHeight,
      padBottom: Math.max(0, (rows.length - e) * rowHeight),
    }
  }, [scrollTop, height, rowHeight, overscan, rows.length])

  const slice = rows.slice(start, end)

  return (
    <div
      ref={containerRef}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      className="overflow-y-auto border rounded"
      style={{ height }}
      role="list"
    >
      <div style={{ height: padTop }} aria-hidden />
      {slice.map((row) => {
        const checked = excludedNames.has(row.name)
        const ramGb = Math.round(row.ramMib / 1024)
        const diskGb = Math.round(row.diskMib / 1024)
        return (
          <label
            key={row.name}
            className="flex items-center gap-2 px-2 text-sm"
            style={{ height: rowHeight }}
            role="listitem"
          >
            <Checkbox
              checked={checked}
              onCheckedChange={() => onToggle(row.name)}
            />
            <span className="truncate flex-1 min-w-0" title={row.name}>
              {row.name}
            </span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {row.vcpus} vCPU / {ramGb} GiB / {diskGb} GiB
            </span>
            {row.powerState === 'poweredOff' && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">(off)</span>
            )}
          </label>
        )
      })}
      <div style={{ height: padBottom }} aria-hidden />
    </div>
  )
}
