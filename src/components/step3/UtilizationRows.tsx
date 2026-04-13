import { TableCell, TableRow } from '@/components/ui/table'
import type { OldCluster, Scenario } from '@/types/cluster'
import type { ScenarioResult } from '@/types/results'
import type { SizingMode, LayoutMode } from '@/lib/sizing/constraints'
import { UtilizationCell } from './UtilizationCell'

const STICKY = 'font-medium sticky left-0 bg-background z-10'
const ASIS = 'text-center bg-muted/30'

interface UtilizationRowsProps {
  readonly cluster: OldCluster
  readonly scenarios: readonly Scenario[]
  readonly results: readonly ScenarioResult[]
  readonly sizingMode: SizingMode
  readonly layoutMode: LayoutMode
}

export function UtilizationRows({ cluster, scenarios, results, sizingMode, layoutMode }: UtilizationRowsProps) {
  const showCpuUtilRow = sizingMode !== 'specint' &&
    (sizingMode !== 'vcpu' || cluster.cpuUtilizationPercent !== undefined)
  const cpuUtilIsSizingDriver = sizingMode === 'aggressive' || sizingMode === 'ghz'

  return (
    <>
      {/* CPU Util % */}
      {showCpuUtilRow && (
        <TableRow>
          <TableCell className={STICKY}>
            {cpuUtilIsSizingDriver && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 mr-1.5">
                sizing driver
              </span>
            )}
            CPU Util %
          </TableCell>
          <TableCell className={ASIS}>
            {cluster.cpuUtilizationPercent !== undefined
              ? `${cluster.cpuUtilizationPercent.toFixed(1)}%`
              : '\u2014'}
          </TableCell>
          {results.map((result, i) => (
            <UtilizationCell
              key={scenarios[i]?.id ?? i}
              pct={result.cpuUtilizationPercent}
              target={scenarios[i]?.targetCpuUtilizationPercent}
            />
          ))}
        </TableRow>
      )}

      {/* RAM Util % */}
      <TableRow>
        <TableCell className={STICKY}>RAM Util %</TableCell>
        <TableCell className={ASIS}>
          {cluster.ramUtilizationPercent !== undefined
            ? `${cluster.ramUtilizationPercent.toFixed(1)}%`
            : '\u2014'}
        </TableCell>
        {results.map((result, i) => (
          <UtilizationCell
            key={scenarios[i]?.id ?? i}
            pct={result.ramUtilizationPercent}
            target={scenarios[i]?.targetRamUtilizationPercent}
          />
        ))}
      </TableRow>

      {/* Disk Util % — HCI only */}
      {layoutMode === 'hci' && (
        <TableRow>
          <TableCell className={STICKY}>Disk Util %</TableCell>
          <TableCell className={ASIS}>{'\u2014'}</TableCell>
          {results.map((result, i) => (
            <UtilizationCell
              key={scenarios[i]?.id ?? i}
              pct={result.diskUtilizationPercent}
            />
          ))}
        </TableRow>
      )}
    </>
  )
}
