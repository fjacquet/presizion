import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { LayoutMode } from '@/store/useWizardStore';
import { useWizardStore } from '@/store/useWizardStore';

const ACTIVE = 'bg-primary-600 text-white dark:bg-primary-500 font-semibold';
const INACTIVE =
  'bg-transparent text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-surface-700';

interface ModeBtnProps extends React.ComponentPropsWithRef<'button'> {
  label: string;
  isActive: boolean;
}

function ModeBtn({ label, isActive, disabled, className, ...rest }: ModeBtnProps) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      disabled={disabled}
      className={[
        'px-3 py-2 text-sm rounded-sm transition-colors min-h-[44px]',
        isActive ? ACTIVE : INACTIVE,
        disabled ? 'opacity-40 cursor-not-allowed' : '',
        className ?? '',
      ].join(' ')}
      {...rest}
    >
      {label}
    </button>
  );
}

/**
 * Global mode controls rendered in the WizardShell header.
 *
 * Both groups sit on the same level (side by side), wrapping to two rows
 * only when the viewport is too narrow:
 *   [ vCPU | Performance ]   [ HCI | Disaggregated ]
 */
export function SizingModeToggle() {
  const { t } = useTranslation('wizard');
  const sizingMode = useWizardStore((s) => s.sizingMode);
  const setSizingMode = useWizardStore((s) => s.setSizingMode);
  const layoutMode = useWizardStore((s) => s.layoutMode);
  const setLayoutMode = useWizardStore((s) => s.setLayoutMode);

  return (
    <div className="flex flex-row flex-wrap items-center justify-center gap-2 mt-2">
      {/* Sizing mode */}
      <div
        role="group"
        aria-label={t('sizingMode.groupAriaLabel')}
        className="flex flex-wrap gap-0.5 border border-slate-200 dark:border-surface-700 rounded-md p-0.5 bg-slate-100/40 dark:bg-surface-700/40"
      >
        <ModeBtn
          label={t('sizingMode.vcpu')}
          isActive={sizingMode === 'vcpu'}
          onClick={() => setSizingMode('vcpu')}
        />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <ModeBtn
                  label={t('sizingMode.performance')}
                  isActive={sizingMode === 'performance'}
                  onClick={() => setSizingMode('performance')}
                />
              }
            />
            <TooltipContent>
              <p className="max-w-xs text-sm">{t('sizingMode.performanceTooltip')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Layout mode */}
      <div
        role="group"
        aria-label={t('layoutMode.groupAriaLabel')}
        className="flex flex-wrap gap-0.5 border border-slate-200 dark:border-surface-700 rounded-md p-0.5 bg-slate-100/40 dark:bg-surface-700/40"
      >
        {(['hci', 'disaggregated'] as LayoutMode[]).map((lm) => (
          <ModeBtn
            key={lm}
            label={lm === 'hci' ? t('layoutMode.hci') : t('layoutMode.disaggregated')}
            isActive={layoutMode === lm}
            onClick={() => setLayoutMode(lm)}
          />
        ))}
      </div>
    </div>
  );
}
