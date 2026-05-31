import { useRef } from 'react';
import { Chart, type EChartsInstance } from '@/components/charts/Chart';
import { Button } from '@/components/ui/button';
import { useVsanBreakdowns } from '@/hooks/useVsanBreakdowns';
import { CHART_COLORS } from '@/lib/sizing/chartColors';
import { buildCapacityOption, type CapacityAbsRow } from '@/lib/sizing/chartOptions/capacityOption';
import { downloadChartSvg } from '@/lib/utils/chartImage';
import { useScenariosStore } from '@/store/useScenariosStore';
import { useWizardStore } from '@/store/useWizardStore';

interface CapacityStackedChartProps {
  /** PPTX export hook: receives (`capacity-${id}`, instance) on chart ready. */
  readonly onChartReady?: (key: string, instance: EChartsInstance) => void;
}

/**
 * Stacked horizontal bar chart showing capacity breakdown per scenario.
 * Rows: CPU GHz, Memory GiB, Raw Storage TiB, Usable Storage TiB.
 * Segments: Required (blue), Spare (green), Excess (amber), normalized to 100%.
 * One chart per scenario, each with a Download SVG button.
 */
export function CapacityStackedChart({ onChartReady }: CapacityStackedChartProps = {}) {
  const scenarios = useScenariosStore((s) => s.scenarios);
  const layoutMode = useWizardStore((s) => s.layoutMode);
  const breakdowns = useVsanBreakdowns();
  const instances = useRef<Record<string, EChartsInstance | null>>({});
  const showStorage = layoutMode !== 'disaggregated';

  if (scenarios.length === 0) return null;

  return (
    <div className="space-y-6">
      {breakdowns.map((bd, i) => {
        const scenario = scenarios[i];
        if (!scenario) return null;
        const scenarioName = scenario.name;
        const scenarioId = scenario.id;

        // Absolute values (for labels and tooltips)
        const absRows: CapacityAbsRow[] = [
          {
            name: 'CPU GHz',
            required: bd.cpu.required,
            spare: bd.cpu.spare,
            excess: Math.max(0, bd.cpu.excess),
            total: bd.cpu.total,
          },
          {
            name: 'Memory GiB',
            required: bd.memory.required,
            spare: bd.memory.spare,
            excess: Math.max(0, bd.memory.excess),
            total: bd.memory.total,
          },
          ...(showStorage
            ? [
                {
                  name: 'Raw Storage TiB',
                  required: bd.storage.required / 1024,
                  spare: bd.storage.spare / 1024,
                  excess: Math.max(0, bd.storage.excess) / 1024,
                  total: bd.storage.total / 1024,
                },
              ]
            : []),
          ...(showStorage
            ? [
                (() => {
                  if (bd.storage.total === 0) {
                    return {
                      name: 'Usable Storage TiB',
                      required: 0,
                      spare: 0,
                      excess: 0,
                      total: 0,
                    };
                  }
                  const usableReq = bd.storage.usableRequired / 1024;
                  const spareFrac = bd.storage.spare / bd.storage.total;
                  const excessFrac = Math.max(0, bd.storage.excess) / bd.storage.total;
                  const usableSpare = usableReq * spareFrac;
                  const usableExcess = usableReq * excessFrac;
                  return {
                    name: 'Usable Storage TiB',
                    required: usableReq,
                    spare: usableSpare,
                    excess: usableExcess,
                    total: usableReq + usableSpare + usableExcess,
                  };
                })(),
              ]
            : []),
        ];

        return (
          <div key={scenarioId} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Capacity Breakdown -- {scenarioName}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const inst = instances.current[scenarioId];
                  if (inst) downloadChartSvg(inst, `capacity-${scenarioName}.svg`);
                }}
                aria-label="Download capacity chart as SVG"
              >
                Download SVG
              </Button>
            </div>
            <div className={showStorage ? 'h-[140px] sm:h-[220px]' : 'h-[100px] sm:h-[130px]'}>
              <Chart
                option={buildCapacityOption(absRows)}
                ariaLabel={`Capacity breakdown for ${scenarioName}`}
                onReady={(inst) => {
                  instances.current[scenarioId] = inst;
                  onChartReady?.(`capacity-${scenarioId}`, inst);
                }}
              />
            </div>
            <div className="flex justify-center gap-6 text-xs text-slate-500 dark:text-slate-400 pb-2">
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block w-3 h-3 rounded-sm"
                  style={{ backgroundColor: CHART_COLORS[0] }}
                />
                Required
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block w-3 h-3 rounded-sm"
                  style={{ backgroundColor: CHART_COLORS[1] }}
                />
                Spare
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block w-3 h-3 rounded-sm"
                  style={{ backgroundColor: CHART_COLORS[2] }}
                />
                Excess
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
