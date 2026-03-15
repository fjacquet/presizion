import { useRef } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useScenariosStore } from '@/store/useScenariosStore'
import { useVsanBreakdowns } from '@/hooks/useVsanBreakdowns'
import { Button } from '@/components/ui/button'
import { CHART_COLORS } from '@/lib/sizing/chartColors'
import { downloadChartPng } from '@/lib/utils/downloadChartPng'

interface CapacityRow {
  readonly name: string
  readonly required: number
  readonly spare: number
  readonly excess: number
  readonly total: number
}

/**
 * Creates a custom label renderer for stacked bar segments.
 * Shows percentage of total when the segment is wide enough.
 */
function renderLabel(rows: readonly CapacityRow[]) {
  return function SegmentLabel(props: {
    x?: number
    y?: number
    width?: number
    height?: number
    value?: number
    index?: number
  }) {
    const { x = 0, y = 0, width = 0, height = 0, value = 0, index = 0 } = props
    const row = rows[index]
    if (!row || width < 30 || row.total === 0) return null
    return (
      <text
        x={x + width / 2}
        y={y + height / 2}
        fill="white"
        fontSize={11}
        fontWeight={600}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {((value / row.total) * 100).toFixed(0)}%
      </text>
    )
  }
}

/**
 * Stacked horizontal bar chart showing capacity breakdown per scenario.
 * Rows: CPU GHz, Memory GiB, Raw Storage TiB, Usable Storage TiB.
 * Segments: Required (blue), Spare (green), Excess (amber).
 * One chart per scenario, each with a Download PNG button.
 */
export function CapacityStackedChart() {
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

        const rows: CapacityRow[] = [
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
          {
            name: 'Raw Storage TiB',
            required: bd.storage.required / 1024,
            spare: bd.storage.spare / 1024,
            excess: Math.max(0, bd.storage.excess) / 1024,
            total: bd.storage.total / 1024,
          },
          (() => {
            if (bd.storage.total === 0) {
              return { name: 'Usable Storage TiB', required: 0, spare: 0, excess: 0, total: 0 }
            }
            const usableReq = bd.storage.usableRequired / 1024
            const spareFrac = bd.storage.spare / bd.storage.total
            const excessFrac = Math.max(0, bd.storage.excess) / bd.storage.total
            const usableSpare = usableReq * spareFrac
            const usableExcess = usableReq * excessFrac
            return {
              name: 'Usable Storage TiB',
              required: usableReq,
              spare: usableSpare,
              excess: usableExcess,
              total: usableReq + usableSpare + usableExcess,
            }
          })(),
        ]

        return (
          <div key={scenarioId} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">
                Capacity Breakdown -- {scenarioName}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadChartPng(
                    { current: refs.current[scenarioId] ?? null },
                    `capacity-${scenarioName}.png`,
                  )
                }
                aria-label="Download capacity chart as PNG"
              >
                Download PNG
              </Button>
            </div>
            <div ref={(el) => { refs.current[scenarioId] = el }}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={rows}
                  layout="vertical"
                  margin={{ top: 8, right: 80, left: 120, bottom: 8 }}
                >
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => v.toFixed(1)} />
                  <Legend />
                  <Bar
                    dataKey="required"
                    name="Required"
                    stackId="cap"
                    fill={CHART_COLORS[0]}
                    label={renderLabel(rows)}
                  />
                  <Bar
                    dataKey="spare"
                    name="Spare"
                    stackId="cap"
                    fill={CHART_COLORS[1]}
                    label={renderLabel(rows)}
                  />
                  <Bar
                    dataKey="excess"
                    name="Excess"
                    stackId="cap"
                    fill={CHART_COLORS[2]}
                    label={renderLabel(rows)}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      })}
    </div>
  )
}
