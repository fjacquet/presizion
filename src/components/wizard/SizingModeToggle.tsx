import { useWizardStore } from '@/store/useWizardStore'
import type { SizingMode } from '@/store/useWizardStore'

/**
 * Global toggle between vCPU-based and SPECint-based sizing modes.
 * Rendered in the WizardShell header so it is visible on all three wizard steps.
 * Requirements: PERF-02
 */
export function SizingModeToggle() {
  const sizingMode = useWizardStore((s) => s.sizingMode)
  const setSizingMode = useWizardStore((s) => s.setSizingMode)

  const activeClass = 'font-semibold underline'
  const inactiveClass = 'text-muted-foreground'

  return (
    <div role="group" aria-label="Sizing mode" className="flex items-center gap-1 text-sm justify-center mt-2">
      <button
        type="button"
        aria-pressed={sizingMode === 'vcpu'}
        onClick={() => setSizingMode('vcpu' as SizingMode)}
        className={sizingMode === 'vcpu' ? activeClass : inactiveClass}
      >
        vCPU
      </button>
      <span>/</span>
      <button
        type="button"
        aria-pressed={sizingMode === 'specint'}
        onClick={() => setSizingMode('specint' as SizingMode)}
        className={sizingMode === 'specint' ? activeClass : inactiveClass}
      >
        SPECint
      </button>
    </div>
  )
}
