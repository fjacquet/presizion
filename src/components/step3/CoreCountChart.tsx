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
} from 'recharts'
import { useScenariosStore } from '@/store/useScenariosStore'
import { useScenariosResults } from '@/hooks/useScenariosResults'
import { useClusterStore } from '@/store/useClusterStore'

/**
 * Bar chart showing total physical cores per scenario.
 * Includes an As-Is reference line when cluster.totalPcores > 0.
 * Legend is hidden when there is only one scenario.
 */
export function CoreCountChart() {
  const scenarios = useScenariosStore((s) => s.scenarios)
  const results = useScenariosResults()
  const currentCluster = useClusterStore((s) => s.currentCluster)

  if (scenarios.length === 0) return null

  const showLegend = scenarios.length > 1
  const chartData = scenarios.map((s, i) => ({
    name: s.name,
    cores: (results[i]?.finalCount ?? 0) * s.socketsPerServer * s.coresPerSocket,
  }))

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">Total Physical Cores per Scenario</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 40, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} />
          <YAxis label={{ value: 'Physical Cores', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          {showLegend && <Legend />}
          {currentCluster.totalPcores > 0 && (
            <ReferenceLine
              y={currentCluster.totalPcores}
              label="As-Is"
              stroke="#94a3b8"
              strokeDasharray="4 2"
            />
          )}
          <Bar dataKey="cores" name="Physical Cores" fill="#818cf8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
