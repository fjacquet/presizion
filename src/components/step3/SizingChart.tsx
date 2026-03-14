import { useRef } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
  Cell,
} from 'recharts'
import { useScenariosStore } from '@/store/useScenariosStore'
import { useScenariosResults } from '@/hooks/useScenariosResults'
import { useWizardStore } from '@/store/useWizardStore'
import { useClusterStore } from '@/store/useClusterStore'
import { Button } from '@/components/ui/button'
import { CHART_COLORS } from '@/lib/sizing/chartColors'
import { downloadChartPng } from '@/lib/utils/downloadChartPng'

const AS_IS_COLOR = '#94a3b8' // slate-400

export function SizingChart() {
  const scenarios = useScenariosStore((s) => s.scenarios)
  const results = useScenariosResults()
  const sizingMode = useWizardStore((s) => s.sizingMode)
  const layoutMode = useWizardStore((s) => s.layoutMode)
  const currentCluster = useClusterStore((s) => s.currentCluster)
  const containerRef = useRef<HTMLDivElement | null>(null)

  if (scenarios.length === 0) return null

  const showDisk = layoutMode !== 'disaggregated'

  const cpuBarName =
    sizingMode === 'specint' ? 'SPECint-limited' :
    sizingMode === 'ghz' ? 'GHz-limited' :
    'CPU-limited'

  // Per-constraint breakdown data (grouped bars per scenario)
  const constraintData = scenarios.map((s, i) => ({
    name: s.name,
    cpu: results[i]?.cpuLimitedCount ?? 0,
    ram: results[i]?.ramLimitedCount ?? 0,
    ...(showDisk ? { disk: results[i]?.diskLimitedCount ?? 0 } : {}),
  }))

  // Final server count comparison with As-Is bar
  const hasAsIs = currentCluster.existingServerCount !== undefined && currentCluster.existingServerCount > 0
  const comparisonData = [
    ...(hasAsIs ? [{ name: 'As-Is', servers: currentCluster.existingServerCount!, isAsIs: true }] : []),
    ...scenarios.map((s, i) => ({
      name: s.name,
      servers: results[i]?.finalCount ?? 0,
      isAsIs: false,
    })),
  ]

  return (
    <div className="space-y-6">
      {/* Final server count comparison */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">Server Count Comparison</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadChartPng(containerRef, 'cluster-sizing-chart.png')}
            aria-label="Download chart as PNG"
          >
            Download PNG
          </Button>
        </div>
        <div ref={containerRef}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonData} margin={{ top: 20, right: 16, bottom: 40, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} />
              <YAxis label={{ value: 'Servers', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend
                payload={[
                  ...(hasAsIs ? [{ value: 'As-Is', type: 'square' as const, color: AS_IS_COLOR }] : []),
                  ...scenarios.map((s, i) => ({ value: s.name, type: 'square' as const, color: CHART_COLORS[i % CHART_COLORS.length]! })),
                ]}
              />
              <Bar dataKey="servers" name="Servers Required">
                <LabelList dataKey="servers" position="top" style={{ fontSize: 12, fontWeight: 600 }} />
                {comparisonData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.isAsIs ? AS_IS_COLOR : CHART_COLORS[(idx - (hasAsIs ? 1 : 0)) % CHART_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Per-constraint breakdown */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Constraint Breakdown per Scenario</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={constraintData} margin={{ top: 20, right: 16, bottom: 40, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} />
            <YAxis label={{ value: 'Servers', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="cpu" name={cpuBarName} fill={CHART_COLORS[0]}>
              <LabelList dataKey="cpu" position="top" style={{ fontSize: 11 }} />
            </Bar>
            <Bar dataKey="ram" name="RAM-limited" fill={CHART_COLORS[1]}>
              <LabelList dataKey="ram" position="top" style={{ fontSize: 11 }} />
            </Bar>
            {showDisk && (
              <Bar dataKey="disk" name="Disk-limited" fill={CHART_COLORS[2]}>
                <LabelList dataKey="disk" position="top" style={{ fontSize: 11 }} />
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
