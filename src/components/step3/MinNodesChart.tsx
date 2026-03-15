import { useRef } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
} from 'recharts'
import { useScenariosStore } from '@/store/useScenariosStore'
import { useVsanBreakdowns } from '@/hooks/useVsanBreakdowns'
import { Button } from '@/components/ui/button'
import { CHART_COLORS } from '@/lib/sizing/chartColors'
import { downloadChartPng } from '@/lib/utils/downloadChartPng'

const CONSTRAINT_LABELS: Record<string, string> = {
  cpu: 'CPU',
  memory: 'Memory',
  storage: 'Storage',
  ftha: 'FT & HA',
  vms: 'VM Count',
}

/** Ordered keys for consistent bar rendering. */
const CONSTRAINT_KEYS = ['cpu', 'memory', 'storage', 'ftha', 'vms'] as const

interface ConstraintRow {
  readonly name: string
  readonly nodes: number
  readonly isBinding: boolean
}

/**
 * Horizontal bar chart showing minimum node count per constraint.
 * The binding constraint (highest node count) is highlighted in blue;
 * non-binding constraints are slate-400.
 * One chart per scenario, each with a Download PNG button.
 */
export function MinNodesChart() {
  const scenarios = useScenariosStore((s) => s.scenarios)
  const breakdowns = useVsanBreakdowns()
  const refs = useRef<Record<string, HTMLDivElement | null>>({})

  if (scenarios.length === 0) return null

  return (
    <div className="space-y-6">
      {breakdowns.map((bd, i) => {
        const scenario = scenarios[i]
        if (!scenario) return null
        const scenarioName = scenario.name
        const scenarioId = scenario.id

        const finalCount = Math.max(
          ...Object.values(bd.minNodesByConstraint),
          0,
        )

        const constraintRows: ConstraintRow[] = CONSTRAINT_KEYS.map((key) => {
          const nodes = bd.minNodesByConstraint[key] ?? 0
          return {
            name: CONSTRAINT_LABELS[key] ?? key,
            nodes,
            isBinding: nodes === finalCount && nodes > 0,
          }
        })

        return (
          <div key={scenarioId} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">
                Min Nodes by Constraint -- {scenarioName}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadChartPng(
                    { current: refs.current[scenarioId] ?? null },
                    `min-nodes-${scenarioName}.png`,
                  )
                }
                aria-label="Download min nodes chart as PNG"
              >
                Download PNG
              </Button>
            </div>
            <div ref={(el) => { refs.current[scenarioId] = el }}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={constraintRows}
                  layout="vertical"
                  margin={{ top: 8, right: 60, left: 90, bottom: 8 }}
                >
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="nodes" name="Min Nodes">
                    <LabelList
                      dataKey="nodes"
                      position="right"
                      style={{ fontSize: 11, fontWeight: 600 }}
                    />
                    {constraintRows.map((row, idx) => (
                      <Cell
                        key={idx}
                        fill={row.isBinding ? CHART_COLORS[0] : '#94a3b8'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      })}
    </div>
  )
}
