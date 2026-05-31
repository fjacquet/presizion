import { Database, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Step1CurrentCluster } from '@/components/step1/Step1CurrentCluster';
import { Step2Scenarios } from '@/components/step2/Step2Scenarios';
import { Step3ReviewExport } from '@/components/step3/Step3ReviewExport';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useBeforeUnload } from '@/hooks/useBeforeUnload';
import { STORE_PREDICT_URL } from '@/lib/config';
import { isClusterSizingReady } from '@/lib/sizing/clusterReadiness';
import { createDefaultScenario } from '@/lib/sizing/defaults';
import { useClusterStore } from '@/store/useClusterStore';
import { useImportStore } from '@/store/useImportStore';
import { useScenariosStore } from '@/store/useScenariosStore';
import { useWizardStore } from '@/store/useWizardStore';
import { LanguageSwitcher } from './LanguageSwitcher';
import { SizingModeToggle } from './SizingModeToggle';
import { StepIndicator } from './StepIndicator';
import { ThemeToggle } from './ThemeToggle';

export function WizardShell() {
  const { t } = useTranslation('wizard');
  const currentStep = useWizardStore((s) => s.currentStep);
  const prevStep = useWizardStore((s) => s.prevStep);
  const nextStep = useWizardStore((s) => s.nextStep);
  const goToStep = useWizardStore((s) => s.goToStep);
  const setSizingMode = useWizardStore((s) => s.setSizingMode);
  const setLayoutMode = useWizardStore((s) => s.setLayoutMode);
  const currentCluster = useClusterStore((s) => s.currentCluster);

  const [resetOpen, setResetOpen] = useState(false);

  useBeforeUnload(currentStep > 1);

  // Sizing must never run without observed utilization (assuming 100% over-sizes
  // the cluster). If we are somehow past Step 1 without it, fall back to Step 1.
  useEffect(() => {
    if (currentStep > 1 && !isClusterSizingReady(currentCluster)) {
      goToStep(1);
    }
  }, [currentStep, currentCluster, goToStep]);

  function handleConfirmReset() {
    useClusterStore.getState().resetCluster();
    useScenariosStore.getState().setScenarios([createDefaultScenario()]);
    useImportStore.getState().clearImport();
    goToStep(1);
    setSizingMode('vcpu');
    setLayoutMode('hci');
    try {
      localStorage.removeItem('presizion-session');
    } catch {
      /* ignore */
    }
    setResetOpen(false);
  }

  return (
    <div className="overflow-x-hidden" style={{ minHeight: '100dvh' }}>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-8 print:hidden">
          {/* Cockpit top bar: brand mark + wordmark on the left, controls on the right. */}
          <div className="flex items-center justify-between gap-2 mb-9 border-b border-slate-300/40 dark:border-surface-700/60 pb-4">
            <div className="flex items-center gap-2.5">
              <img src="/presizion/logo.svg" alt="Presizion" className="h-7 w-auto" />
            </div>
            <div className="flex items-center gap-1 [&_button]:h-11 [&_button]:w-11">
              <a
                href={STORE_PREDICT_URL}
                target="_blank"
                rel="noopener noreferrer"
                title={t('header.storePredictTitle')}
                className="inline-flex items-center justify-center rounded-md h-11 w-11 text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-300 hover:bg-primary-500/10 transition-colors"
              >
                <Database className="h-4 w-4" />
              </a>
              <LanguageSwitcher />
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setResetOpen(true)}
                aria-label={t('header.resetAriaLabel')}
                className="h-11 w-11 p-0"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Hero */}
          <div className="text-center">
            <h1 className="cockpit-title text-4xl sm:text-5xl">{t('header.tagline')}</h1>
            <p className="hidden sm:block text-sm text-slate-500 dark:text-slate-400 mt-2">
              {t('header.subtitle')}
            </p>
          </div>
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
            className="sticky bottom-0 z-10 bg-white/95 dark:bg-surface-900/95 backdrop-blur border-t border-slate-200 dark:border-surface-700 px-4 py-3 flex justify-between print:hidden sm:static sm:bg-transparent sm:backdrop-blur-none sm:mt-8 sm:pt-4 sm:z-auto"
            style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <Button type="button" variant="outline" onClick={prevStep} className="min-h-[44px]">
              {t('nav.back')}
            </Button>
            {currentStep === 2 && (
              <Button type="button" onClick={nextStep} className="min-h-[44px]">
                {t('nav.nextReview')}
              </Button>
            )}
          </div>
        )}
      </div>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('reset.title')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('reset.body')}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              {t('reset.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmReset}>
              {t('reset.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
