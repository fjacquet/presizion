import { useScenariosResults } from '@/hooks/useScenariosResults'
import { useScenariosStore } from '@/store/useScenariosStore'
import { useClusterStore } from '@/store/useClusterStore'
import { useWizardStore } from '@/store/useWizardStore'
import { Badge } from '@/components/ui/badge'
import { cpuFormulaString, ramFormulaString, diskFormulaString, specintFormulaString } from '@/lib/sizing/display'
import type { LimitingResource } from '@/types/results'

const RESOURCE_LABELS: Record<LimitingResource, string> = {
  cpu: 'CPU-limited',
  ram: 'RAM-limited',
  disk: 'Disk-limited',
  specint: 'SPECint-limited',
}

interface ScenarioResultsProps {
  scenarioId: string
}

export function ScenarioResults({ scenarioId }: ScenarioResultsProps) {
  const results = useScenariosResults()
  const scenarios = useScenariosStore((s) => s.scenarios)
  const currentCluster = useClusterStore((s) => s.currentCluster)
  const sizingMode = useWizardStore((s) => s.sizingMode)

  const idx = scenarios.findIndex((s) => s.id === scenarioId)
  const result = idx >= 0 ? results[idx] : undefined
  const scenario = idx >= 0 ? scenarios[idx] : undefined

  if (!result || !scenario) {
    return (
      <div className="text-sm text-muted-foreground py-2">
        Enter cluster data in Step 1 to see results.
      </div>
    )
  }

  const coresPerServer = scenario.socketsPerServer * scenario.coresPerSocket

  const cpuFormula = cpuFormulaString({
    totalVcpus: currentCluster.totalVcpus,
    headroomPercent: scenario.headroomPercent,
    targetVcpuToPCoreRatio: scenario.targetVcpuToPCoreRatio,
    coresPerServer,
    ...(currentCluster.cpuUtilizationPercent !== undefined && {
      cpuUtilizationPercent: currentCluster.cpuUtilizationPercent,
    }),
  })

  const ramFormula = ramFormulaString({
    totalVms: currentCluster.totalVms,
    ramPerVmGb: scenario.ramPerVmGb,
    headroomPercent: scenario.headroomPercent,
    ramPerServerGb: scenario.ramPerServerGb,
  })

  const diskFormula = diskFormulaString({
    totalVms: currentCluster.totalVms,
    diskPerVmGb: scenario.diskPerVmGb,
    headroomPercent: scenario.headroomPercent,
    diskPerServerGb: scenario.diskPerServerGb,
  })

  return (
    <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold tabular-nums">{result.finalCount}</span>
        <span className="text-sm text-muted-foreground">servers required</span>
        <Badge variant="secondary">{RESOURCE_LABELS[result.limitingResource]}</Badge>
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <span className="text-muted-foreground">
            {sizingMode === 'specint' ? 'SPECint-limited: ' : 'CPU-limited: '}
          </span>
          <span className="font-medium tabular-nums">{result.cpuLimitedCount}</span>
          <div className="text-xs text-muted-foreground font-mono mt-0.5">
            {sizingMode === 'specint' &&
             currentCluster.existingServerCount != null &&
             currentCluster.specintPerServer != null &&
             scenario.targetSpecint != null
              ? specintFormulaString({
                  existingServers: currentCluster.existingServerCount,
                  specintPerServer: currentCluster.specintPerServer,
                  headroomPercent: scenario.headroomPercent,
                  targetSpecint: scenario.targetSpecint,
                })
              : cpuFormula}
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">RAM-limited: </span>
          <span className="font-medium tabular-nums">{result.ramLimitedCount}</span>
          <div className="text-xs text-muted-foreground font-mono mt-0.5">{ramFormula}</div>
        </div>
        <div>
          <span className="text-muted-foreground">Disk-limited: </span>
          <span className="font-medium tabular-nums">{result.diskLimitedCount}</span>
          <div className="text-xs text-muted-foreground font-mono mt-0.5">{diskFormula}</div>
        </div>
      </div>
    </div>
  )
}
