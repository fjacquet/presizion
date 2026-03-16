import { useState } from 'react'
import { RotateCcw, Database } from 'lucide-react'
import { STORE_PREDICT_URL } from '@/lib/config'
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
    <div className="bg-background overflow-x-hidden" style={{ minHeight: '100dvh' }}>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <header className="relative mb-6 text-center print:hidden">
          <div className="absolute left-0 top-0 flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setResetOpen(true)} aria-label="Reset" className="h-11 w-11 p-0">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <a
              href={STORE_PREDICT_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="Storage Calculator (Store-Predict)"
              className="inline-flex items-center justify-center rounded-md h-11 w-11 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Database className="h-4 w-4" />
            </a>
          </div>
          <div className="absolute right-0 top-0 [&_button]:h-11 [&_button]:w-11">
            <ThemeToggle />
          </div>
          <img
            src="/presizion/logo.svg"
            alt="Presizion"
            className="mx-auto mb-3 h-8 w-auto"
          />
          <h1 className="text-2xl font-bold tracking-tight">Cluster Refresh Sizing</h1>
          <p className="hidden sm:block text-sm text-muted-foreground mt-1">
            Size your refreshed cluster based on existing metrics
          </p>
          <SizingModeToggle />
        </header>

        <div className="print:hidden">
          <StepIndicator currentStep={currentStep} totalSteps={3} onStepClick={goToStep} />
        </div>

        <main className={currentStep > 1 ? 'pb-20 sm:pb-0' : ''}>
          {currentStep === 1 && <Step1CurrentCluster />}
          {currentStep === 2 && <Step2Scenarios />}
          {currentStep === 3 && <Step3ReviewExport />}
        </main>

        {currentStep > 1 && (
          <div
            className="sticky bottom-0 z-10 bg-background/95 backdrop-blur border-t px-4 py-3 flex justify-between print:hidden sm:static sm:bg-transparent sm:backdrop-blur-none sm:mt-8 sm:pt-4 sm:z-auto"
            style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <Button type="button" variant="outline" onClick={prevStep} className="min-h-[44px]">
              Back
            </Button>
            {currentStep === 2 && (
              <Button type="button" onClick={nextStep} className="min-h-[44px]">
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
