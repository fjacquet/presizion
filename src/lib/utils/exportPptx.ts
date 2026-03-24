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
const GREEN = '22C55E'
const AMBER = 'F59E0B'
const DARK = '1F2937'
const GRAY = '6B7280'
const LIGHT_GRAY = 'F3F4F6'
const WHITE = 'FFFFFF'
const NAVY = '1E3A5F'
const UTIL_GREEN = '22C55E'
const UTIL_AMBER = 'F59E0B'
const UTIL_RED = 'EF4444'
const KPI_FILL = 'E8EDF2'
const FONT = 'Calibri'

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

/** Default text options for consistency */
const TITLE_OPTS = { placeholder: 'title', fontSize: 22, bold: true, color: NAVY, fontFace: FONT } as const
const SUBTITLE_OPTS = { x: 0.5, y: 0.65, w: 12, h: 0.3, fontSize: 11, color: GRAY, fontFace: FONT } as const

/** Cell styling helpers */
function headerCell(text: string) {
  return { text, options: { bold: true, fill: { color: NAVY }, color: WHITE, fontSize: 10, fontFace: FONT } }
}
function _grayHeaderCell(text: string) {
  return { text, options: { bold: true, fill: { color: GRAY }, color: WHITE, fontSize: 10, fontFace: FONT } }
}
void _grayHeaderCell // suppress unused warning
function dataCell(text: string, rowIdx: number, bold = false) {
  return { text, options: { fill: { color: rowIdx % 2 === 0 ? LIGHT_GRAY : WHITE }, fontSize: 10, fontFace: FONT, bold } }
}

/** Returns a color hex string based on utilization percentage thresholds */
function utilColorDot(pct: number): string {
  if (pct < 70) return UTIL_GREEN
  if (pct <= 85) return UTIL_AMBER
  return UTIL_RED
}

/** Table cell with colored utilization dot prefix (TextProps[] style) */
function utilCell(pct: number, rowIdx: number) {
  return {
    text: [
      { text: '\u25CF ', options: { color: utilColorDot(pct), fontSize: 10, fontFace: FONT } },
      { text: `${pct.toFixed(1)}%`, options: { color: DARK, fontSize: 10, fontFace: FONT } },
    ],
    options: { fill: { color: rowIdx % 2 === 0 ? LIGHT_GRAY : WHITE } },
  }
}

/** Plain table cell with alternating row fill (used when util value is undefined) */
function plainCell(text: string, rowIdx: number) {
  return { text, options: { fill: { color: rowIdx % 2 === 0 ? LIGHT_GRAY : WHITE }, fontSize: 10, fontFace: FONT } }
}

/** Add consistent footer: logo hint, date, slide number */
let _slideNum = 0
function addFooter(slide: { addText: (t: string | Array<{text: string; options?: Record<string, unknown>}>, o: Record<string, unknown>) => void }, date: string) {
  _slideNum++
  slide.addText(
    [
      { text: 'Presizion', options: { bold: true, color: BLUE, fontSize: 7, fontFace: FONT } },
      { text: `  |  ${date}  |  Slide ${_slideNum}`, options: { color: GRAY, fontSize: 7, fontFace: FONT } },
    ],
    { x: 0.5, y: 7.05, w: 12, h: 0.3 },
  )
}

/** Add a large KPI callout number at the top of a slide using rounded-rectangle shape backgrounds */
function addKpiCallout(
  slide: { addText: (t: string, o: Record<string, unknown>) => void },
  items: Array<{ value: string; label: string }>,
  y = 0.9,
) {
  const colW = 12.33 / items.length
  items.forEach((item, i) => {
    const x = 0.5 + i * colW
    slide.addText(item.value, {
      x, y, w: colW * 0.85, h: 0.75,
      shape: 'roundRect',
      rectRadius: 0.3,
      fill: { color: KPI_FILL },
      fontSize: 44, bold: true, color: NAVY, fontFace: FONT, align: 'center', valign: 'middle',
    })
    slide.addText(item.label, {
      x, y: y + 0.8, w: colW, h: 0.3,
      fontSize: 11, color: GRAY, fontFace: FONT, align: 'center',
    })
  })
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

  const dateStr = new Date().toLocaleDateString()
  _slideNum = 0 // reset counter

  // 3a. Define slide masters with semantic placeholders
  // Styling is minimal here — applied via addText props for flexibility
  pptx.defineSlideMaster({
    title: 'TITLE_SLIDE',
    background: { color: NAVY },
    objects: [
      { placeholder: { options: { name: 'title', type: 'title', x: 0.5, y: 2.2, w: 12, h: 1.2 }, text: '' } },
      { placeholder: { options: { name: 'body', type: 'body', x: 0.5, y: 3.5, w: 12, h: 0.6 }, text: '' } },
    ],
  })

  pptx.defineSlideMaster({
    title: 'CONTENT_SLIDE',
    background: { color: WHITE },
    objects: [
      { rect: { x: 0, y: 0, w: 0.3, h: 7.5, fill: { color: NAVY }, line: { color: NAVY } } },
      { placeholder: { options: { name: 'title', type: 'title', x: 0.65, y: 0.2, w: 11.85, h: 0.6 }, text: '' } },
    ],
  })

  // -------------------------------------------------------------------
  // Slide 1: Title (dark navy background)
  // -------------------------------------------------------------------
  const titleSlide = pptx.addSlide({ masterName: 'TITLE_SLIDE' })

  // Logo
  try {
    const logoUrl = await getLogoDataUrl()
    if (logoUrl) {
      titleSlide.addImage({ data: logoUrl, x: 0.5, y: 0.8, w: 4, h: 1 })
    }
  } catch { /* logo is optional */ }

  titleSlide.addText('Cluster Sizing Report', {
    placeholder: 'title', fontSize: 40, bold: true, color: WHITE, fontFace: FONT,
  })
  titleSlide.addText(
    `${cluster.totalVms} VMs  |  ${cluster.totalVcpus} vCPUs  |  ${cluster.totalPcores} pCores  |  ${scenarios.length} scenario${scenarios.length > 1 ? 's' : ''}`,
    { placeholder: 'body', fontSize: 16, color: LIGHT_GRAY, fontFace: FONT },
  )
  titleSlide.addText(dateStr, {
    x: 0.5, y: 4.5, w: '90%', fontSize: 12, color: GRAY, fontFace: FONT,
  })

  // -------------------------------------------------------------------
  // Slide 2: Executive Summary
  // -------------------------------------------------------------------
  const summarySlide = pptx.addSlide({ masterName: 'CONTENT_SLIDE' })
  summarySlide.addText('Executive Summary', { placeholder: 'title', fontSize: 22, bold: true, color: NAVY, fontFace: FONT })

  const summaryHeaderRow = [
    { text: 'Scenario', options: { bold: true, fill: { color: NAVY }, color: WHITE, fontSize: 11 } },
    { text: 'Servers', options: { bold: true, fill: { color: NAVY }, color: WHITE, fontSize: 11 } },
    { text: 'Limiting Resource', options: { bold: true, fill: { color: NAVY }, color: WHITE, fontSize: 11 } },
    { text: 'CPU Util %', options: { bold: true, fill: { color: NAVY }, color: WHITE, fontSize: 11 } },
    { text: 'RAM Util %', options: { bold: true, fill: { color: NAVY }, color: WHITE, fontSize: 11 } },
  ]

  const summaryDataRows = scenarios.map((s, i) => {
    const r = results[i]
    const fillColor = i % 2 === 0 ? LIGHT_GRAY : WHITE
    return [
      { text: s.name, options: { fill: { color: fillColor }, fontSize: 10 } },
      { text: r ? String(r.finalCount) : '-', options: { fill: { color: fillColor }, fontSize: 10 } },
      { text: r ? r.limitingResource : '-', options: { fill: { color: fillColor }, fontSize: 10 } },
      r ? utilCell(r.cpuUtilizationPercent, i) : plainCell('-', i),
      r ? utilCell(r.ramUtilizationPercent, i) : plainCell('-', i),
    ]
  })

  // KPI callouts for key numbers
  const bestResult = results[0]
  if (bestResult) {
    addKpiCallout(summarySlide, [
      { value: String(cluster.existingServerCount ?? '?'), label: 'As-Is Servers' },
      { value: String(bestResult.finalCount), label: `${scenarios[0]?.name ?? 'Target'} Servers` },
      { value: `${bestResult.cpuUtilizationPercent.toFixed(0)}%`, label: 'CPU Utilization' },
      { value: `${bestResult.ramUtilizationPercent.toFixed(0)}%`, label: 'RAM Utilization' },
    ])
  }

  summarySlide.addTable(
    [summaryHeaderRow, ...summaryDataRows],
    {
      x: 0.5,
      y: 2.2,
      w: 12,
      colW: [4, 2, 2.5, 1.75, 1.75],
      border: { pt: 0.5, color: 'CFCFCF' },
    },
  )
  addFooter(summarySlide, dateStr)

  // -------------------------------------------------------------------
  // Slide 3: As-Is vs To-Be Comparison
  // -------------------------------------------------------------------
  const comparisonSlide = pptx.addSlide({ masterName: 'CONTENT_SLIDE' })
  comparisonSlide.addText('As-Is vs To-Be Comparison', { placeholder: 'title', fontSize: 22, bold: true, color: NAVY, fontFace: FONT })

  const asIsServerConfig =
    cluster.socketsPerServer && cluster.coresPerSocket
      ? `${cluster.socketsPerServer}s x ${cluster.coresPerSocket}c`
      : '--'

  const asIsPcores = String(cluster.totalPcores)

  const asIsRatio =
    cluster.totalPcores > 0
      ? `${(cluster.totalVcpus / cluster.totalPcores).toFixed(1)}:1`
      : '--'

  const asIsVmsPerServer =
    cluster.existingServerCount && cluster.existingServerCount > 0
      ? (cluster.totalVms / cluster.existingServerCount).toFixed(1)
      : '--'

  const asIsTotalDisk =
    cluster.totalDiskGb !== undefined
      ? `${(cluster.totalDiskGb / 1024).toFixed(1)} TiB`
      : '--'

  const avgVcpuPerVm =
    cluster.totalVms > 0
      ? (cluster.totalVcpus / cluster.totalVms).toFixed(1)
      : '--'

  const avgRamPerVm =
    cluster.avgRamPerVmGb != null
      ? cluster.avgRamPerVmGb.toFixed(1)
      : '--'

  const avgDiskPerVm =
    cluster.totalDiskGb != null && cluster.totalVms > 0
      ? (cluster.totalDiskGb / cluster.totalVms).toFixed(1)
      : '--'

  const compHeaderRow = [
    { text: 'Metric', options: { bold: true, fill: { color: NAVY }, color: WHITE, fontSize: 10 } },
    { text: 'As-Is', options: { bold: true, fill: { color: NAVY }, color: WHITE, fontSize: 10 } },
    ...scenarios.map((s) => ({
      text: s.name,
      options: { bold: true, fill: { color: NAVY }, color: WHITE, fontSize: 10 },
    })),
  ]

  type TableCellObj = { text: string | Array<{text: string; options?: Record<string, unknown>}>; options: Record<string, unknown> }
  interface CompMetric {
    readonly label: string
    readonly asIs: string | TableCellObj
    readonly scenarioValues: readonly (string | TableCellObj)[]
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
      scenarioValues: results.map((r) => `${r.achievedVcpuToPCoreRatio.toFixed(1)}:1`),
    },
    {
      label: 'VMs/Server',
      asIs: asIsVmsPerServer,
      scenarioValues: results.map((r) => r.vmsPerServer.toFixed(1)),
    },
    {
      label: 'Avg vCPU/VM',
      asIs: avgVcpuPerVm,
      scenarioValues: scenarios.map(() => avgVcpuPerVm),
    },
    {
      label: 'Avg RAM/VM (GiB)',
      asIs: avgRamPerVm,
      scenarioValues: scenarios.map((s) => s.ramPerVmGb.toFixed(1)),
    },
    {
      label: 'Avg Disk/VM (GiB)',
      asIs: avgDiskPerVm,
      scenarioValues: scenarios.map((s) => s.diskPerVmGb.toFixed(1)),
    },
    {
      label: 'Headroom %',
      asIs: 'N/A',
      scenarioValues: scenarios.map((s) => `${s.headroomPercent}%`),
    },
    {
      label: 'CPU Util %',
      asIs: cluster.cpuUtilizationPercent !== undefined
        ? utilCell(cluster.cpuUtilizationPercent, 10)
        : plainCell('--', 10),
      scenarioValues: results.map((r) => utilCell(r.cpuUtilizationPercent, 10)),
    },
    {
      label: 'RAM Util %',
      asIs: cluster.ramUtilizationPercent !== undefined
        ? utilCell(cluster.ramUtilizationPercent, 11)
        : plainCell('--', 11),
      scenarioValues: results.map((r) => utilCell(r.ramUtilizationPercent, 11)),
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
    const asIsCell = typeof m.asIs === 'string'
      ? { text: m.asIs, options: { fill: { color: fillColor }, fontSize: 10 } }
      : m.asIs
    return [
      { text: m.label, options: { bold: true, fill: { color: fillColor }, fontSize: 10 } },
      asIsCell,
      ...m.scenarioValues.map((v) =>
        typeof v === 'string'
          ? { text: v, options: { fill: { color: fillColor }, fontSize: 10 } }
          : v,
      ),
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
  addFooter(comparisonSlide, dateStr)

  // -------------------------------------------------------------------
  // Slide 4: Sizing Assumptions
  // -------------------------------------------------------------------
  const assumptionsSlide = pptx.addSlide({ masterName: 'CONTENT_SLIDE' })
  assumptionsSlide.addText('Sizing Assumptions', { placeholder: 'title', fontSize: 22, bold: true, color: NAVY, fontFace: FONT })

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
      values: scenarios.map((s) => `${s.targetVcpuToPCoreRatio.toFixed(1)}:1`),
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
    const growthSlide = pptx.addSlide({ masterName: 'CONTENT_SLIDE' })
    growthSlide.addText('Growth Projections', { placeholder: 'title', fontSize: 22, bold: true, color: NAVY, fontFace: FONT })

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
  addFooter(assumptionsSlide, dateStr)

  // -------------------------------------------------------------------
  // Slide 5: Per-Scenario Server Configuration
  // -------------------------------------------------------------------
  const serverConfigSlide = pptx.addSlide({ masterName: 'CONTENT_SLIDE' })
  serverConfigSlide.addText('Per-Scenario Server Configuration', { placeholder: 'title', fontSize: 22, bold: true, color: NAVY, fontFace: FONT })

  const scHeader = [
    { text: 'Parameter', options: { bold: true, fill: { color: NAVY }, color: WHITE, fontSize: 10 } },
    ...scenarios.map((s) => ({
      text: s.name,
      options: { bold: true, fill: { color: NAVY }, color: WHITE, fontSize: 10 },
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
  addFooter(serverConfigSlide, dateStr)

  // -------------------------------------------------------------------
  // Per-scenario slides: Capacity Breakdown Table + Charts
  // -------------------------------------------------------------------
  scenarios.forEach((scenario, i) => {
    const bd = breakdowns[i]
    const charts = allCharts[i]

    // -- Capacity Breakdown Table slide --
    if (bd) {
      const bdSlide = pptx.addSlide({ masterName: 'CONTENT_SLIDE' })
      bdSlide.addText(`Capacity Breakdown -- ${scenario.name}`, {
        placeholder: 'title', fontSize: 20, bold: true, color: NAVY, fontFace: FONT,
      })

      const bdHeaderRow = [
        { text: 'Resource', options: { bold: true, fill: { color: NAVY }, color: WHITE, fontSize: 10 } },
        { text: 'Required', options: { bold: true, fill: { color: NAVY }, color: WHITE, fontSize: 10 } },
        { text: 'Spare', options: { bold: true, fill: { color: NAVY }, color: WHITE, fontSize: 10 } },
        { text: 'Excess', options: { bold: true, fill: { color: NAVY }, color: WHITE, fontSize: 10 } },
        { text: 'Total Configured', options: { bold: true, fill: { color: NAVY }, color: WHITE, fontSize: 10 } },
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
      addFooter(bdSlide, dateStr)
    }

    // -- Capacity Chart slide (1 per scenario) --
    if (charts?.capacity && bd) {
      const capSlide = pptx.addSlide({ masterName: 'CONTENT_SLIDE' })
      capSlide.addText(`Capacity Breakdown -- ${scenario.name}`, { ...TITLE_OPTS })

      // Legend: colored squares + labels
      const legendItems = [
        { label: 'Required', color: BLUE },
        { label: 'Spare', color: GREEN },
        { label: 'Excess', color: AMBER },
      ]
      legendItems.forEach((item, li) => {
        const lx = 0.5 + li * 2.2
        // Color square for legend — use a tiny table cell as shape workaround
      capSlide.addText('', { x: lx, y: 0.62, w: 0.2, h: 0.2, fill: { color: item.color } })
        capSlide.addText(item.label, { x: lx + 0.25, y: 0.6, w: 1.5, fontSize: 10, color: DARK, fontFace: FONT })
      })

      // Chart image
      const imgW = 11.5
      const imgH = (charts.capacity.height / charts.capacity.width) * imgW
      capSlide.addImage({
        data: toPptxData(charts.capacity.dataUrl),
        x: 0.7,
        y: 1.0,
        w: imgW,
        h: Math.min(imgH, 3.5),
      })

      // Absolute values table below chart
      const tableY = 1.0 + Math.min(imgH, 3.5) + 0.2
      const capTableHeader = [
        headerCell('Resource'),
        headerCell('Required'),
        headerCell('Spare'),
        headerCell('Excess'),
        headerCell('Total'),
      ]
      const capTableRows = [
        ['CPU GHz', f1(bd.cpu.required), f1(bd.cpu.spare), f1(bd.cpu.excess), f1(bd.cpu.total)],
        ['Memory GiB', f1(bd.memory.required), f1(bd.memory.spare), f1(bd.memory.excess), f1(bd.memory.total)],
        ['Raw Storage TiB', f1(bd.storage.required / 1024), f1(bd.storage.spare / 1024), f1(bd.storage.excess / 1024), f1(bd.storage.total / 1024)],
      ].map((cells, ri) => cells.map((c, ci) => dataCell(c, ri, ci === 0)))

      capSlide.addTable([capTableHeader, ...capTableRows], {
        x: 0.5, y: tableY, w: 12,
        colW: [3, 2.25, 2.25, 2.25, 2.25],
        border: { pt: 0.5, color: 'CFCFCF' },
      })
      addFooter(capSlide, dateStr)
    }

    // -- Min Nodes Chart slide (1 per scenario) --
    if (charts?.minnodes && bd) {
      const mnSlide = pptx.addSlide({ masterName: 'CONTENT_SLIDE' })
      mnSlide.addText(`Minimum Nodes per Constraint -- ${scenario.name}`, { ...TITLE_OPTS })
      mnSlide.addText('The binding constraint determines the minimum cluster size.', { ...SUBTITLE_OPTS })

      // Chart image
      const imgW = 11.5
      const imgH = (charts.minnodes.height / charts.minnodes.width) * imgW
      mnSlide.addImage({
        data: toPptxData(charts.minnodes.dataUrl),
        x: 0.7,
        y: 1.0,
        w: imgW,
        h: Math.min(imgH, 3.5),
      })

      // Constraint table below
      const tableY = 1.0 + Math.min(imgH, 3.5) + 0.2
      const mnHeader = [headerCell('Constraint'), headerCell('Min Nodes'), headerCell('Binding?')]
      const constraints = Object.entries(bd.minNodesByConstraint)
      const maxNodes = Math.max(...constraints.map(([, v]) => v))
      const mnRows = constraints.map(([key, nodes], ri) => [
        dataCell(key.charAt(0).toUpperCase() + key.slice(1), ri, true),
        dataCell(String(nodes), ri),
        dataCell(nodes === maxNodes && nodes > 0 ? 'Yes' : '', ri, nodes === maxNodes && nodes > 0),
      ])

      mnSlide.addTable([mnHeader, ...mnRows], {
        x: 0.5, y: tableY, w: 8,
        colW: [3, 2.5, 2.5],
        border: { pt: 0.5, color: 'CFCFCF' },
      })
      addFooter(mnSlide, dateStr)
    }
  })

  // -------------------------------------------------------------------
  // Final slide: Scenario Comparison
  // -------------------------------------------------------------------
  const compSlide = pptx.addSlide({ masterName: 'CONTENT_SLIDE' })
  compSlide.addText('Scenario Comparison', { placeholder: 'title', fontSize: 22, bold: true, color: NAVY, fontFace: FONT })

  // Build comparison table: first column = metric, then one column per scenario
  const finalCompHeader = [
    { text: 'Metric', options: { bold: true, fill: { color: NAVY }, color: WHITE, fontSize: 10 } },
    ...scenarios.map((s) => ({
      text: s.name,
      options: { bold: true, fill: { color: NAVY }, color: WHITE, fontSize: 10 },
    })),
  ]

  type FinalCellValue = string | { text: string | Array<{text: string; options?: Record<string, unknown>}>; options: Record<string, unknown> }
  const finalMetrics: Array<{ label: string; values: (s: Scenario, r: ScenarioResult, rowIdx: number) => FinalCellValue }> = [
    { label: 'Servers Required', values: (_s, r) => String(r.finalCount) },
    { label: 'Server Config', values: (s) => `${s.socketsPerServer}S x ${s.coresPerSocket}C` },
    { label: 'Total pCores', values: (s, r) => String(r.finalCount * s.socketsPerServer * s.coresPerSocket) },
    { label: 'Limiting Resource', values: (_s, r) => r.limitingResource },
    { label: 'vCPU:pCore Ratio', values: (_s, r) => `${f2(r.achievedVcpuToPCoreRatio)}:1` },
    { label: 'VMs/Server', values: (_s, r) => f2(r.vmsPerServer) },
    { label: 'CPU Util %', values: (_s, r, ri) => utilCell(r.cpuUtilizationPercent, ri) },
    { label: 'RAM Util %', values: (_s, r, ri) => utilCell(r.ramUtilizationPercent, ri) },
    { label: 'Disk Util %', values: (_s, r, ri) => utilCell(r.diskUtilizationPercent, ri) },
  ]

  const finalCompRows = finalMetrics.map((m, rowIdx) => {
    const fillColor = rowIdx % 2 === 0 ? LIGHT_GRAY : WHITE
    return [
      { text: m.label, options: { bold: true, fill: { color: fillColor }, fontSize: 10 } },
      ...scenarios.map((s, j) => {
        const r = results[j]
        if (!r) return { text: '-', options: { fill: { color: fillColor }, fontSize: 10 } }
        const val = m.values(s, r, rowIdx)
        return typeof val === 'string'
          ? { text: val, options: { fill: { color: fillColor }, fontSize: 10 } }
          : val
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
  addFooter(compSlide, dateStr)

  // -------------------------------------------------------------------
  // Save the file
  // -------------------------------------------------------------------
  await pptx.writeFile({ fileName: 'presizion-sizing-report.pptx' })
}
