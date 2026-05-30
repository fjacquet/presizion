import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { LayoutMode } from '@/store/useWizardStore';
import { useWizardStore } from '@/store/useWizardStore';

const ACTIVE = 'bg-primary text-primary-foreground font-semibold';
const INACTIVE = 'bg-transparent text-foreground hover:bg-muted';

function ModeBtn({
  label,
  isActive,
  onClick,
  disabled,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      disabled={disabled}
      onClick={onClick}
      className={[
        'px-3 py-2 text-sm rounded-sm transition-colors min-h-[44px]',
        isActive ? ACTIVE : INACTIVE,
        disabled ? 'opacity-40 cursor-not-allowed' : '',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

/**
 * Global mode controls rendered in the WizardShell header.
 *
 * Row 1 — Sizing mode (2 options):
 *   vCPU | Performance
 *
 * Row 2 — Layout mode:
 *   HCI | Disaggregated
 */
export function SizingModeToggle() {
  const sizingMode = useWizardStore((s) => s.sizingMode);
  const setSizingMode = useWizardStore((s) => s.setSizingMode);
  const layoutMode = useWizardStore((s) => s.layoutMode);
  const setLayoutMode = useWizardStore((s) => s.setLayoutMode);

  return (
    <div className="flex flex-col items-center gap-1.5 mt-2">
      {/* Row 1 — Sizing mode */}
      <div
        role="group"
        aria-label="Sizing mode"
        className="flex flex-wrap gap-0.5 border rounded-md p-0.5 bg-muted/40"
      >
        <ModeBtn
          label="vCPU"
          isActive={sizingMode === 'vcpu'}
          onClick={() => setSizingMode('vcpu')}
        />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <span>
                <ModeBtn
                  label="Performance"
                  isActive={sizingMode === 'performance'}
                  onClick={() => setSizingMode('performance')}
                />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs text-sm">
                Sizes on new-vs-old per-core performance (GHz by default; add SPEC scores in the
                scenario for precision).
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Row 2 — Layout mode */}
      <div
        role="group"
        aria-label="Layout mode"
        className="flex flex-wrap gap-0.5 border rounded-md p-0.5 bg-muted/40"
      >
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
  );
}
