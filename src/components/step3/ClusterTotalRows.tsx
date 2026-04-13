import { TableCell, TableRow } from '@/components/ui/table'
import type { OldCluster, Scenario } from '@/types/cluster'
import type { ScenarioResult } from '@/types/results'
import type { LayoutMode } from '@/lib/sizing/constraints'
import {
  toBeVcpus,
  toBePcores,
  toBeVms,
  toBeRamGb,
  toBeDiskGb,
  toBeDisaggregatedDiskGb,
  asIsRamGb,
} from '@/lib/sizing/clusterTotals'

const STICKY = 'font-medium sticky left-0 bg-background z-10'
const ASIS = 'text-center bg-muted/30'

interface ClusterTotalRowsProps {
  readonly cluster: OldCluster
  readonly scenarios: readonly Scenario[]
  readonly results: readonly ScenarioResult[]
  readonly layoutMode: LayoutMode
}

export function ClusterTotalRows({ cluster, scenarios, results, layoutMode }: ClusterTotalRowsProps) {
  const asIsTotalRam = asIsRamGb(cluster)

  return (
    <>
      {/* Total vCPUs */}
      <TableRow>
        <TableCell className={STICKY}>Total vCPUs</TableCell>
        <TableCell className={ASIS}>{cluster.totalVcpus.toLocaleString()}</TableCell>
        {scenarios.map((s, i) => (
          <TableCell key={s.id ?? i} className="text-center">
            {toBeVcpus(cluster, s).toLocaleString()}
          </TableCell>
        ))}
      </TableRow>

      {/* Total pCores */}
      <TableRow>
        <TableCell className={STICKY}>Total pCores</TableCell>
        <TableCell className={ASIS}>{cluster.totalPcores.toLocaleString()}</TableCell>
        {results.map((result, i) => (
          <TableCell key={scenarios[i]?.id ?? i} className="text-center">
            {toBePcores(scenarios[i]!, result).toLocaleString()}
          </TableCell>
        ))}
      </TableRow>

      {/* Total VMs */}
      <TableRow>
        <TableCell className={STICKY}>Total VMs</TableCell>
        <TableCell className={ASIS}>{cluster.totalVms.toLocaleString()}</TableCell>
        {scenarios.map((s, i) => (
          <TableCell key={s.id ?? i} className="text-center">
            {toBeVms(cluster, s).toLocaleString()}
          </TableCell>
        ))}
      </TableRow>

      {/* Total RAM (GB) */}
      <TableRow>
        <TableCell className={STICKY}>Total RAM (GB)</TableCell>
        <TableCell className={ASIS}>
          {asIsTotalRam !== undefined ? asIsTotalRam.toLocaleString() : '\u2014'}
        </TableCell>
        {results.map((result, i) => (
          <TableCell key={scenarios[i]?.id ?? i} className="text-center">
            {toBeRamGb(scenarios[i]!, result).toLocaleString()}
          </TableCell>
        ))}
      </TableRow>

      {/* Total Disk (GB) — HCI/vSAN only */}
      {layoutMode === 'hci' && (
        <TableRow>
          <TableCell className={STICKY}>Total Disk (GB)</TableCell>
          <TableCell className={ASIS}>
            {cluster.totalDiskGb
              ? Math.round(cluster.totalDiskGb).toLocaleString()
              : '\u2014'}
          </TableCell>
          {results.map((result, i) => (
            <TableCell key={scenarios[i]?.id ?? i} className="text-center">
              {toBeDiskGb(scenarios[i]!, result).toLocaleString()}
            </TableCell>
          ))}
        </TableRow>
      )}

      {/* Total Disk Required — disaggregated only */}
      {layoutMode === 'disaggregated' && (
        <TableRow>
          <TableCell className={STICKY}>Total Disk Required</TableCell>
          <TableCell className={ASIS}>
            {cluster.totalDiskGb
              ? `${Math.round(cluster.totalDiskGb).toLocaleString()} GB`
              : '\u2014'}
          </TableCell>
          {scenarios.map((s, i) => (
            <TableCell key={s.id ?? i} className="text-center">
              {toBeDisaggregatedDiskGb(cluster, s).toLocaleString()} GB
            </TableCell>
          ))}
        </TableRow>
      )}
    </>
  )
}
