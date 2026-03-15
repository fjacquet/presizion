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

/** Absolute values for label display */
interface AbsoluteRow {
  readonly name: string
  readonly required: number
  readonly spare: number
  readonly excess: number
  readonly total: number
}

/** Normalized to percentages (all bars same width = 100%) */
interface ChartRow {
  readonly name: string
  readonly required: number
  readonly spare: number
  readonly excess: number
}

/**
 * Creates a custom label renderer for stacked bar segments.
 * Shows percentage of total when the segment is wide enough.
 * Returns an invisible <text> element when hidden (Recharts label prop requires ReactElement).
 */
function renderSegmentLabel(absRows: readonly AbsoluteRow[], dataKey: 'required' | 'spare' | 'excess') {
  return function SegmentLabel(props: {
    x?: number
    y?: number
    width?: number
    height?: number
    index?: number
  }): React.ReactElement<SVGElement> {
    const { x = 0, y = 0, width = 0, height = 0, index = 0 } = props
    const row = absRows[index]
    if (!row || width < 40 || row.total === 0) {
      return <text visibility="hidden" />
    }
    const absValue = row[dataKey]
    const pct = ((absValue / row.total) * 100).toFixed(1)
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
        {pct}%
      </text>
    )
  }
}

/** Normalize absolute row to percentages (capped at 100% total) */
function normalizeRow(abs: AbsoluteRow): ChartRow {
  if (abs.total === 0) return { name: abs.name, required: 0, spare: 0, excess: 0 }
  const reqPct = Math.min((abs.required / abs.total) * 100, 100)
  const sparePct = Math.min((abs.spare / abs.total) * 100, 100 - reqPct)
  const excessPct = Math.max(0, 100 - reqPct - sparePct)
  return { name: abs.name, required: reqPct, spare: sparePct, excess: excessPct }
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

        // Absolute values (for labels and tooltips)
        const absRows: AbsoluteRow[] = [
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

        // Normalized to % (all bars same width = 100%)
        const chartRows = absRows.map(normalizeRow)

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
                  data={chartRows}
                  layout="vertical"
                  margin={{ top: 8, right: 40, left: 120, bottom: 8 }}
                >
                  <XAxis type="number" hide domain={[0, 100]} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(_v: number, _name: string, props: { payload?: ChartRow }) => {
                      const idx = chartRows.indexOf(props.payload!)
                      const abs = absRows[idx]
                      if (!abs) return ''
                      return `${abs.total.toFixed(1)} total`
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="required"
                    name="Required"
                    stackId="cap"
                    fill={CHART_COLORS[0]}
                    label={renderSegmentLabel(absRows, 'required')}
                  />
                  <Bar
                    dataKey="spare"
                    name="Spare"
                    stackId="cap"
                    fill={CHART_COLORS[1]}
                    label={renderSegmentLabel(absRows, 'spare')}
                  />
                  <Bar
                    dataKey="excess"
                    name="Excess"
                    stackId="cap"
                    fill={CHART_COLORS[2]}
                    label={renderSegmentLabel(absRows, 'excess')}
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
