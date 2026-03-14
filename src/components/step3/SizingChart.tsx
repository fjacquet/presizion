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
} from 'recharts'
import { useScenariosStore } from '@/store/useScenariosStore'
import { useScenariosResults } from '@/hooks/useScenariosResults'
import { useWizardStore } from '@/store/useWizardStore'
import { useClusterStore } from '@/store/useClusterStore'
import { Button } from '@/components/ui/button'

function downloadChartPng(ref: React.RefObject<HTMLDivElement | null>): void {
  const svg = ref.current?.querySelector('svg')
  if (!svg) return
  const xml = new XMLSerializer().serializeToString(svg)
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = svg.clientWidth * 2
    canvas.height = svg.clientHeight * 2
    const ctx = canvas.getContext('2d')
    if (!ctx) { URL.revokeObjectURL(url); return }
    ctx.scale(2, 2)
    ctx.drawImage(img, 0, 0)
    URL.revokeObjectURL(url)
    canvas.toBlob((b) => {
      if (!b) return
      const a = document.createElement('a')
      a.href = URL.createObjectURL(b)
      a.download = 'cluster-sizing-chart.png'
      a.click()
      URL.revokeObjectURL(a.href)
    }, 'image/png')
  }
  img.src = url
}

export function SizingChart() {
  const scenarios = useScenariosStore((s) => s.scenarios)
  const results = useScenariosResults()
  const sizingMode = useWizardStore((s) => s.sizingMode)
  const layoutMode = useWizardStore((s) => s.layoutMode)
  const currentCluster = useClusterStore((s) => s.currentCluster)
  const containerRef = useRef<HTMLDivElement | null>(null)

  if (scenarios.length === 0) return null

  const showLegend = scenarios.length > 1
  const showDisk = layoutMode !== 'disaggregated'

  const cpuBarName =
    sizingMode === 'specint' ? 'SPECint-limited' :
    sizingMode === 'ghz' ? 'GHz-limited' :
    'CPU-limited'

  const chartData = scenarios.map((s, i) => ({
    name: s.name,
    cpu: results[i]?.cpuLimitedCount ?? 0,
    ram: results[i]?.ramLimitedCount ?? 0,
    ...(showDisk ? { disk: results[i]?.diskLimitedCount ?? 0 } : {}),
  }))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Server Count Comparison</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadChartPng(containerRef)}
          aria-label="Download chart as PNG"
        >
          Download PNG
        </Button>
      </div>
      <div ref={containerRef}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 40, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} />
            <YAxis label={{ value: 'Servers', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            {showLegend && <Legend />}
            {currentCluster.existingServerCount !== undefined && (
              <ReferenceLine
                y={currentCluster.existingServerCount}
                label="As-Is"
                stroke="#94a3b8"
                strokeDasharray="4 2"
              />
            )}
            <Bar dataKey="cpu" name={cpuBarName} fill="#6366f1" />
            <Bar dataKey="ram" name="RAM-limited" fill="#22c55e" />
            {showDisk && <Bar dataKey="disk" name="Disk-limited" fill="#f59e0b" />}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
