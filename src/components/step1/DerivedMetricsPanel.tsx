import { useClusterStore } from '@/store/useClusterStore'
import { useScenariosResults } from '@/hooks/useScenariosResults'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface MetricItemProps {
  label: string
  value: string | number
  unit?: string
}

function MetricItem({ label, value, unit }: MetricItemProps) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold tabular-nums">
        {value}
        {unit ? (
          <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
        ) : null}
      </span>
    </div>
  )
}

export function DerivedMetricsPanel() {
  const cluster = useClusterStore((s) => s.currentCluster)
  const results = useScenariosResults()

  const vcpuToPcoreRatio =
    cluster.totalPcores > 0
      ? (cluster.totalVcpus / cluster.totalPcores).toFixed(2)
      : '\u2014'

  const firstResult = results[0]
  const vmsPerServer = firstResult ? firstResult.vmsPerServer.toFixed(1) : '\u2014'

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Derived Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricItem label="vCPU:pCore Ratio" value={vcpuToPcoreRatio} />
          <MetricItem label="VMs/Server (CPU)" value={vmsPerServer} />
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Updates live as you enter values. VMs/Server is based on first scenario defaults.
        </p>
      </CardContent>
    </Card>
  )
}
