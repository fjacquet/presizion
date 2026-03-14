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
  ReferenceLine,
  LabelList,
} from 'recharts'
import { useScenariosStore } from '@/store/useScenariosStore'
import { useScenariosResults } from '@/hooks/useScenariosResults'
import { useClusterStore } from '@/store/useClusterStore'
import { Button } from '@/components/ui/button'
import { CHART_COLORS } from '@/lib/sizing/chartColors'
import { downloadChartPng } from '@/lib/utils/downloadChartPng'

/**
 * Bar chart showing total physical cores per scenario.
 * Includes an As-Is reference line when cluster.totalPcores > 0.
 * Legend is always shown. Data labels appear above bars.
 */
export function CoreCountChart() {
  const scenarios = useScenariosStore((s) => s.scenarios)
  const results = useScenariosResults()
  const currentCluster = useClusterStore((s) => s.currentCluster)
  const containerRef = useRef<HTMLDivElement | null>(null)

  if (scenarios.length === 0) return null

  const chartData = scenarios.map((s, i) => ({
    name: s.name,
    cores: (results[i]?.finalCount ?? 0) * s.socketsPerServer * s.coresPerSocket,
  }))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Total Physical Cores per Scenario</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadChartPng(containerRef, 'core-count-chart.png')}
          aria-label="Download chart as PNG"
        >
          Download PNG
        </Button>
      </div>
      <div ref={containerRef}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 20, right: 16, bottom: 40, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} />
            <YAxis label={{ value: 'Physical Cores', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            {currentCluster.totalPcores > 0 && (
              <ReferenceLine
                y={currentCluster.totalPcores}
                label="As-Is"
                stroke="#94a3b8"
                strokeDasharray="4 2"
              />
            )}
            <Bar dataKey="cores" name="Physical Cores" fill={CHART_COLORS[0]}>
              <LabelList dataKey="cores" position="top" style={{ fontSize: 11 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
