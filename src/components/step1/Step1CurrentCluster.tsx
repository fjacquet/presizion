import { CurrentClusterForm } from './CurrentClusterForm'
import { DerivedMetricsPanel } from './DerivedMetricsPanel'
import { FileImportButton } from './FileImportButton'
import { ScopeBadge } from './ScopeBadge'
import { useWizardStore } from '@/store/useWizardStore'

export function Step1CurrentCluster() {
  const nextStep = useWizardStore((s) => s.nextStep)

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">Step 1: Enter Current Cluster</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your existing cluster metrics. Required fields are marked.
          </p>
        </div>
        <FileImportButton />
      </div>
      <ScopeBadge />
      <CurrentClusterForm onNext={nextStep} />
      <DerivedMetricsPanel />
    </div>
  )
}
