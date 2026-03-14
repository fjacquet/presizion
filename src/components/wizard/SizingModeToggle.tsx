import { useWizardStore } from '@/store/useWizardStore'
import type { SizingMode, LayoutMode } from '@/store/useWizardStore'
import { useClusterStore } from '@/store/useClusterStore'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const ACTIVE = 'bg-primary text-primary-foreground font-semibold'
const INACTIVE = 'bg-transparent text-foreground hover:bg-muted'
const AMBER_ACTIVE = 'bg-amber-500 text-white font-semibold'

function ModeBtn({
  label,
  isActive,
  onClick,
  disabled,
  amber,
}: {
  label: string
  isActive: boolean
  onClick: () => void
  disabled?: boolean
  amber?: boolean
}) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      disabled={disabled}
      onClick={onClick}
      className={[
        'px-3 py-1 text-sm rounded-sm transition-colors',
        isActive ? (amber ? AMBER_ACTIVE : ACTIVE) : INACTIVE,
        disabled ? 'opacity-40 cursor-not-allowed' : '',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

/**
 * Global mode controls rendered in the WizardShell header.
 *
 * Row 1 — Sizing mode (4 options):
 *   vCPU | SPECrate2017 | Aggressive (amber; requires CPU util%) | GHz (requires CPU freq)
 *
 * Row 2 — Layout mode:
 *   HCI | Disaggregated
 */
export function SizingModeToggle() {
  const sizingMode = useWizardStore((s) => s.sizingMode)
  const setSizingMode = useWizardStore((s) => s.setSizingMode)
  const layoutMode = useWizardStore((s) => s.layoutMode)
  const setLayoutMode = useWizardStore((s) => s.setLayoutMode)
  const cluster = useClusterStore((s) => s.currentCluster)

  const hasCpuUtil = cluster.cpuUtilizationPercent !== undefined
  const hasCpuFreq = cluster.cpuFrequencyGhz !== undefined

  return (
    <div className="flex flex-col items-center gap-1.5 mt-2">
      {/* Row 1 — Sizing mode */}
      <div role="group" aria-label="Sizing mode" className="flex gap-0.5 border rounded-md p-0.5 bg-muted/40">
        <ModeBtn label="vCPU" isActive={sizingMode === 'vcpu'} onClick={() => setSizingMode('vcpu' as SizingMode)} />
        <ModeBtn label="SPECrate2017" isActive={sizingMode === 'specint'} onClick={() => setSizingMode('specint' as SizingMode)} />

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <ModeBtn
                  label="Aggressive"
                  isActive={sizingMode === 'aggressive'}
                  onClick={() => hasCpuUtil && setSizingMode('aggressive' as SizingMode)}
                  disabled={!hasCpuUtil}
                  amber
                />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs text-sm">
                {hasCpuUtil
                  ? 'CPU util drives density — vCPU:pCore ratio cap bypassed'
                  : 'Enter CPU Utilization % in Step 1 to enable'}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <ModeBtn
                  label="GHz"
                  isActive={sizingMode === 'ghz'}
                  onClick={() => hasCpuFreq && setSizingMode('ghz' as SizingMode)}
                  disabled={!hasCpuFreq}
                />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs text-sm">
                {hasCpuFreq
                  ? 'GHz demand drives server count based on frequency × utilization'
                  : 'Enter CPU Frequency (GHz) in Step 1 to enable'}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Row 2 — Layout mode */}
      <div role="group" aria-label="Layout mode" className="flex gap-0.5 border rounded-md p-0.5 bg-muted/40">
        {(['hci', 'disaggregated'] as LayoutMode[]).map((lm) => (
          <ModeBtn
            key={lm}
            label={lm === 'hci' ? 'HCI' : 'Disaggregated'}
            isActive={layoutMode === lm}
            onClick={() => setLayoutMode(lm)}
          />
        ))}
      </div>
    </div>
  )
}
