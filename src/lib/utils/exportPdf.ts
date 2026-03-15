/**
 * PDF export utility for Presizion cluster sizing reports.
 *
 * Lazy-loads jsPDF and jspdf-autotable only when exportPdf() is called,
 * keeping them out of the main bundle (PDF-03).
 *
 * Generated report contains:
 *  - Title page with cluster summary
 *  - Executive summary table (one row per scenario)
 *  - As-Is vs To-Be comparison table
 *  - Sizing assumptions recap (general, vSAN settings, growth projections)
 *  - Per-scenario server configuration table
 *  - Per-scenario capacity breakdown tables + chart images
 *
 * Requirements: PDF-01, PDF-02, PDF-03, PDF-05
 */

import type { OldCluster, Scenario } from '@/types/cluster'
import type { ScenarioResult, LimitingResource } from '@/types/results'
import type { VsanCapacityBreakdown } from '@/types/breakdown'
import { FTT_POLICY_MAP } from '@/lib/sizing/vsanConstants'
import { chartRefToDataUrl, type ChartCapture } from './chartCapture'
import { getLogoDataUrl } from './logoDataUrl'

/** Human-readable labels for limiting resources */
const RESOURCE_LABELS: Record<LimitingResource, string> = {
  cpu: 'CPU',
  ram: 'RAM',
  disk: 'Disk',
  specint: 'SPECrate',
  ghz: 'GHz',
}

/** jsPDF document with lastAutoTable property added by jspdf-autotable */
interface JsPdfWithAutoTable {
  readonly lastAutoTable?: { readonly finalY?: number }
}

/**
 * Generates a multi-page PDF sizing report and triggers a browser download.
 *
 * @param cluster    - The existing cluster metrics (As-Is)
 * @param scenarios  - Target scenarios being compared
 * @param results    - Computed ScenarioResult for each scenario (parallel array)
 * @param breakdowns - VsanCapacityBreakdown for each scenario (parallel array)
 * @param chartRefs  - Map of chart container elements keyed by "capacity-{id}" / "minnodes-{id}"
 */
export async function exportPdf(
  cluster: OldCluster,
  scenarios: readonly Scenario[],
  results: readonly ScenarioResult[],
  breakdowns: readonly VsanCapacityBreakdown[],
  chartRefs: Record<string, HTMLDivElement | null>,
): Promise<void> {
  // 1. Lazy-load jsPDF and jspdf-autotable
  const [jspdfModule, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const { jsPDF } = jspdfModule
  const { autoTable } = autoTableModule

  // 2. Capture chart images before building PDF
  const chartCaptures = new Map<string, ChartCapture>()
  const capturePromises: Promise<void>[] = []

  for (const scenario of scenarios) {
    for (const prefix of ['capacity', 'minnodes']) {
      const key = `${prefix}-${scenario.id}`
      const ref = chartRefs[key] ?? null
      capturePromises.push(
        chartRefToDataUrl(ref).then((capture) => {
          if (capture) {
            chartCaptures.set(key, capture)
          }
        }),
      )
    }
  }
  await Promise.all(capturePromises)

  // 3. Create document
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const PAGE_W = doc.internal.pageSize.getWidth()
  const PAGE_H = doc.internal.pageSize.getHeight()
  const MARGIN = 14
  const CONTENT_W = PAGE_W - 2 * MARGIN
  let y = MARGIN

  /** Add a new page if remaining space is insufficient */
  function ensureSpace(needed: number): void {
    if (y + needed > PAGE_H - MARGIN) {
      doc.addPage()
      y = MARGIN
    }
  }

  /** Get finalY from the last autoTable call */
  function getLastAutoTableY(fallback: number): number {
    return (doc as unknown as JsPdfWithAutoTable).lastAutoTable?.finalY ?? fallback
  }

  // ── 4. Title page ──────────────────────────────────────────────────────

  // Logo
  try {
    const logoUrl = await getLogoDataUrl()
    if (logoUrl) {
      doc.addImage(logoUrl, 'PNG', PAGE_W / 2 - 40, 20, 80, 20, 'presizion-logo')
    }
  } catch { /* logo is optional — continue without it */ }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text('Cluster Sizing Report', PAGE_W / 2, 60, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, PAGE_W / 2, 75, { align: 'center' })

  y = 95
  doc.setFontSize(11)
  doc.text(`Total VMs: ${cluster.totalVms.toLocaleString()}`, MARGIN, y)
  y += 7
  doc.text(`Total vCPUs: ${cluster.totalVcpus.toLocaleString()}`, MARGIN, y)
  y += 7
  doc.text(`Total pCores: ${cluster.totalPcores.toLocaleString()}`, MARGIN, y)

  if (cluster.existingServerCount !== undefined) {
    y += 7
    doc.text(`Existing Servers: ${cluster.existingServerCount}`, MARGIN, y)
  }

  doc.addPage()
  y = MARGIN

  // ── 5. Executive summary table ─────────────────────────────────────────

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('Executive Summary', MARGIN, y)
  y += 8

  autoTable(doc, {
    startY: y,
    head: [['Scenario', 'Servers Required', 'Limiting Resource', 'CPU Util %', 'RAM Util %']],
    body: scenarios.map((s, i) => {
      const r = results[i]
      return [
        s.name,
        r ? String(r.finalCount) : '—',
        r ? RESOURCE_LABELS[r.limitingResource] : '—',
        r ? `${r.cpuUtilizationPercent.toFixed(1)}%` : '—',
        r ? `${r.ramUtilizationPercent.toFixed(1)}%` : '—',
      ]
    }),
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    margin: { left: MARGIN, right: MARGIN },
  })

  y = getLastAutoTableY(y + 20) + 10

  // ── 5b. As-Is vs To-Be Comparison Section ────────────────────────────

  ensureSpace(60)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('As-Is vs To-Be Comparison', MARGIN, y)
  y += 8

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

  const comparisonHead = ['Metric', 'As-Is', ...scenarios.map((s) => s.name)]

  const comparisonBody: string[][] = [
    [
      'Servers',
      cluster.existingServerCount !== undefined ? String(cluster.existingServerCount) : '--',
      ...results.map((r) => String(r.finalCount)),
    ],
    [
      'Server Config',
      asIsServerConfig,
      ...scenarios.map((s) => `${s.socketsPerServer}s x ${s.coresPerSocket}c`),
    ],
    [
      'Total pCores',
      asIsPcores,
      ...results.map((r, idx) => {
        const s = scenarios[idx]
        return s ? String(r.finalCount * s.socketsPerServer * s.coresPerSocket) : '--'
      }),
    ],
    [
      'Limiting Resource',
      'N/A',
      ...results.map((r) => RESOURCE_LABELS[r.limitingResource]),
    ],
    [
      'vCPU:pCore Ratio',
      asIsRatio,
      ...results.map((r) => r.achievedVcpuToPCoreRatio.toFixed(1)),
    ],
    [
      'VMs/Server',
      asIsVmsPerServer,
      ...results.map((r) => r.vmsPerServer.toFixed(1)),
    ],
    [
      'Headroom %',
      'N/A',
      ...scenarios.map((s) => `${s.headroomPercent}%`),
    ],
    [
      'CPU Util %',
      cluster.cpuUtilizationPercent !== undefined
        ? `${cluster.cpuUtilizationPercent.toFixed(1)}%`
        : '--',
      ...results.map((r) => `${r.cpuUtilizationPercent.toFixed(1)}%`),
    ],
    [
      'RAM Util %',
      cluster.ramUtilizationPercent !== undefined
        ? `${cluster.ramUtilizationPercent.toFixed(1)}%`
        : '--',
      ...results.map((r) => `${r.ramUtilizationPercent.toFixed(1)}%`),
    ],
    [
      'Total Disk',
      asIsTotalDisk,
      ...results.map((r, idx) => {
        const s = scenarios[idx]
        return s ? `${((r.finalCount * s.diskPerServerGb) / 1024).toFixed(1)} TiB` : '--'
      }),
    ],
  ]

  autoTable(doc, {
    startY: y,
    head: [comparisonHead],
    body: comparisonBody,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
    margin: { left: MARGIN, right: MARGIN },
  })

  y = getLastAutoTableY(y + 20) + 10

  // ── 5c. Assumptions Section ──────────────────────────────────────────

  ensureSpace(60)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('Sizing Assumptions', MARGIN, y)
  y += 8

  // General assumptions table
  const assumptionsHead = ['Parameter', ...scenarios.map((s) => s.name)]

  const assumptionsBody: string[][] = [
    [
      'vCPU:pCore Ratio',
      ...scenarios.map((s) => s.targetVcpuToPCoreRatio.toFixed(1)),
    ],
    [
      'Headroom %',
      ...scenarios.map((s) => `${s.headroomPercent}%`),
    ],
    [
      'HA Reserve',
      ...scenarios.map((s) => {
        if (s.haReserveCount === 0) return 'None'
        return `N+${s.haReserveCount}`
      }),
    ],
    [
      'RAM / VM (GB)',
      ...scenarios.map((s) => s.ramPerVmGb.toFixed(1)),
    ],
    [
      'Disk / VM (GB)',
      ...scenarios.map((s) => s.diskPerVmGb.toFixed(1)),
    ],
  ]

  autoTable(doc, {
    startY: y,
    head: [assumptionsHead],
    body: assumptionsBody,
    theme: 'grid',
    headStyles: { fillColor: [107, 114, 128] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
    margin: { left: MARGIN, right: MARGIN },
  })

  y = getLastAutoTableY(y + 20) + 10

  // vSAN assumptions (only if at least one scenario uses vSAN)
  const hasVsan = scenarios.some((s) => s.vsanFttPolicy !== undefined)
  if (hasVsan) {
    ensureSpace(50)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('vSAN Settings', MARGIN, y)
    y += 6

    const vsanHead = ['Parameter', ...scenarios.map((s) => s.name)]

    const vsanBody: string[][] = [
      [
        'FTT Policy',
        ...scenarios.map((s) =>
          s.vsanFttPolicy ? FTT_POLICY_MAP[s.vsanFttPolicy].label : 'N/A',
        ),
      ],
      [
        'Compression Factor',
        ...scenarios.map((s) =>
          s.vsanCompressionFactor !== undefined ? `${s.vsanCompressionFactor}x` : '1.0x',
        ),
      ],
      [
        'Slack %',
        ...scenarios.map((s) =>
          s.vsanSlackPercent !== undefined ? `${s.vsanSlackPercent}%` : '25%',
        ),
      ],
      [
        'CPU Overhead %',
        ...scenarios.map((s) =>
          s.vsanCpuOverheadPercent !== undefined ? `${s.vsanCpuOverheadPercent}%` : '10%',
        ),
      ],
      [
        'Memory / Host (GB)',
        ...scenarios.map((s) =>
          s.vsanMemoryPerHostGb !== undefined ? String(s.vsanMemoryPerHostGb) : '6',
        ),
      ],
      [
        'VM Swap',
        ...scenarios.map((s) =>
          s.vsanVmSwapEnabled ? 'Enabled' : 'Disabled (sparse)',
        ),
      ],
    ]

    autoTable(doc, {
      startY: y,
      head: [vsanHead],
      body: vsanBody,
      theme: 'grid',
      headStyles: { fillColor: [107, 114, 128] },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
      margin: { left: MARGIN, right: MARGIN },
    })

    y = getLastAutoTableY(y + 20) + 10
  }

  // Growth projections (only if at least one scenario has growth enabled)
  const hasGrowth = scenarios.some(
    (s) =>
      (s.cpuGrowthPercent !== undefined && s.cpuGrowthPercent > 0) ||
      (s.memoryGrowthPercent !== undefined && s.memoryGrowthPercent > 0) ||
      (s.storageGrowthPercent !== undefined && s.storageGrowthPercent > 0),
  )
  if (hasGrowth) {
    ensureSpace(40)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Growth Projections', MARGIN, y)
    y += 6

    const growthHead = ['Parameter', ...scenarios.map((s) => s.name)]

    const growthBody: string[][] = [
      [
        'CPU Growth %',
        ...scenarios.map((s) =>
          s.cpuGrowthPercent !== undefined ? `${s.cpuGrowthPercent}%` : '0%',
        ),
      ],
      [
        'Memory Growth %',
        ...scenarios.map((s) =>
          s.memoryGrowthPercent !== undefined ? `${s.memoryGrowthPercent}%` : '0%',
        ),
      ],
      [
        'Storage Growth %',
        ...scenarios.map((s) =>
          s.storageGrowthPercent !== undefined ? `${s.storageGrowthPercent}%` : '0%',
        ),
      ],
    ]

    autoTable(doc, {
      startY: y,
      head: [growthHead],
      body: growthBody,
      theme: 'grid',
      headStyles: { fillColor: [107, 114, 128] },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
      margin: { left: MARGIN, right: MARGIN },
    })

    y = getLastAutoTableY(y + 20) + 10
  }

  // ── 5d. Per-Scenario Server Configuration ────────────────────────────

  ensureSpace(50)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('Per-Scenario Server Configuration', MARGIN, y)
  y += 8

  const serverConfigHead = ['Parameter', ...scenarios.map((s) => s.name)]

  const serverConfigBody: string[][] = [
    [
      'Sockets / Server',
      ...scenarios.map((s) => String(s.socketsPerServer)),
    ],
    [
      'Cores / Socket',
      ...scenarios.map((s) => String(s.coresPerSocket)),
    ],
    [
      'Total Cores / Server',
      ...scenarios.map((s) => String(s.socketsPerServer * s.coresPerSocket)),
    ],
    [
      'RAM / Server (GB)',
      ...scenarios.map((s) => s.ramPerServerGb.toLocaleString()),
    ],
    [
      'Disk / Server (GB)',
      ...scenarios.map((s) => s.diskPerServerGb.toLocaleString()),
    ],
  ]

  autoTable(doc, {
    startY: y,
    head: [serverConfigHead],
    body: serverConfigBody,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
    margin: { left: MARGIN, right: MARGIN },
  })

  y = getLastAutoTableY(y + 20) + 10

  // ── 6. Per-scenario sections ───────────────────────────────────────────

  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i]
    const result = results[i]
    const breakdown = breakdowns[i]
    if (!scenario || !result) continue

    ensureSpace(60)

    // Section heading
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text(`Scenario: ${scenario.name}`, MARGIN, y)
    y += 8

    // Capacity breakdown table
    if (breakdown) {
      const cpuGhz = breakdown.cpu
      const mem = breakdown.memory
      const stor = breakdown.storage

      autoTable(doc, {
        startY: y,
        head: [['Resource', 'Required', 'Spare', 'Excess', 'Total Configured']],
        body: [
          [
            'CPU GHz',
            cpuGhz.required.toFixed(1),
            cpuGhz.spare.toFixed(1),
            cpuGhz.excess.toFixed(1),
            cpuGhz.total.toFixed(1),
          ],
          [
            'Memory GiB',
            mem.required.toFixed(1),
            mem.spare.toFixed(1),
            mem.excess.toFixed(1),
            mem.total.toFixed(1),
          ],
          [
            'Raw Storage TiB',
            (stor.required / 1024).toFixed(2),
            (stor.spare / 1024).toFixed(2),
            (stor.excess / 1024).toFixed(2),
            (stor.total / 1024).toFixed(2),
          ],
        ],
        theme: 'striped',
        headStyles: { fillColor: [107, 114, 128] },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
        margin: { left: MARGIN, right: MARGIN },
      })

      y = getLastAutoTableY(y + 20) + 10
    }

    // Chart images
    const capacityKey = `capacity-${scenario.id}`
    const capacityImg = chartCaptures.get(capacityKey)
    if (capacityImg) {
      const mmPerPx = CONTENT_W / capacityImg.width
      const imgH = capacityImg.height * mmPerPx
      ensureSpace(imgH + 5)
      doc.addImage(
        capacityImg.dataUrl, 'PNG',
        MARGIN, y, CONTENT_W, imgH,
        `capacity-chart-${i}`, 'FAST',
      )
      y += imgH + 5
    }

    const minnodesKey = `minnodes-${scenario.id}`
    const minnodesImg = chartCaptures.get(minnodesKey)
    if (minnodesImg) {
      const mmPerPx = CONTENT_W / minnodesImg.width
      const imgH = minnodesImg.height * mmPerPx
      ensureSpace(imgH + 5)
      doc.addImage(
        minnodesImg.dataUrl, 'PNG',
        MARGIN, y, CONTENT_W, imgH,
        `minnodes-chart-${i}`, 'FAST',
      )
      y += imgH + 5
    }
  }

  // ── 7. Scenario Comparison table (kept for backward-compat layout) ────

  // NOTE: The detailed As-Is vs To-Be comparison is in section 5b above.
  // This final comparison table provides a concise side-by-side recap.

  // ── 8. Save ────────────────────────────────────────────────────────────

  doc.save('presizion-sizing-report.pdf')
}
