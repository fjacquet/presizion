import { useWizardStore } from '@/store/useWizardStore'
import { Step1CurrentCluster } from '@/components/step1/Step1CurrentCluster'
import { Step2Scenarios } from '@/components/step2/Step2Scenarios'
import { Step3ReviewExport } from '@/components/step3/Step3ReviewExport'
import { StepIndicator } from './StepIndicator'
import { SizingModeToggle } from './SizingModeToggle'
import { Button } from '@/components/ui/button'
import { useBeforeUnload } from '@/hooks/useBeforeUnload'

export function WizardShell() {
  const currentStep = useWizardStore((s) => s.currentStep)
  const prevStep = useWizardStore((s) => s.prevStep)
  const nextStep = useWizardStore((s) => s.nextStep)

  useBeforeUnload(currentStep > 1)

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Cluster Refresh Sizing</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Size your refreshed cluster based on existing metrics
          </p>
          <SizingModeToggle />
        </header>

        <StepIndicator currentStep={currentStep} totalSteps={3} />

        <main>
          {currentStep === 1 && <Step1CurrentCluster />}
          {currentStep === 2 && <Step2Scenarios />}
          {currentStep === 3 && <Step3ReviewExport />}
        </main>

        {currentStep > 1 && (
          <div className="mt-8 pt-4 border-t flex justify-between">
            <Button type="button" variant="outline" onClick={prevStep}>
              Back
            </Button>
            {currentStep === 2 && (
              <Button type="button" onClick={nextStep}>
                Next: Review &amp; Export
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
