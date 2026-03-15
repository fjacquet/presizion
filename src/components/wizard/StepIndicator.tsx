interface StepIndicatorProps {
  currentStep: 1 | 2 | 3
  totalSteps: 3
  labels?: [string, string, string]
  onStepClick?: (step: 1 | 2 | 3) => void
}

const DEFAULT_LABELS: [string, string, string] = [
  'Current Cluster',
  'Define Scenarios',
  'Review & Export',
]

export function StepIndicator({ currentStep, totalSteps, labels = DEFAULT_LABELS, onStepClick }: StepIndicatorProps) {
  return (
    <nav aria-label="Wizard steps" className="flex items-center justify-center gap-0 mb-8">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = (i + 1) as 1 | 2 | 3
        const isActive = step === currentStep
        const isCompleted = step < currentStep
        const isClickable = onStepClick && (isCompleted || isActive)

        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => isClickable && onStepClick(step)}
                disabled={!isClickable}
                className={[
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold border-2 transition-colors',
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground'
                    : isCompleted
                    ? 'border-primary bg-primary/20 text-primary cursor-pointer hover:bg-primary/30'
                    : 'border-muted-foreground/30 bg-background text-muted-foreground cursor-default',
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
                  isActive ? 'text-primary font-medium' : 'text-muted-foreground',
                  isClickable && !isActive ? 'cursor-pointer' : '',
                ].join(' ')}
                onClick={() => isClickable && onStepClick(step)}
                role={isClickable ? 'button' : undefined}
              >
                {labels[i]}
              </span>
            </div>
            {step < totalSteps && (
              <div className={[
                'h-px w-12 sm:w-24 mx-2',
                isCompleted ? 'bg-primary' : 'bg-muted-foreground/30',
              ].join(' ')} />
            )}
          </div>
        )
      })}
    </nav>
  )
}
