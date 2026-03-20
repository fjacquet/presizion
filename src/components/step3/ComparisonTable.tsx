/**
 * ComparisonTable — Step 3 side-by-side scenario comparison
 * Requirements: COMP-01, COMP-02, UX-04
 *
 * Orientation: metrics = rows, scenarios = columns.
 * Reads state directly from useScenariosResults() and useScenariosStore().
 */
import { useScenariosResults } from '@/hooks/useScenariosResults'
import { useScenariosStore } from '@/store/useScenariosStore'
import { useClusterStore } from '@/store/useClusterStore'
import { useWizardStore } from '@/store/useWizardStore'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import type { LimitingResource } from '@/types/results'
import { utilizationClass } from '@/lib/utils/utilizationClass'

const RESOURCE_LABELS: Record<LimitingResource, string> = {
  cpu: 'CPU-limited',
  ram: 'RAM-limited',
  disk: 'Disk-limited',
  specint: 'SPECrate2017',
  ghz: 'GHz-limited',
}

const MODE_LABELS = {
  vcpu: 'vCPU',
  specint: 'SPECrate2017',
  aggressive: 'Aggressive',
  ghz: 'GHz',
}

export function ComparisonTable() {
  const scenarios = useScenariosStore((state) => state.scenarios)
  const results = useScenariosResults()
  const currentCluster = useClusterStore((state) => state.currentCluster)
  const sizingMode = useWizardStore((s) => s.sizingMode)
  const layoutMode = useWizardStore((s) => s.layoutMode)

  const showRatioRow = sizingMode !== 'specint'
  const showCpuUtilRow = sizingMode !== 'specint' &&
    (sizingMode !== 'vcpu' || currentCluster.cpuUtilizationPercent !== undefined)
  const cpuUtilIsSizingDriver = sizingMode === 'aggressive' || sizingMode === 'ghz'

  return (
    <div className="space-y-3">
      {/* Metadata chips */}
      <div className="flex flex-wrap gap-2 text-sm">
        <span className="text-muted-foreground">Mode:</span>
        <Badge variant="outline">{MODE_LABELS[sizingMode]}</Badge>
        <span className="text-muted-foreground ml-2">Layout:</span>
        <Badge variant="outline">{layoutMode === 'hci' ? 'HCI' : 'Disaggregated'}</Badge>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table className="min-w-max">
          <TableHeader>
            <TableRow>
              <TableHead className="w-48 font-semibold sticky left-0 bg-background z-10">Metric</TableHead>
              <TableHead className="font-semibold text-center bg-muted/30">As-Is</TableHead>
              {scenarios.map((scenario) => (
                <TableHead key={scenario.id} className="font-semibold text-center">
                  {scenario.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Row 1: Servers Required — show split HA breakdown */}
            <TableRow>
              <TableCell className="font-medium sticky left-0 bg-background z-10">Servers Required</TableCell>
              <TableCell className="text-center bg-muted/30">
                {currentCluster.existingServerCount ?? '—'}
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

            {/* Row 2: Server Config */}
            <TableRow>
              <TableCell className="font-medium sticky left-0 bg-background z-10">Server Config</TableCell>
              <TableCell className="text-center bg-muted/30">
                {currentCluster.socketsPerServer && currentCluster.coresPerSocket
                  ? `${currentCluster.socketsPerServer}s × ${currentCluster.coresPerSocket}c`
                  : '—'}
              </TableCell>
              {scenarios.map((scenario) => (
                <TableCell key={scenario.id} className="text-center">
                  {`${scenario.socketsPerServer}s × ${scenario.coresPerSocket}c`}
                </TableCell>
              ))}
            </TableRow>

            {/* Row 3: Total pCores */}
            <TableRow>
              <TableCell className="font-medium sticky left-0 bg-background z-10">Total pCores</TableCell>
              <TableCell className="text-center bg-muted/30">
                {currentCluster.totalPcores}
              </TableCell>
              {results.map((result, i) => (
                <TableCell key={scenarios[i]?.id ?? i} className="text-center">
                  {result.finalCount * (scenarios[i]?.socketsPerServer ?? 0) * (scenarios[i]?.coresPerSocket ?? 0)}
                </TableCell>
              ))}
            </TableRow>

            {/* Row 4: Limiting Resource */}
            <TableRow>
              <TableCell className="font-medium sticky left-0 bg-background z-10">Limiting Resource</TableCell>
              <TableCell className="text-center bg-muted/30">N/A</TableCell>
              {results.map((result, i) => (
                <TableCell key={scenarios[i]?.id ?? i} className="text-center font-bold">
                  {RESOURCE_LABELS[result.limitingResource]}
                </TableCell>
              ))}
            </TableRow>

            {/* Row 5: vCPU:pCore Ratio — hidden in SPECint; no warning in aggressive/ghz */}
            {showRatioRow && (
              <TableRow>
                <TableCell className="font-medium sticky left-0 bg-background z-10">
                  vCPU:pCore Ratio
                  {(sizingMode === 'aggressive' || sizingMode === 'ghz') && (
                    <span className="text-xs text-muted-foreground ml-1">(not enforced)</span>
                  )}
                </TableCell>
                <TableCell className="text-center bg-muted/30">
                  {currentCluster.totalPcores > 0
                    ? `${(currentCluster.totalVcpus / currentCluster.totalPcores).toFixed(1)}:1`
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

            {/* Row 6: VMs/Server */}
            <TableRow>
              <TableCell className="font-medium sticky left-0 bg-background z-10">VMs/Server</TableCell>
              <TableCell className="text-center bg-muted/30">
                {currentCluster.existingServerCount && currentCluster.existingServerCount > 0
                  ? (currentCluster.totalVms / currentCluster.existingServerCount).toFixed(1)
                  : '\u2014'}
              </TableCell>
              {results.map((result, i) => (
                <TableCell key={scenarios[i]?.id ?? i} className="text-center">
                  {result.vmsPerServer.toFixed(1)}
                </TableCell>
              ))}
            </TableRow>

            {/* Row 7: Headroom % */}
            <TableRow>
              <TableCell className="font-medium sticky left-0 bg-background z-10">Headroom</TableCell>
              <TableCell className="text-center bg-muted/30">N/A</TableCell>
              {scenarios.map((scenario) => (
                <TableCell key={scenario.id} className="text-center">
                  {scenario.headroomPercent}%
                </TableCell>
              ))}
            </TableRow>

            {/* Row 8: CPU Util % — hidden in SPECint; [sizing driver] badge in aggressive/ghz */}
            {showCpuUtilRow && (
              <TableRow>
                <TableCell className="font-medium sticky left-0 bg-background z-10">
                  {cpuUtilIsSizingDriver && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 mr-1.5">
                      sizing driver
                    </span>
                  )}
                  CPU Util %
                </TableCell>
                <TableCell className="text-center bg-muted/30">
                  {currentCluster.cpuUtilizationPercent !== undefined
                    ? `${currentCluster.cpuUtilizationPercent.toFixed(1)}%`
                    : '\u2014'}
                </TableCell>
                {results.map((result, i) => {
                  const pct = result.cpuUtilizationPercent
                  const target = scenarios[i]?.targetCpuUtilizationPercent ?? 100
                  return (
                    <TableCell
                      key={scenarios[i]?.id ?? i}
                      className={`text-center ${utilizationClass(pct)}`}
                    >
                      {pct > 100 ? `⚠ ${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`}
                      {target < 100 && (
                        <span className="text-xs text-muted-foreground ml-1">/ {target}%</span>
                      )}
                    </TableCell>
                  )
                })}
              </TableRow>
            )}

            {/* Row 9: RAM Util % */}
            <TableRow>
              <TableCell className="font-medium sticky left-0 bg-background z-10">RAM Util %</TableCell>
              <TableCell className="text-center bg-muted/30">
                {currentCluster.ramUtilizationPercent !== undefined
                  ? `${currentCluster.ramUtilizationPercent.toFixed(1)}%`
                  : '\u2014'}
              </TableCell>
              {results.map((result, i) => {
                const pct = result.ramUtilizationPercent
                const target = scenarios[i]?.targetRamUtilizationPercent ?? 100
                return (
                  <TableCell
                    key={scenarios[i]?.id ?? i}
                    className={`text-center ${utilizationClass(pct)}`}
                  >
                    {pct > 100 ? `⚠ ${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`}
                    {target < 100 && (
                      <span className="text-xs text-muted-foreground ml-1">/ {target}%</span>
                    )}
                  </TableCell>
                )
              })}
            </TableRow>

            {/* Row 10: Disk Util % (HCI) or Total Disk Required (disaggregated) */}
            <TableRow>
              <TableCell className="font-medium sticky left-0 bg-background z-10">
                {layoutMode === 'disaggregated' ? 'Total Disk Required' : 'Disk Util %'}
              </TableCell>
              <TableCell className="text-center bg-muted/30">
                {layoutMode === 'disaggregated' && currentCluster.totalDiskGb
                  ? `${Math.round(currentCluster.totalDiskGb).toLocaleString()} GB`
                  : '\u2014'}
              </TableCell>
              {layoutMode === 'disaggregated'
                ? scenarios.map((scenario, i) => {
                    const effectiveVmCount = scenario.targetVmCount ?? currentCluster.totalVms
                    const headroomFactor = 1 + scenario.headroomPercent / 100
                    const storageGrowthFactor = 1 + (scenario.storageGrowthPercent ?? 0) / 100
                    const totalGb = Math.round(effectiveVmCount * scenario.diskPerVmGb * storageGrowthFactor * headroomFactor)
                    return (
                      <TableCell key={scenario.id ?? i} className="text-center">
                        {totalGb.toLocaleString()} GB
                      </TableCell>
                    )
                  })
                : results.map((result, i) => (
                    <TableCell
                      key={scenarios[i]?.id ?? i}
                      className={`text-center ${utilizationClass(result.diskUtilizationPercent)}`}
                    >
                      {result.diskUtilizationPercent.toFixed(1)}%
                    </TableCell>
                  ))}
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
