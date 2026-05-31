import { useRef } from 'react';
import { Chart, type EChartsInstance } from '@/components/charts/Chart';
import { Button } from '@/components/ui/button';
import { useScenariosResults } from '@/hooks/useScenariosResults';
import { buildCoreCountOption } from '@/lib/sizing/chartOptions/coreCountOption';
import { downloadChartSvg } from '@/lib/utils/chartImage';
import { useClusterStore } from '@/store/useClusterStore';
import { useScenariosStore } from '@/store/useScenariosStore';

/**
 * Bar chart showing total physical cores per scenario.
 * Includes an As-Is reference line when cluster.totalPcores > 0.
 * Data labels appear above bars.
 */
export function CoreCountChart() {
  const scenarios = useScenariosStore((s) => s.scenarios);
  const results = useScenariosResults();
  const currentCluster = useClusterStore((s) => s.currentCluster);
  const chartInstance = useRef<EChartsInstance | null>(null);

  if (scenarios.length === 0) return null;

  const chartData = scenarios.map((s, i) => ({
    name: s.name,
    cores: (results[i]?.finalCount ?? 0) * s.socketsPerServer * s.coresPerSocket,
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Total Physical Cores per Scenario
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            chartInstance.current && downloadChartSvg(chartInstance.current, 'core-count-chart.svg')
          }
          aria-label="Download chart as SVG"
        >
          Download SVG
        </Button>
      </div>
      <div className="h-48 sm:h-72">
        <Chart
          option={buildCoreCountOption(chartData, { asIsPcores: currentCluster.totalPcores })}
          ariaLabel="Total physical cores per scenario"
          onReady={(i) => {
            chartInstance.current = i;
          }}
        />
      </div>
    </div>
  );
}
