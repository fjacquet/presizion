import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Chart, type EChartsInstance } from '@/components/charts/Chart';
import { Button } from '@/components/ui/button';
import { useScenariosResults } from '@/hooks/useScenariosResults';
import { buildConstraintBreakdownOption } from '@/lib/sizing/chartOptions/constraintBreakdownOption';
import { buildServerCountOption } from '@/lib/sizing/chartOptions/serverCountOption';
import { downloadChartSvg } from '@/lib/utils/chartImage';
import { useClusterStore } from '@/store/useClusterStore';
import { useScenariosStore } from '@/store/useScenariosStore';
import { useWizardStore } from '@/store/useWizardStore';

export function SizingChart() {
  const { t } = useTranslation('step3');
  const scenarios = useScenariosStore((s) => s.scenarios);
  const results = useScenariosResults();
  const sizingMode = useWizardStore((s) => s.sizingMode);
  const layoutMode = useWizardStore((s) => s.layoutMode);
  const currentCluster = useClusterStore((s) => s.currentCluster);
  const comparisonInstance = useRef<EChartsInstance | null>(null);
  const constraintInstance = useRef<EChartsInstance | null>(null);

  if (scenarios.length === 0) return null;

  const showDisk = layoutMode !== 'disaggregated';

  const cpuBarName =
    sizingMode === 'performance'
      ? t('nodeSizingRows.cpuBarPerformance')
      : t('nodeSizingRows.cpuBarVcpu');

  // Per-constraint breakdown data (grouped bars per scenario)
  const constraintData = scenarios.map((s, i) => ({
    name: s.name,
    cpu: results[i]?.cpuLimitedCount ?? 0,
    ram: results[i]?.ramLimitedCount ?? 0,
    ...(showDisk ? { disk: results[i]?.diskLimitedCount ?? 0 } : {}),
  }));

  // Final server count comparison with As-Is bar
  const hasAsIs =
    currentCluster.existingServerCount !== undefined && currentCluster.existingServerCount > 0;
  const comparisonData = [
    ...(hasAsIs
      ? [{ name: 'As-Is', servers: currentCluster.existingServerCount!, isAsIs: true }]
      : []),
    ...scenarios.map((s, i) => ({
      name: s.name,
      servers: results[i]?.finalCount ?? 0,
      isAsIs: false,
    })),
  ];

  return (
    <div className="space-y-6">
      {/* Final server count comparison — x-axis labels identify bars, no legend needed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {t('sizingChart.serverCountTitle')}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              comparisonInstance.current &&
              downloadChartSvg(comparisonInstance.current, 'cluster-sizing-chart.svg')
            }
            aria-label={t('sizingChart.downloadSvgAriaLabel')}
          >
            {t('sizingChart.downloadSvg')}
          </Button>
        </div>
        <div className="h-48 sm:h-72">
          <Chart
            option={buildServerCountOption(comparisonData)}
            ariaLabel={t('sizingChart.serverCountAriaLabel')}
            onReady={(i) => {
              comparisonInstance.current = i;
            }}
          />
        </div>
      </div>

      {/* Per-constraint breakdown */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {t('sizingChart.constraintBreakdownTitle')}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              constraintInstance.current &&
              downloadChartSvg(constraintInstance.current, 'constraint-breakdown-chart.svg')
            }
            aria-label={t('sizingChart.downloadConstraintAriaLabel')}
          >
            {t('sizingChart.downloadSvg')}
          </Button>
        </div>
        <div className="h-48 sm:h-72">
          <Chart
            option={buildConstraintBreakdownOption(constraintData, { cpuBarName, showDisk })}
            ariaLabel={t('sizingChart.constraintBreakdownAriaLabel')}
            onReady={(i) => {
              constraintInstance.current = i;
            }}
          />
        </div>
      </div>
    </div>
  );
}
