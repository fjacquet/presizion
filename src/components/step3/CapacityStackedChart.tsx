import { useRef } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useScenariosStore } from '@/store/useScenariosStore'
import { useWizardStore } from '@/store/useWizardStore'
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
function renderSegmentLabel(absRows: readonly AbsoluteRow[], chartRows: readonly ChartRow[], dataKey: 'required' | 'spare' | 'excess') {
  return function SegmentLabel(props: {
    x?: number
    y?: number
    width?: number
    height?: number
    index?: number
  }): React.ReactElement<SVGElement> {
    const { x = 0, y = 0, width = 0, height = 0, index = 0 } = props
    const abs = absRows[index]
    const chart = chartRows[index]
    if (!abs || !chart || width < 40 || abs.total === 0) {
      return <text visibility="hidden" />
    }
    // Show the chart percentage (capped at 100% total) not the raw ratio
    const pct = chart[dataKey].toFixed(1)
    // Flag overcommit: when required > total, show warning
    const isOvercommit = dataKey === 'required' && abs.required > abs.total
    const label = isOvercommit ? `${pct}% (!!)` : `${pct}%`
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
        {label}
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

interface CapacityStackedChartProps {
  /** When provided, chart container refs are written here for PDF/PPTX export capture. */
  readonly chartRefs?: React.MutableRefObject<Record<string, HTMLDivElement | null>>
}

/**
 * Stacked horizontal bar chart showing capacity breakdown per scenario.
 * Rows: CPU GHz, Memory GiB, Raw Storage TiB, Usable Storage TiB.
 * Segments: Required (blue), Spare (green), Excess (amber).
 * One chart per scenario, each with a Download PNG button.
 */
export function CapacityStackedChart({ chartRefs }: CapacityStackedChartProps = {}) {
  const scenarios = useScenariosStore((s) => s.scenarios)
  const layoutMode = useWizardStore((s) => s.layoutMode)
  const breakdowns = useVsanBreakdowns()
  const refs = useRef<Record<string, HTMLDivElement | null>>({})
  const showStorage = layoutMode !== 'disaggregated'

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
          ...(showStorage ? [{
            name: 'Raw Storage TiB',
            required: bd.storage.required / 1024,
            spare: bd.storage.spare / 1024,
            excess: Math.max(0, bd.storage.excess) / 1024,
            total: bd.storage.total / 1024,
          }] : []),
          ...(showStorage ? [(() => {
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
          })()] : []),
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
                    {
                      legend: [
                        { label: 'Required', color: CHART_COLORS[0]! },
                        { label: 'Spare', color: CHART_COLORS[1]! },
                        { label: 'Excess', color: CHART_COLORS[2]! },
                      ],
                      tableHeaders: ['Required', 'Spare', 'Excess', 'Total'],
                      tableRows: absRows.map(r => ({
                        label: r.name,
                        values: [
                          r.required.toFixed(1),
                          r.spare.toFixed(1),
                          r.excess.toFixed(1),
                          r.total.toFixed(1),
                        ],
                      })),
                    },
                  )
                }
                aria-label="Download capacity chart as PNG"
              >
                Download PNG
              </Button>
            </div>
            <div className={showStorage ? 'h-[140px] sm:h-[220px]' : 'h-[100px] sm:h-[130px]'}>
              <div className="h-full" ref={(el) => {
                refs.current[scenarioId] = el
                if (chartRefs) chartRefs.current[`capacity-${scenarioId}`] = el
              }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartRows}
                  layout="vertical"
                  margin={{ top: 8, right: 40, left: 90, bottom: 8 }}
                >
                  <XAxis type="number" hide domain={[0, 100]} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(_v: number, name: string, props: { payload?: ChartRow & { name?: string } }) => {
                      const rowName = props.payload?.name
                      const idx = absRows.findIndex(r => r.name === rowName)
                      const abs = absRows[idx]
                      if (!abs) return ''
                      const key = name === 'Required' ? 'required' : name === 'Spare' ? 'spare' : 'excess'
                      const val = abs[key as keyof AbsoluteRow] as number
                      const pct = abs.total > 0 ? ((val / abs.total) * 100).toFixed(1) : '0.0'
                      return `${val.toFixed(1)} (${pct}% of ${abs.total.toFixed(1)} total)`
                    }}
                  />
                  <Bar
                    dataKey="required"
                    name="Required"
                    stackId="cap"
                    fill={CHART_COLORS[0]}
                    label={renderSegmentLabel(absRows, chartRows, 'required')}
                  />
                  <Bar
                    dataKey="spare"
                    name="Spare"
                    stackId="cap"
                    fill={CHART_COLORS[1]}
                    label={renderSegmentLabel(absRows, chartRows, 'spare')}
                  />
                  <Bar
                    dataKey="excess"
                    name="Excess"
                    stackId="cap"
                    fill={CHART_COLORS[2]}
                    label={renderSegmentLabel(absRows, chartRows, 'excess')}
                  />
                </BarChart>
              </ResponsiveContainer>
              </div>
            </div>
            <div className="flex justify-center gap-6 text-xs text-muted-foreground pb-2">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS[0] }} />
                Required
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS[1] }} />
                Spare
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS[2] }} />
                Excess
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
