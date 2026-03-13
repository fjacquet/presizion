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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { LimitingResource } from '@/types/results'

/**
 * Maps LimitingResource values to human-readable display labels.
 * Uses 'SPECint' (not 'Specint') for the specint variant.
 * Uses briefer labels in table context (without '-limited' for specint).
 */
const RESOURCE_LABELS: Record<LimitingResource, string> = {
  cpu: 'CPU-limited',
  ram: 'RAM-limited',
  disk: 'Disk-limited',
  specint: 'SPECrate2017',
}

/**
 * Maps a utilization percentage to a Tailwind color className.
 * < 70%  → green (healthy)
 * 70-89% → amber (watch)
 * >= 90% → red (danger)
 */
export function utilizationClass(pct: number): string {
  if (pct >= 90) return 'text-red-600 dark:text-red-400 font-semibold'
  if (pct >= 70) return 'text-amber-600 dark:text-amber-400'
  return 'text-green-600 dark:text-green-400'
}

/**
 * Renders a transposed comparison table.
 * One column per scenario, one row per metric.
 */
export function ComparisonTable() {
  const scenarios = useScenariosStore((state) => state.scenarios)
  const results = useScenariosResults()
  const currentCluster = useClusterStore((state) => state.currentCluster)

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-48 font-semibold">Metric</TableHead>
            <TableHead className="font-semibold text-center bg-muted/30">As-Is</TableHead>
            {scenarios.map((scenario) => (
              <TableHead key={scenario.id} className="font-semibold text-center">
                {scenario.name}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Row 1: Servers Required */}
          <TableRow>
            <TableCell className="font-medium">Servers Required</TableCell>
            <TableCell className="text-center bg-muted/30">
              {currentCluster.existingServerCount ?? '—'}
            </TableCell>
            {results.map((result, i) => (
              <TableCell key={scenarios[i]?.id ?? i} className="text-center">
                {result.finalCount}
                {result.haReserveApplied ? ' (N+1)' : ''}
              </TableCell>
            ))}
          </TableRow>

          {/* Row 2: Server Config (REPT-01) */}
          <TableRow>
            <TableCell className="font-medium">Server Config</TableCell>
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

          {/* Row 3: Total pCores (REPT-01) */}
          <TableRow>
            <TableCell className="font-medium">Total pCores</TableCell>
            <TableCell className="text-center bg-muted/30">
              {currentCluster.totalPcores}
            </TableCell>
            {scenarios.map((scenario) => (
              <TableCell key={scenario.id} className="text-center">
                {scenario.socketsPerServer * scenario.coresPerSocket}
              </TableCell>
            ))}
          </TableRow>

          {/* Row 4: Limiting Resource */}
          <TableRow>
            <TableCell className="font-medium">Limiting Resource</TableCell>
            <TableCell className="text-center bg-muted/30">—</TableCell>
            {results.map((result, i) => (
              <TableCell
                key={scenarios[i]?.id ?? i}
                className="text-center font-bold"
              >
                {RESOURCE_LABELS[result.limitingResource]}
              </TableCell>
            ))}
          </TableRow>

          {/* Row 5: Achieved vCPU:pCore Ratio */}
          <TableRow>
            <TableCell className="font-medium">vCPU:pCore Ratio</TableCell>
            <TableCell className="text-center bg-muted/30">
              {currentCluster.totalPcores > 0
                ? (currentCluster.totalVcpus / currentCluster.totalPcores).toFixed(1)
                : '—'}
            </TableCell>
            {results.map((result, i) => (
              <TableCell key={scenarios[i]?.id ?? i} className="text-center">
                {result.achievedVcpuToPCoreRatio.toFixed(1)}
              </TableCell>
            ))}
          </TableRow>

          {/* Row 6: VMs/Server */}
          <TableRow>
            <TableCell className="font-medium">VMs/Server</TableCell>
            <TableCell className="text-center bg-muted/30">—</TableCell>
            {results.map((result, i) => (
              <TableCell key={scenarios[i]?.id ?? i} className="text-center">
                {result.vmsPerServer.toFixed(1)}
              </TableCell>
            ))}
          </TableRow>

          {/* Row 7: Headroom % */}
          <TableRow>
            <TableCell className="font-medium">Headroom</TableCell>
            <TableCell className="text-center bg-muted/30">—</TableCell>
            {scenarios.map((scenario) => (
              <TableCell key={scenario.id} className="text-center">
                {scenario.headroomPercent}%
              </TableCell>
            ))}
          </TableRow>

          {/* Row 8: CPU Util % */}
          <TableRow>
            <TableCell className="font-medium">CPU Util %</TableCell>
            <TableCell className="text-center bg-muted/30">—</TableCell>
            {results.map((result, i) => (
              <TableCell
                key={scenarios[i]?.id ?? i}
                className={`text-center ${utilizationClass(result.cpuUtilizationPercent)}`}
              >
                {result.cpuUtilizationPercent.toFixed(1)}%
              </TableCell>
            ))}
          </TableRow>

          {/* Row 9: RAM Util % */}
          <TableRow>
            <TableCell className="font-medium">RAM Util %</TableCell>
            <TableCell className="text-center bg-muted/30">—</TableCell>
            {results.map((result, i) => (
              <TableCell
                key={scenarios[i]?.id ?? i}
                className={`text-center ${utilizationClass(result.ramUtilizationPercent)}`}
              >
                {result.ramUtilizationPercent.toFixed(1)}%
              </TableCell>
            ))}
          </TableRow>

          {/* Row 10: Disk Util % */}
          <TableRow>
            <TableCell className="font-medium">Disk Util %</TableCell>
            <TableCell className="text-center bg-muted/30">—</TableCell>
            {results.map((result, i) => (
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
  )
}
