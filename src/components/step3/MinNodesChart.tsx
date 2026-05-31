import { useRef } from 'react';
import { Chart, type EChartsInstance } from '@/components/charts/Chart';
import { Button } from '@/components/ui/button';
import { useVsanBreakdowns } from '@/hooks/useVsanBreakdowns';
import { buildMinNodesOption, type MinNodesRow } from '@/lib/sizing/chartOptions/minNodesOption';
import { downloadChartSvg } from '@/lib/utils/chartImage';
import { useScenariosStore } from '@/store/useScenariosStore';

const CONSTRAINT_LABELS: Record<string, string> = {
  cpu: 'CPU',
  memory: 'Memory',
  storage: 'Storage',
  ftha: 'FT & HA',
  vms: 'VM Count',
};

/** Ordered keys for consistent bar rendering. */
const CONSTRAINT_KEYS = ['cpu', 'memory', 'storage', 'ftha', 'vms'] as const;

interface MinNodesChartProps {
  /** PPTX export hook: receives (`minnodes-${id}`, instance) on chart ready. */
  readonly onChartReady?: (key: string, instance: EChartsInstance) => void;
}

/**
 * Horizontal bar chart showing minimum node count per constraint.
 * The binding constraint (highest node count) is highlighted in brand color;
 * non-binding constraints are slate. One chart per scenario, each with a
 * Download SVG button.
 */
export function MinNodesChart({ onChartReady }: MinNodesChartProps = {}) {
  const scenarios = useScenariosStore((s) => s.scenarios);
  const breakdowns = useVsanBreakdowns();
  const instances = useRef<Record<string, EChartsInstance | null>>({});

  if (scenarios.length === 0) return null;

  return (
    <div className="space-y-6">
      {breakdowns.map((bd, i) => {
        const scenario = scenarios[i];
        if (!scenario) return null;
        const scenarioName = scenario.name;
        const scenarioId = scenario.id;

        const finalCount = Math.max(...Object.values(bd.minNodesByConstraint), 0);

        const constraintRows: MinNodesRow[] = CONSTRAINT_KEYS.map((key) => {
          const nodes = bd.minNodesByConstraint[key] ?? 0;
          return {
            name: CONSTRAINT_LABELS[key] ?? key,
            nodes,
            isBinding: nodes === finalCount && nodes > 0,
          };
        });

        return (
          <div key={scenarioId} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Min Nodes by Constraint -- {scenarioName}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const inst = instances.current[scenarioId];
                  if (inst) downloadChartSvg(inst, `min-nodes-${scenarioName}.svg`);
                }}
                aria-label="Download min nodes chart as SVG"
              >
                Download SVG
              </Button>
            </div>
            <div className="h-[180px] sm:h-[220px]">
              <Chart
                option={buildMinNodesOption(constraintRows)}
                ariaLabel={`Min nodes by constraint for ${scenarioName}`}
                onReady={(inst) => {
                  instances.current[scenarioId] = inst;
                  onChartReady?.(`minnodes-${scenarioId}`, inst);
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
