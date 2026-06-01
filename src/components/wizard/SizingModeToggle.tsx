import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useClusterStore } from '@/store/useClusterStore';
import { useWizardStore } from '@/store/useWizardStore';

const SIDE = 'text-sm select-none transition-colors';
const ACTIVE = 'font-semibold text-slate-900 dark:text-slate-100';
const INACTIVE = 'text-slate-500 dark:text-slate-400';

/**
 * Global mode controls rendered in the WizardShell header.
 *
 * Each binary choice is an on/off switch (consistent with the Step 1
 * "Stretch cluster" switch). The two end labels stay visible so the meaning of
 * each position is explicit; the active side is emphasized:
 *   vCPU ⇄ Performance        HCI ⇄ Disaggregated
 */
export function SizingModeToggle() {
  const { t } = useTranslation('wizard');
  const sizingMode = useWizardStore((s) => s.sizingMode);
  const setSizingMode = useWizardStore((s) => s.setSizingMode);
  const layoutMode = useWizardStore((s) => s.layoutMode);
  const setLayoutMode = useWizardStore((s) => s.setLayoutMode);
  const currentCluster = useClusterStore((s) => s.currentCluster);
  const setCurrentCluster = useClusterStore((s) => s.setCurrentCluster);

  const isPerformance = sizingMode === 'performance';
  const isDisaggregated = layoutMode === 'disaggregated';
  const isStretch = currentCluster.isStretchCluster === true;

  return (
    <div className="flex flex-row flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-2">
      {/* Sizing mode: vCPU (off) ⇄ Performance (on) */}
      <div
        role="group"
        aria-label={t('sizingMode.groupAriaLabel')}
        className="flex flex-wrap items-center gap-2"
      >
        <span className={[SIDE, isPerformance ? INACTIVE : ACTIVE].join(' ')}>
          {t('sizingMode.vcpu')}
        </span>
        <Switch
          checked={isPerformance}
          onCheckedChange={(v) => setSizingMode(v ? 'performance' : 'vcpu')}
          aria-label={t('sizingMode.groupAriaLabel')}
        />
        <span
          className={['flex items-center gap-1', SIDE, isPerformance ? ACTIVE : INACTIVE].join(' ')}
        >
          {t('sizingMode.performance')}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info
                  className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 cursor-help"
                  aria-label={t('infoAria', { label: t('sizingMode.performance') })}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-sm">{t('sizingMode.performanceTooltip')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </span>
      </div>

      {/* Layout mode: HCI (off) ⇄ Disaggregated (on) */}
      <div
        role="group"
        aria-label={t('layoutMode.groupAriaLabel')}
        className="flex flex-wrap items-center gap-2"
      >
        <span className={[SIDE, isDisaggregated ? INACTIVE : ACTIVE].join(' ')}>
          {t('layoutMode.hci')}
        </span>
        <Switch
          checked={isDisaggregated}
          onCheckedChange={(v) => setLayoutMode(v ? 'disaggregated' : 'hci')}
          aria-label={t('layoutMode.groupAriaLabel')}
        />
        <span className={[SIDE, isDisaggregated ? ACTIVE : INACTIVE].join(' ')}>
          {t('layoutMode.disaggregated')}
        </span>
      </div>

      {/* Stretch cluster: a current-cluster fact (relocated from Step 1), kept
          at the same level as the sizing/layout switches for a consistent
          switch-based selection pattern. Auto-set on import; editable here. */}
      <div
        role="group"
        aria-label={t('stretch.label')}
        className="flex flex-wrap items-center gap-2"
      >
        <Switch
          checked={isStretch}
          onCheckedChange={(v) => setCurrentCluster({ ...currentCluster, isStretchCluster: v })}
          aria-label={t('stretch.label')}
        />
        <span
          className={['flex items-center gap-1', SIDE, isStretch ? ACTIVE : INACTIVE].join(' ')}
        >
          {t('stretch.label')}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info
                  className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 cursor-help"
                  aria-label={t('infoAria', { label: t('stretch.label') })}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-sm">{t('stretch.tooltip')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </span>
      </div>
    </div>
  );
}
