import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { useWizardStore } from '@/store/useWizardStore'
import { useClusterStore } from '@/store/useClusterStore'
import { useScenariosStore } from '@/store/useScenariosStore'
import { useImportStore } from '@/store/useImportStore'
import { createDefaultScenario } from '@/lib/sizing/defaults'
import { Step1CurrentCluster } from '@/components/step1/Step1CurrentCluster'
import { Step2Scenarios } from '@/components/step2/Step2Scenarios'
import { Step3ReviewExport } from '@/components/step3/Step3ReviewExport'
import { StepIndicator } from './StepIndicator'
import { SizingModeToggle } from './SizingModeToggle'
import { ThemeToggle } from './ThemeToggle'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useBeforeUnload } from '@/hooks/useBeforeUnload'

export function WizardShell() {
  const currentStep = useWizardStore((s) => s.currentStep)
  const prevStep = useWizardStore((s) => s.prevStep)
  const nextStep = useWizardStore((s) => s.nextStep)
  const goToStep = useWizardStore((s) => s.goToStep)
  const setSizingMode = useWizardStore((s) => s.setSizingMode)
  const setLayoutMode = useWizardStore((s) => s.setLayoutMode)

  const [resetOpen, setResetOpen] = useState(false)

  useBeforeUnload(currentStep > 1)

  function handleConfirmReset() {
    useClusterStore.getState().resetCluster()
    useScenariosStore.getState().setScenarios([createDefaultScenario()])
    useImportStore.getState().clearImport()
    goToStep(1)
    setSizingMode('vcpu')
    setLayoutMode('hci')
    try { localStorage.removeItem('presizion-session') } catch { /* ignore */ }
    setResetOpen(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <header className="relative mb-6 text-center print:hidden">
          <div className="absolute left-0 top-0">
            <Button variant="ghost" size="sm" onClick={() => setResetOpen(true)} aria-label="Reset">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
          <div className="absolute right-0 top-0">
            <ThemeToggle />
          </div>
          <img
            src="/presizion/logo.svg"
            alt="Presizion"
            className="mx-auto mb-3 h-8 w-auto"
          />
          <h1 className="text-2xl font-bold tracking-tight">Cluster Refresh Sizing</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Size your refreshed cluster based on existing metrics
          </p>
          <SizingModeToggle />
        </header>

        <div className="print:hidden">
          <StepIndicator currentStep={currentStep} totalSteps={3} />
        </div>

        <main>
          {currentStep === 1 && <Step1CurrentCluster />}
          {currentStep === 2 && <Step2Scenarios />}
          {currentStep === 3 && <Step3ReviewExport />}
        </main>

        {currentStep > 1 && (
          <div className="mt-8 pt-4 border-t flex justify-between print:hidden">
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

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset all data?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            All cluster data and scenarios will be cleared. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmReset}>Reset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
