/**
 * ComparisonTable — Step 3 side-by-side scenario comparison
 * Requirements: COMP-01, COMP-02, UX-04
 *
 * Orientation: metrics = rows, scenarios = columns.
 * Reads state directly from useScenariosResults() and useScenariosStore().
 */
import { useScenariosResults } from '@/hooks/useScenariosResults'
import { useScenariosStore } from '@/store/useScenariosStore'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

/**
 * Maps a utilization percentage to a Tailwind color className.
 * < 70%  → green (healthy)
 * 70-89% → amber (watch)
 * >= 90% → red (danger)
 */
export function utilizationClass(pct: number): string {
  if (pct >= 90) return 'text-red-600 font-semibold'
  if (pct >= 70) return 'text-amber-600'
  return 'text-green-600'
}

/** Capitalize the first letter of a string */
function capitalize(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Renders a transposed comparison table.
 * One column per scenario, one row per metric.
 */
export function ComparisonTable(): JSX.Element {
  const scenarios = useScenariosStore((state) => state.scenarios)
  const results = useScenariosResults()

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-48 font-semibold">Metric</TableHead>
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
            {results.map((result, i) => (
              <TableCell key={scenarios[i]?.id ?? i} className="text-center">
                {result.finalCount}
                {result.haReserveApplied ? ' (N+1)' : ''}
              </TableCell>
            ))}
          </TableRow>

          {/* Row 2: Limiting Resource */}
          <TableRow>
            <TableCell className="font-medium">Limiting Resource</TableCell>
            {results.map((result, i) => (
              <TableCell
                key={scenarios[i]?.id ?? i}
                className="text-center font-bold"
              >
                {capitalize(result.limitingResource)}
              </TableCell>
            ))}
          </TableRow>

          {/* Row 3: Achieved vCPU:pCore Ratio */}
          <TableRow>
            <TableCell className="font-medium">vCPU:pCore Ratio</TableCell>
            {results.map((result, i) => (
              <TableCell key={scenarios[i]?.id ?? i} className="text-center">
                {result.achievedVcpuToPCoreRatio.toFixed(1)}
              </TableCell>
            ))}
          </TableRow>

          {/* Row 4: VMs/Server */}
          <TableRow>
            <TableCell className="font-medium">VMs/Server</TableCell>
            {results.map((result, i) => (
              <TableCell key={scenarios[i]?.id ?? i} className="text-center">
                {result.vmsPerServer.toFixed(1)}
              </TableCell>
            ))}
          </TableRow>

          {/* Row 5: Headroom % */}
          <TableRow>
            <TableCell className="font-medium">Headroom</TableCell>
            {scenarios.map((scenario) => (
              <TableCell key={scenario.id} className="text-center">
                {scenario.headroomPercent}%
              </TableCell>
            ))}
          </TableRow>

          {/* Row 6: CPU Util % */}
          <TableRow>
            <TableCell className="font-medium">CPU Util %</TableCell>
            {results.map((result, i) => (
              <TableCell
                key={scenarios[i]?.id ?? i}
                className={`text-center ${utilizationClass(result.cpuUtilizationPercent)}`}
              >
                {result.cpuUtilizationPercent.toFixed(1)}%
              </TableCell>
            ))}
          </TableRow>

          {/* Row 7: RAM Util % */}
          <TableRow>
            <TableCell className="font-medium">RAM Util %</TableCell>
            {results.map((result, i) => (
              <TableCell
                key={scenarios[i]?.id ?? i}
                className={`text-center ${utilizationClass(result.ramUtilizationPercent)}`}
              >
                {result.ramUtilizationPercent.toFixed(1)}%
              </TableCell>
            ))}
          </TableRow>

          {/* Row 8: Disk Util % */}
          <TableRow>
            <TableCell className="font-medium">Disk Util %</TableCell>
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
