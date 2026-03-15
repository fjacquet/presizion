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
import { chartRefToDataUrl, type ChartCapture } from '@/lib/utils/chartCapture'

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
  titleSlide.addText('Presizion', {
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
  const compHeaderRow = [
    { text: 'Metric', options: { bold: true, fill: { color: BLUE }, color: WHITE, fontSize: 10 } },
    ...scenarios.map((s) => ({
      text: s.name,
      options: { bold: true, fill: { color: BLUE }, color: WHITE, fontSize: 10 },
    })),
  ]

  const metrics: Array<{ label: string; values: (s: Scenario, r: ScenarioResult) => string }> = [
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

  const compDataRows = metrics.map((m, rowIdx) => {
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
    [compHeaderRow, ...compDataRows],
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
