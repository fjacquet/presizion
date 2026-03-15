/**
 * PPTX export utility: generates a PowerPoint presentation from sizing results.
 *
 * Requirements: PPTX-01 (export button), PPTX-02 (slide content),
 *               PPTX-03 (lazy-load), PPTX-05 (toolbar placement).
 *
 * pptxgenjs is lazy-loaded via dynamic import -- it is never in the main bundle.
 */
import type { OldCluster, Scenario } from '@/types/cluster'
import type { ScenarioResult } from '@/types/results'
import type { VsanCapacityBreakdown } from '@/types/breakdown'
import { FTT_POLICY_MAP } from '@/lib/sizing/vsanConstants'
import { chartRefToDataUrl, type ChartCapture } from '@/lib/utils/chartCapture'
import { getLogoDataUrl } from '@/lib/utils/logoDataUrl'

// ---------------------------------------------------------------------------
// Color constants (hex without '#')
// ---------------------------------------------------------------------------
const BLUE = '3B82F6'
const GRAY = '6B7280'
const LIGHT_GRAY = 'F3F4F6'
const WHITE = 'FFFFFF'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip `data:` prefix from a data URL so pptxgenjs can accept it as `data`. */
function toPptxData(dataUrl: string): string {
  return dataUrl.replace(/^data:/, '')
}

/** Format a number to 1 decimal place. */
function f1(n: number): string {
  return n.toFixed(1)
}

/** Format a number to 2 decimal places. */
function f2(n: number): string {
  return n.toFixed(2)
}

// ---------------------------------------------------------------------------
// Capture chart images for all scenarios
// ---------------------------------------------------------------------------
interface ScenarioCharts {
  readonly capacity: ChartCapture | null
  readonly minnodes: ChartCapture | null
}

async function captureAllCharts(
  scenarios: readonly Scenario[],
  chartRefs: Record<string, HTMLDivElement | null>,
): Promise<readonly ScenarioCharts[]> {
  const tasks = scenarios.map(async (s) => {
    const [capacity, minnodes] = await Promise.all([
      chartRefToDataUrl(chartRefs[`capacity-${s.id}`] ?? null),
      chartRefToDataUrl(chartRefs[`minnodes-${s.id}`] ?? null),
    ])
    return { capacity, minnodes }
  })
  return Promise.all(tasks)
}

// ---------------------------------------------------------------------------
// Main export function
// ---------------------------------------------------------------------------

/**
 * Generates and downloads a PowerPoint presentation containing:
 * - Title slide with cluster summary
 * - Executive summary table
 * - As-Is vs To-Be comparison table
 * - Sizing assumptions (general, vSAN settings, growth projections)
 * - Per-scenario server configuration
 * - Per-scenario capacity breakdown tables and chart images
 * - Scenario comparison table
 *
 * @param cluster    - Current cluster metrics
 * @param scenarios  - Target sizing scenarios
 * @param results    - Computed results (parallel array with scenarios)
 * @param breakdowns - Capacity breakdowns (parallel array with scenarios)
 * @param chartRefs  - Map of chart container refs keyed by "capacity-{id}" / "minnodes-{id}"
 */
export async function exportPptx(
  cluster: OldCluster,
  scenarios: readonly Scenario[],
  results: readonly ScenarioResult[],
  breakdowns: readonly VsanCapacityBreakdown[],
  chartRefs: Record<string, HTMLDivElement | null>,
): Promise<void> {
  // 1. Lazy-load pptxgenjs (PPTX-03)
  const PptxGenJS = (await import('pptxgenjs')).default

  // 2. Capture chart images before building slides
  const allCharts = await captureAllCharts(scenarios, chartRefs)

  // 3. Create presentation
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE' // 13.33" x 7.5"
  pptx.author = 'Presizion'
  pptx.title = 'Cluster Sizing Report'

  // -------------------------------------------------------------------
  // Slide 1: Title
  // -------------------------------------------------------------------
  const titleSlide = pptx.addSlide()

  // Logo
  try {
    const logoUrl = await getLogoDataUrl()
    if (logoUrl) {
      titleSlide.addImage({ data: logoUrl, x: 0.5, y: 0.5, w: 3, h: 0.75 })
    }
  } catch { /* logo is optional */ }

  titleSlide.addText('Cluster Sizing Report', {
    x: 0.5,
    y: 1.5,
    w: '90%',
    fontSize: 36,
    bold: true,
    color: BLUE,
  })
  titleSlide.addText('Cluster Sizing Report', {
    x: 0.5,
    y: 2.5,
    w: '90%',
    fontSize: 24,
    color: GRAY,
  })
  titleSlide.addText(`Generated: ${new Date().toLocaleDateString()}`, {
    x: 0.5,
    y: 3.5,
    w: '90%',
    fontSize: 14,
    color: GRAY,
  })
  titleSlide.addText(
    `${cluster.totalVms} VMs | ${cluster.totalVcpus} vCPUs | ${cluster.totalPcores} pCores`,
    {
      x: 0.5,
      y: 4.2,
      w: '90%',
      fontSize: 12,
      color: GRAY,
    },
  )

  // -------------------------------------------------------------------
  // Slide 2: Executive Summary
  // -------------------------------------------------------------------
  const summarySlide = pptx.addSlide()
  summarySlide.addText('Executive Summary', {
    x: 0.5,
    y: 0.3,
    w: '90%',
    fontSize: 24,
    bold: true,
    color: BLUE,
  })

  const summaryHeaderRow = [
    { text: 'Scenario', options: { bold: true, fill: { color: BLUE }, color: WHITE, fontSize: 11 } },
    { text: 'Servers', options: { bold: true, fill: { color: BLUE }, color: WHITE, fontSize: 11 } },
    { text: 'Limiting Resource', options: { bold: true, fill: { color: BLUE }, color: WHITE, fontSize: 11 } },
    { text: 'CPU Util %', options: { bold: true, fill: { color: BLUE }, color: WHITE, fontSize: 11 } },
    { text: 'RAM Util %', options: { bold: true, fill: { color: BLUE }, color: WHITE, fontSize: 11 } },
  ]

  const summaryDataRows = scenarios.map((s, i) => {
    const r = results[i]
    const fillColor = i % 2 === 0 ? LIGHT_GRAY : WHITE
    return [
      { text: s.name, options: { fill: { color: fillColor }, fontSize: 10 } },
      { text: r ? String(r.finalCount) : '-', options: { fill: { color: fillColor }, fontSize: 10 } },
      { text: r ? r.limitingResource : '-', options: { fill: { color: fillColor }, fontSize: 10 } },
      { text: r ? f1(r.cpuUtilizationPercent) : '-', options: { fill: { color: fillColor }, fontSize: 10 } },
      { text: r ? f1(r.ramUtilizationPercent) : '-', options: { fill: { color: fillColor }, fontSize: 10 } },
    ]
  })

  summarySlide.addTable(
    [summaryHeaderRow, ...summaryDataRows],
    {
      x: 0.5,
      y: 1.2,
      w: 12,
      colW: [4, 2, 2.5, 1.75, 1.75],
      border: { pt: 0.5, color: 'CFCFCF' },
    },
  )

  // -------------------------------------------------------------------
  // Slide 3: As-Is vs To-Be Comparison
  // -------------------------------------------------------------------
  const comparisonSlide = pptx.addSlide()
  comparisonSlide.addText('As-Is vs To-Be Comparison', {
    x: 0.5,
    y: 0.3,
    w: '90%',
    fontSize: 24,
    bold: true,
    color: BLUE,
  })

  const asIsServerConfig =
    cluster.socketsPerServer && cluster.coresPerSocket
      ? `${cluster.socketsPerServer}s x ${cluster.coresPerSocket}c`
      : '--'

  const asIsPcores = String(cluster.totalPcores)

  const asIsRatio =
    cluster.totalPcores > 0
      ? (cluster.totalVcpus / cluster.totalPcores).toFixed(1)
      : '--'

  const asIsVmsPerServer =
    cluster.existingServerCount && cluster.existingServerCount > 0
      ? (cluster.totalVms / cluster.existingServerCount).toFixed(1)
      : '--'

  const asIsTotalDisk =
    cluster.totalDiskGb !== undefined
      ? `${(cluster.totalDiskGb / 1024).toFixed(1)} TiB`
      : '--'

  const compHeaderRow = [
    { text: 'Metric', options: { bold: true, fill: { color: BLUE }, color: WHITE, fontSize: 10 } },
    { text: 'As-Is', options: { bold: true, fill: { color: BLUE }, color: WHITE, fontSize: 10 } },
    ...scenarios.map((s) => ({
      text: s.name,
      options: { bold: true, fill: { color: BLUE }, color: WHITE, fontSize: 10 },
    })),
  ]

  interface CompMetric {
    readonly label: string
    readonly asIs: string
    readonly scenarioValues: readonly string[]
  }

  const compMetrics: CompMetric[] = [
    {
      label: 'Servers',
      asIs: cluster.existingServerCount !== undefined ? String(cluster.existingServerCount) : '--',
      scenarioValues: results.map((r) => String(r.finalCount)),
    },
    {
      label: 'Server Config',
      asIs: asIsServerConfig,
      scenarioValues: scenarios.map((s) => `${s.socketsPerServer}s x ${s.coresPerSocket}c`),
    },
    {
      label: 'Total pCores',
      asIs: asIsPcores,
      scenarioValues: results.map((r, idx) => {
        const s = scenarios[idx]
        return s ? String(r.finalCount * s.socketsPerServer * s.coresPerSocket) : '--'
      }),
    },
    {
      label: 'Limiting Resource',
      asIs: 'N/A',
      scenarioValues: results.map((r) => r.limitingResource),
    },
    {
      label: 'vCPU:pCore Ratio',
      asIs: asIsRatio,
      scenarioValues: results.map((r) => r.achievedVcpuToPCoreRatio.toFixed(1)),
    },
    {
      label: 'VMs/Server',
      asIs: asIsVmsPerServer,
      scenarioValues: results.map((r) => r.vmsPerServer.toFixed(1)),
    },
    {
      label: 'Headroom %',
      asIs: 'N/A',
      scenarioValues: scenarios.map((s) => `${s.headroomPercent}%`),
    },
    {
      label: 'CPU Util %',
      asIs: cluster.cpuUtilizationPercent !== undefined
        ? `${cluster.cpuUtilizationPercent.toFixed(1)}%`
        : '--',
      scenarioValues: results.map((r) => `${r.cpuUtilizationPercent.toFixed(1)}%`),
    },
    {
      label: 'RAM Util %',
      asIs: cluster.ramUtilizationPercent !== undefined
        ? `${cluster.ramUtilizationPercent.toFixed(1)}%`
        : '--',
      scenarioValues: results.map((r) => `${r.ramUtilizationPercent.toFixed(1)}%`),
    },
    {
      label: 'Total Disk',
      asIs: asIsTotalDisk,
      scenarioValues: results.map((r, idx) => {
        const s = scenarios[idx]
        return s ? `${((r.finalCount * s.diskPerServerGb) / 1024).toFixed(1)} TiB` : '--'
      }),
    },
  ]

  const compDataRows = compMetrics.map((m, rowIdx) => {
    const fillColor = rowIdx % 2 === 0 ? LIGHT_GRAY : WHITE
    return [
      { text: m.label, options: { bold: true, fill: { color: fillColor }, fontSize: 10 } },
      { text: m.asIs, options: { fill: { color: fillColor }, fontSize: 10 } },
      ...m.scenarioValues.map((v) => ({
        text: v,
        options: { fill: { color: fillColor }, fontSize: 10 },
      })),
    ]
  })

  const compScenarioW = scenarios.length > 0 ? (12 - 2.5 - 2) / scenarios.length : 2
  comparisonSlide.addTable(
    [compHeaderRow, ...compDataRows],
    {
      x: 0.5,
      y: 1.2,
      w: 12,
      colW: [2.5, 2, ...scenarios.map(() => compScenarioW)],
      border: { pt: 0.5, color: 'CFCFCF' },
    },
  )

  // -------------------------------------------------------------------
  // Slide 4: Sizing Assumptions
  // -------------------------------------------------------------------
  const assumptionsSlide = pptx.addSlide()
  assumptionsSlide.addText('Sizing Assumptions', {
    x: 0.5,
    y: 0.3,
    w: '90%',
    fontSize: 24,
    bold: true,
    color: BLUE,
  })

  const assumptionsHeader = [
    { text: 'Parameter', options: { bold: true, fill: { color: GRAY }, color: WHITE, fontSize: 10 } },
    ...scenarios.map((s) => ({
      text: s.name,
      options: { bold: true, fill: { color: GRAY }, color: WHITE, fontSize: 10 },
    })),
  ]

  interface AssumptionRow {
    readonly label: string
    readonly values: readonly string[]
  }

  const generalAssumptions: AssumptionRow[] = [
    {
      label: 'vCPU:pCore Ratio',
      values: scenarios.map((s) => s.targetVcpuToPCoreRatio.toFixed(1)),
    },
    {
      label: 'Headroom %',
      values: scenarios.map((s) => `${s.headroomPercent}%`),
    },
    {
      label: 'HA Reserve',
      values: scenarios.map((s) => (s.haReserveCount === 0 ? 'None' : `N+${s.haReserveCount}`)),
    },
    {
      label: 'RAM / VM (GB)',
      values: scenarios.map((s) => s.ramPerVmGb.toFixed(1)),
    },
    {
      label: 'Disk / VM (GB)',
      values: scenarios.map((s) => s.diskPerVmGb.toFixed(1)),
    },
  ]

  const generalDataRows = generalAssumptions.map((a, rowIdx) => {
    const fillColor = rowIdx % 2 === 0 ? LIGHT_GRAY : WHITE
    return [
      { text: a.label, options: { bold: true, fill: { color: fillColor }, fontSize: 10 } },
      ...a.values.map((v) => ({
        text: v,
        options: { fill: { color: fillColor }, fontSize: 10 },
      })),
    ]
  })

  const assumptionsColW = scenarios.length > 0 ? (12 - 3) / scenarios.length : 2
  assumptionsSlide.addTable(
    [assumptionsHeader, ...generalDataRows],
    {
      x: 0.5,
      y: 1.2,
      w: 12,
      colW: [3, ...scenarios.map(() => assumptionsColW)],
      border: { pt: 0.5, color: 'CFCFCF' },
    },
  )

  // vSAN settings sub-table (only if at least one scenario uses vSAN)
  const hasVsan = scenarios.some((s) => s.vsanFttPolicy !== undefined)
  if (hasVsan) {
    const vsanHeader = [
      { text: 'vSAN Setting', options: { bold: true, fill: { color: GRAY }, color: WHITE, fontSize: 10 } },
      ...scenarios.map((s) => ({
        text: s.name,
        options: { bold: true, fill: { color: GRAY }, color: WHITE, fontSize: 10 },
      })),
    ]

    const vsanRows: AssumptionRow[] = [
      {
        label: 'FTT Policy',
        values: scenarios.map((s) =>
          s.vsanFttPolicy ? FTT_POLICY_MAP[s.vsanFttPolicy].label : 'N/A',
        ),
      },
      {
        label: 'Compression Factor',
        values: scenarios.map((s) =>
          s.vsanCompressionFactor !== undefined ? `${s.vsanCompressionFactor}x` : '1.0x',
        ),
      },
      {
        label: 'Slack %',
        values: scenarios.map((s) =>
          s.vsanSlackPercent !== undefined ? `${s.vsanSlackPercent}%` : '25%',
        ),
      },
      {
        label: 'CPU Overhead %',
        values: scenarios.map((s) =>
          s.vsanCpuOverheadPercent !== undefined ? `${s.vsanCpuOverheadPercent}%` : '10%',
        ),
      },
      {
        label: 'Memory / Host (GB)',
        values: scenarios.map((s) =>
          s.vsanMemoryPerHostGb !== undefined ? String(s.vsanMemoryPerHostGb) : '6',
        ),
      },
      {
        label: 'VM Swap',
        values: scenarios.map((s) =>
          s.vsanVmSwapEnabled ? 'Enabled' : 'Disabled (sparse)',
        ),
      },
    ]

    const vsanDataRows = vsanRows.map((a, rowIdx) => {
      const fillColor = rowIdx % 2 === 0 ? LIGHT_GRAY : WHITE
      return [
        { text: a.label, options: { bold: true, fill: { color: fillColor }, fontSize: 10 } },
        ...a.values.map((v) => ({
          text: v,
          options: { fill: { color: fillColor }, fontSize: 10 },
        })),
      ]
    })

    // Compute Y offset after the general assumptions table
    const vsanTableY = 1.2 + (generalAssumptions.length + 1) * 0.35 + 0.3
    assumptionsSlide.addTable(
      [vsanHeader, ...vsanDataRows],
      {
        x: 0.5,
        y: vsanTableY,
        w: 12,
        colW: [3, ...scenarios.map(() => assumptionsColW)],
        border: { pt: 0.5, color: 'CFCFCF' },
      },
    )
  }

  // Growth projections (only if at least one scenario has growth)
  const hasGrowth = scenarios.some(
    (s) =>
      (s.cpuGrowthPercent !== undefined && s.cpuGrowthPercent > 0) ||
      (s.memoryGrowthPercent !== undefined && s.memoryGrowthPercent > 0) ||
      (s.storageGrowthPercent !== undefined && s.storageGrowthPercent > 0),
  )
  if (hasGrowth) {
    const growthSlide = pptx.addSlide()
    growthSlide.addText('Growth Projections', {
      x: 0.5,
      y: 0.3,
      w: '90%',
      fontSize: 24,
      bold: true,
      color: BLUE,
    })

    const growthHeader = [
      { text: 'Parameter', options: { bold: true, fill: { color: GRAY }, color: WHITE, fontSize: 10 } },
      ...scenarios.map((s) => ({
        text: s.name,
        options: { bold: true, fill: { color: GRAY }, color: WHITE, fontSize: 10 },
      })),
    ]

    const growthRows: AssumptionRow[] = [
      {
        label: 'CPU Growth %',
        values: scenarios.map((s) =>
          s.cpuGrowthPercent !== undefined ? `${s.cpuGrowthPercent}%` : '0%',
        ),
      },
      {
        label: 'Memory Growth %',
        values: scenarios.map((s) =>
          s.memoryGrowthPercent !== undefined ? `${s.memoryGrowthPercent}%` : '0%',
        ),
      },
      {
        label: 'Storage Growth %',
        values: scenarios.map((s) =>
          s.storageGrowthPercent !== undefined ? `${s.storageGrowthPercent}%` : '0%',
        ),
      },
    ]

    const growthDataRows = growthRows.map((a, rowIdx) => {
      const fillColor = rowIdx % 2 === 0 ? LIGHT_GRAY : WHITE
      return [
        { text: a.label, options: { bold: true, fill: { color: fillColor }, fontSize: 10 } },
        ...a.values.map((v) => ({
          text: v,
          options: { fill: { color: fillColor }, fontSize: 10 },
        })),
      ]
    })

    growthSlide.addTable(
      [growthHeader, ...growthDataRows],
      {
        x: 0.5,
        y: 1.2,
        w: 12,
        colW: [3, ...scenarios.map(() => assumptionsColW)],
        border: { pt: 0.5, color: 'CFCFCF' },
      },
    )
  }

  // -------------------------------------------------------------------
  // Slide 5: Per-Scenario Server Configuration
  // -------------------------------------------------------------------
  const serverConfigSlide = pptx.addSlide()
  serverConfigSlide.addText('Per-Scenario Server Configuration', {
    x: 0.5,
    y: 0.3,
    w: '90%',
    fontSize: 24,
    bold: true,
    color: BLUE,
  })

  const scHeader = [
    { text: 'Parameter', options: { bold: true, fill: { color: BLUE }, color: WHITE, fontSize: 10 } },
    ...scenarios.map((s) => ({
      text: s.name,
      options: { bold: true, fill: { color: BLUE }, color: WHITE, fontSize: 10 },
    })),
  ]

  const scMetrics: AssumptionRow[] = [
    { label: 'Sockets / Server', values: scenarios.map((s) => String(s.socketsPerServer)) },
    { label: 'Cores / Socket', values: scenarios.map((s) => String(s.coresPerSocket)) },
    { label: 'Total Cores / Server', values: scenarios.map((s) => String(s.socketsPerServer * s.coresPerSocket)) },
    { label: 'RAM / Server (GB)', values: scenarios.map((s) => s.ramPerServerGb.toLocaleString()) },
    { label: 'Disk / Server (GB)', values: scenarios.map((s) => s.diskPerServerGb.toLocaleString()) },
  ]

  const scDataRows = scMetrics.map((m, rowIdx) => {
    const fillColor = rowIdx % 2 === 0 ? LIGHT_GRAY : WHITE
    return [
      { text: m.label, options: { bold: true, fill: { color: fillColor }, fontSize: 10 } },
      ...m.values.map((v) => ({
        text: v,
        options: { fill: { color: fillColor }, fontSize: 10 },
      })),
    ]
  })

  serverConfigSlide.addTable(
    [scHeader, ...scDataRows],
    {
      x: 0.5,
      y: 1.2,
      w: 12,
      colW: [3, ...scenarios.map(() => assumptionsColW)],
      border: { pt: 0.5, color: 'CFCFCF' },
    },
  )

  // -------------------------------------------------------------------
  // Per-scenario slides: Capacity Breakdown Table + Charts
  // -------------------------------------------------------------------
  scenarios.forEach((scenario, i) => {
    const bd = breakdowns[i]
    const charts = allCharts[i]

    // -- Capacity Breakdown Table slide --
    if (bd) {
      const bdSlide = pptx.addSlide()
      bdSlide.addText(`Capacity Breakdown -- ${scenario.name}`, {
        x: 0.5,
        y: 0.3,
        w: '90%',
        fontSize: 20,
        bold: true,
        color: BLUE,
      })

      const bdHeaderRow = [
        { text: 'Resource', options: { bold: true, fill: { color: BLUE }, color: WHITE, fontSize: 10 } },
        { text: 'Required', options: { bold: true, fill: { color: BLUE }, color: WHITE, fontSize: 10 } },
        { text: 'Spare', options: { bold: true, fill: { color: BLUE }, color: WHITE, fontSize: 10 } },
        { text: 'Excess', options: { bold: true, fill: { color: BLUE }, color: WHITE, fontSize: 10 } },
        { text: 'Total Configured', options: { bold: true, fill: { color: BLUE }, color: WHITE, fontSize: 10 } },
      ]

      const bdDataRows = [
        [
          { text: 'CPU GHz', options: { fill: { color: LIGHT_GRAY }, fontSize: 10 } },
          { text: f1(bd.cpu.required), options: { fill: { color: LIGHT_GRAY }, fontSize: 10 } },
          { text: f1(bd.cpu.spare), options: { fill: { color: LIGHT_GRAY }, fontSize: 10 } },
          { text: f1(bd.cpu.excess), options: { fill: { color: LIGHT_GRAY }, fontSize: 10 } },
          { text: f1(bd.cpu.total), options: { fill: { color: LIGHT_GRAY }, fontSize: 10 } },
        ],
        [
          { text: 'Memory GiB', options: { fill: { color: WHITE }, fontSize: 10 } },
          { text: f1(bd.memory.required), options: { fill: { color: WHITE }, fontSize: 10 } },
          { text: f1(bd.memory.spare), options: { fill: { color: WHITE }, fontSize: 10 } },
          { text: f1(bd.memory.excess), options: { fill: { color: WHITE }, fontSize: 10 } },
          { text: f1(bd.memory.total), options: { fill: { color: WHITE }, fontSize: 10 } },
        ],
        [
          { text: 'Raw Storage TiB', options: { fill: { color: LIGHT_GRAY }, fontSize: 10 } },
          { text: f1(bd.storage.required / 1024), options: { fill: { color: LIGHT_GRAY }, fontSize: 10 } },
          { text: f1(bd.storage.spare / 1024), options: { fill: { color: LIGHT_GRAY }, fontSize: 10 } },
          { text: f1(bd.storage.excess / 1024), options: { fill: { color: LIGHT_GRAY }, fontSize: 10 } },
          { text: f1(bd.storage.total / 1024), options: { fill: { color: LIGHT_GRAY }, fontSize: 10 } },
        ],
      ]

      bdSlide.addTable(
        [bdHeaderRow, ...bdDataRows],
        {
          x: 0.5,
          y: 1.2,
          w: 12,
          colW: [2.5, 2.4, 2.4, 2.4, 2.3],
          border: { pt: 0.5, color: 'CFCFCF' },
        },
      )
    }

    // -- Chart slides --
    if (charts) {
      const { capacity, minnodes } = charts

      if (capacity || minnodes) {
        const chartSlide = pptx.addSlide()
        chartSlide.addText(`Capacity Charts -- ${scenario.name}`, {
          x: 0.5,
          y: 0.3,
          w: '90%',
          fontSize: 20,
          bold: true,
          color: BLUE,
        })

        const imgWidth = 12
        let nextY = 1.2

        if (capacity) {
          const imgHeight = (capacity.height / capacity.width) * imgWidth
          chartSlide.addImage({
            data: toPptxData(capacity.dataUrl),
            x: 0.5,
            y: nextY,
            w: imgWidth,
            h: imgHeight,
          })
          nextY += imgHeight + 0.3
        }

        if (minnodes) {
          const imgHeight = (minnodes.height / minnodes.width) * imgWidth
          // Check if it fits on the same slide (7.5" total height)
          if (nextY + imgHeight > 7.2) {
            // Overflow: add a second chart slide
            const chartSlide2 = pptx.addSlide()
            chartSlide2.addText(`Min Nodes Chart -- ${scenario.name}`, {
              x: 0.5,
              y: 0.3,
              w: '90%',
              fontSize: 20,
              bold: true,
              color: BLUE,
            })
            chartSlide2.addImage({
              data: toPptxData(minnodes.dataUrl),
              x: 0.5,
              y: 1.2,
              w: imgWidth,
              h: imgHeight,
            })
          } else {
            chartSlide.addImage({
              data: toPptxData(minnodes.dataUrl),
              x: 0.5,
              y: nextY,
              w: imgWidth,
              h: imgHeight,
            })
          }
        }
      }
    }
  })

  // -------------------------------------------------------------------
  // Final slide: Scenario Comparison
  // -------------------------------------------------------------------
  const compSlide = pptx.addSlide()
  compSlide.addText('Scenario Comparison', {
    x: 0.5,
    y: 0.3,
    w: '90%',
    fontSize: 24,
    bold: true,
    color: BLUE,
  })

  // Build comparison table: first column = metric, then one column per scenario
  const finalCompHeader = [
    { text: 'Metric', options: { bold: true, fill: { color: BLUE }, color: WHITE, fontSize: 10 } },
    ...scenarios.map((s) => ({
      text: s.name,
      options: { bold: true, fill: { color: BLUE }, color: WHITE, fontSize: 10 },
    })),
  ]

  const finalMetrics: Array<{ label: string; values: (s: Scenario, r: ScenarioResult) => string }> = [
    { label: 'Servers Required', values: (_s, r) => String(r.finalCount) },
    { label: 'Server Config', values: (s) => `${s.socketsPerServer}S x ${s.coresPerSocket}C` },
    { label: 'Total pCores', values: (s, r) => String(r.finalCount * s.socketsPerServer * s.coresPerSocket) },
    { label: 'Limiting Resource', values: (_s, r) => r.limitingResource },
    { label: 'vCPU:pCore Ratio', values: (_s, r) => f2(r.achievedVcpuToPCoreRatio) },
    { label: 'VMs/Server', values: (_s, r) => f2(r.vmsPerServer) },
    { label: 'CPU Util %', values: (_s, r) => f1(r.cpuUtilizationPercent) },
    { label: 'RAM Util %', values: (_s, r) => f1(r.ramUtilizationPercent) },
    { label: 'Disk Util %', values: (_s, r) => f1(r.diskUtilizationPercent) },
  ]

  const finalCompRows = finalMetrics.map((m, rowIdx) => {
    const fillColor = rowIdx % 2 === 0 ? LIGHT_GRAY : WHITE
    return [
      { text: m.label, options: { bold: true, fill: { color: fillColor }, fontSize: 10 } },
      ...scenarios.map((s, j) => {
        const r = results[j]
        return {
          text: r ? m.values(s, r) : '-',
          options: { fill: { color: fillColor }, fontSize: 10 },
        }
      }),
    ]
  })

  // Column widths: first col 2.5", then split remaining ~9.5" among scenarios
  const scenarioColW = scenarios.length > 0
    ? (12 - 2.5) / scenarios.length
    : 2

  compSlide.addTable(
    [finalCompHeader, ...finalCompRows],
    {
      x: 0.5,
      y: 1.2,
      w: 12,
      colW: [2.5, ...scenarios.map(() => scenarioColW)],
      border: { pt: 0.5, color: 'CFCFCF' },
    },
  )

  // -------------------------------------------------------------------
  // Save the file
  // -------------------------------------------------------------------
  await pptx.writeFile({ fileName: 'presizion-sizing-report.pptx' })
}
