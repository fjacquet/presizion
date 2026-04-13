import { TableCell, TableRow } from '@/components/ui/table'
import type { OldCluster, Scenario } from '@/types/cluster'
import type { ScenarioResult, LimitingResource } from '@/types/results'
import type { SizingMode } from '@/lib/sizing/constraints'

const RESOURCE_LABELS: Record<LimitingResource, string> = {
  cpu: 'CPU-limited',
  ram: 'RAM-limited',
  disk: 'Disk-limited',
  specint: 'SPECrate2017',
  ghz: 'GHz-limited',
}

const STICKY = 'font-medium sticky left-0 bg-background z-10'
const ASIS = 'text-center bg-muted/30'

interface NodeSizingRowsProps {
  readonly cluster: OldCluster
  readonly scenarios: readonly Scenario[]
  readonly results: readonly ScenarioResult[]
  readonly sizingMode: SizingMode
}

export function NodeSizingRows({ cluster, scenarios, results, sizingMode }: NodeSizingRowsProps) {
  const showRatioRow = sizingMode !== 'specint'

  return (
    <>
      {/* Servers Required */}
      <TableRow>
        <TableCell className={STICKY}>Servers Required</TableCell>
        <TableCell className={ASIS}>
          {cluster.existingServerCount ?? '—'}
        </TableCell>
        {results.map((result, i) => (
          <TableCell key={scenarios[i]?.id ?? i} className="text-center">
            {result.haReserveApplied ? (
              <span>
                {result.requiredCount}
                <span className="text-xs text-muted-foreground ml-1">
                  + {result.haReserveCount} (N+{result.haReserveCount})
                </span>
                {' = '}
                <span className="font-semibold">{result.finalCount}</span>
              </span>
            ) : (
              result.finalCount
            )}
          </TableCell>
        ))}
      </TableRow>

      {/* Server Config */}
      <TableRow>
        <TableCell className={STICKY}>Server Config</TableCell>
        <TableCell className={ASIS}>
          {cluster.socketsPerServer && cluster.coresPerSocket
            ? `${cluster.socketsPerServer}s × ${cluster.coresPerSocket}c`
            : '—'}
        </TableCell>
        {scenarios.map((s) => (
          <TableCell key={s.id} className="text-center">
            {`${s.socketsPerServer}s × ${s.coresPerSocket}c`}
          </TableCell>
        ))}
      </TableRow>

      {/* Limiting Resource */}
      <TableRow>
        <TableCell className={STICKY}>Limiting Resource</TableCell>
        <TableCell className={ASIS}>N/A</TableCell>
        {results.map((result, i) => (
          <TableCell key={scenarios[i]?.id ?? i} className="text-center font-bold">
            {RESOURCE_LABELS[result.limitingResource]}
          </TableCell>
        ))}
      </TableRow>

      {/* vCPU:pCore Ratio */}
      {showRatioRow && (
        <TableRow>
          <TableCell className={STICKY}>
            vCPU:pCore Ratio
            {(sizingMode === 'aggressive' || sizingMode === 'ghz') && (
              <span className="text-xs text-muted-foreground ml-1">(not enforced)</span>
            )}
          </TableCell>
          <TableCell className={ASIS}>
            {cluster.totalPcores > 0
              ? `${(cluster.totalVcpus / cluster.totalPcores).toFixed(1)}:1`
              : '—'}
          </TableCell>
          {results.map((result, i) => {
            const achieved = result.achievedVcpuToPCoreRatio
            const target = scenarios[i]?.targetVcpuToPCoreRatio ?? 0
            const exceeds = sizingMode === 'vcpu' && target > 0 && achieved > target + 0.05
            return (
              <TableCell
                key={scenarios[i]?.id ?? i}
                className={`text-center ${exceeds ? 'text-amber-600 font-semibold' : ''}`}
              >
                {exceeds ? `⚠ ${achieved.toFixed(1)}:1` : `${achieved.toFixed(1)}:1`}
                {exceeds && (
                  <span className="text-xs text-muted-foreground ml-1">(target: {target})</span>
                )}
              </TableCell>
            )
          })}
        </TableRow>
      )}

      {/* VMs/Server */}
      <TableRow>
        <TableCell className={STICKY}>VMs/Server</TableCell>
        <TableCell className={ASIS}>
          {cluster.existingServerCount && cluster.existingServerCount > 0
            ? (cluster.totalVms / cluster.existingServerCount).toFixed(1)
            : '\u2014'}
        </TableCell>
        {results.map((result, i) => (
          <TableCell key={scenarios[i]?.id ?? i} className="text-center">
            {result.vmsPerServer.toFixed(1)}
          </TableCell>
        ))}
      </TableRow>

      {/* Headroom % */}
      <TableRow>
        <TableCell className={STICKY}>Headroom</TableCell>
        <TableCell className={ASIS}>N/A</TableCell>
        {scenarios.map((s) => (
          <TableCell key={s.id} className="text-center">
            {s.headroomPercent}%
          </TableCell>
        ))}
      </TableRow>
    </>
  )
}
