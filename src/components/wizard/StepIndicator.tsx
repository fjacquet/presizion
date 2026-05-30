interface StepIndicatorProps {
  currentStep: 1 | 2 | 3;
  totalSteps: 3;
  labels?: [string, string, string];
  onStepClick?: (step: 1 | 2 | 3) => void;
}

const DEFAULT_LABELS: [string, string, string] = [
  'Current Cluster',
  'Define Scenarios',
  'Review & Export',
];

export function StepIndicator({
  currentStep,
  totalSteps,
  labels = DEFAULT_LABELS,
  onStepClick,
}: StepIndicatorProps) {
  return (
    <nav aria-label="Wizard steps" className="flex items-center justify-center gap-0 mb-8">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = (i + 1) as 1 | 2 | 3;
        const isActive = step === currentStep;
        const isCompleted = step < currentStep;
        const isClickable = onStepClick && (isCompleted || isActive);

        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => isClickable && onStepClick(step)}
                disabled={!isClickable}
                className={[
                  'flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold border-2 transition-colors',
                  isActive
                    ? 'border-primary-600 bg-primary-600 text-white dark:border-primary-500 dark:bg-primary-500'
                    : isCompleted
                      ? 'border-primary-600 bg-primary-600/20 text-primary-600 dark:border-primary-500 dark:bg-primary-500/20 dark:text-primary-300 cursor-pointer hover:bg-primary-600/30 dark:hover:bg-primary-500/30'
                      : 'border-slate-400/30 bg-white text-slate-500 dark:border-slate-500/30 dark:bg-surface-900 dark:text-slate-400 cursor-default',
                ].join(' ')}
                aria-current={isActive ? 'step' : undefined}
                aria-label={`Step ${step}: ${labels[i]}`}
                data-testid={`step-indicator-${step}`}
              >
                {step}
              </button>
              <span
                className={[
                  'mt-1 text-xs hidden sm:block',
                  isActive
                    ? 'text-primary-600 dark:text-primary-300 font-medium'
                    : 'text-slate-500 dark:text-slate-400',
                  isClickable && !isActive ? 'cursor-pointer' : '',
                ].join(' ')}
                onClick={() => isClickable && onStepClick(step)}
                role={isClickable ? 'button' : undefined}
              >
                {labels[i]}
              </span>
            </div>
            {step < totalSteps && (
              <div
                className={[
                  'h-px w-12 sm:w-24 mx-2',
                  isCompleted
                    ? 'bg-primary-600 dark:bg-primary-500'
                    : 'bg-slate-400/30 dark:bg-slate-500/30',
                ].join(' ')}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
