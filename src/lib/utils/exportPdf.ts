/**
 * PDF export utility for Presizion cluster sizing reports.
 *
 * Lazy-loads jsPDF and jspdf-autotable only when exportPdf() is called,
 * keeping them out of the main bundle (PDF-03).
 *
 * Generated report contains:
 *  - Title page with cluster summary
 *  - Executive summary table (one row per scenario)
 *  - Per-scenario capacity breakdown tables + chart images
 *  - Scenario comparison table
 *
 * Requirements: PDF-01, PDF-02, PDF-03, PDF-05
 */

import type { OldCluster, Scenario } from '@/types/cluster'
import type { ScenarioResult, LimitingResource } from '@/types/results'
import type { VsanCapacityBreakdown } from '@/types/breakdown'
import { chartRefToDataUrl, type ChartCapture } from './chartCapture'

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

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text('Presizion -- Cluster Sizing Report', PAGE_W / 2, 60, { align: 'center' })

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

  // ── 7. Comparison table ────────────────────────────────────────────────

  ensureSpace(40)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('Scenario Comparison', MARGIN, y)
  y += 8

  const compHead = ['Metric', 'As-Is', ...scenarios.map((s) => s.name)]

  const asIsServerConfig =
    cluster.socketsPerServer && cluster.coresPerSocket
      ? `${cluster.socketsPerServer}s x ${cluster.coresPerSocket}c`
      : '—'

  const asIsPcores = String(cluster.totalPcores)

  const asIsRatio =
    cluster.totalPcores > 0
      ? (cluster.totalVcpus / cluster.totalPcores).toFixed(1)
      : '—'

  const asIsVmsPerServer =
    cluster.existingServerCount && cluster.existingServerCount > 0
      ? (cluster.totalVms / cluster.existingServerCount).toFixed(1)
      : '—'

  const compBody: string[][] = [
    // Servers Required
    [
      'Servers Required',
      cluster.existingServerCount !== undefined ? String(cluster.existingServerCount) : '—',
      ...results.map((r) => String(r.finalCount)),
    ],
    // Server Config
    [
      'Server Config',
      asIsServerConfig,
      ...scenarios.map((s) => `${s.socketsPerServer}s x ${s.coresPerSocket}c`),
    ],
    // Total pCores
    [
      'Total pCores',
      asIsPcores,
      ...results.map((r, i) => {
        const s = scenarios[i]
        return s ? String(r.finalCount * s.socketsPerServer * s.coresPerSocket) : '—'
      }),
    ],
    // Limiting Resource
    [
      'Limiting Resource',
      'N/A',
      ...results.map((r) => RESOURCE_LABELS[r.limitingResource]),
    ],
    // vCPU:pCore Ratio
    [
      'vCPU:pCore Ratio',
      asIsRatio,
      ...results.map((r) => r.achievedVcpuToPCoreRatio.toFixed(1)),
    ],
    // VMs/Server
    [
      'VMs/Server',
      asIsVmsPerServer,
      ...results.map((r) => r.vmsPerServer.toFixed(1)),
    ],
    // Headroom %
    [
      'Headroom %',
      'N/A',
      ...scenarios.map((s) => `${s.headroomPercent}%`),
    ],
    // CPU Util %
    [
      'CPU Util %',
      cluster.cpuUtilizationPercent !== undefined
        ? `${cluster.cpuUtilizationPercent.toFixed(1)}%`
        : '—',
      ...results.map((r) => `${r.cpuUtilizationPercent.toFixed(1)}%`),
    ],
    // RAM Util %
    [
      'RAM Util %',
      cluster.ramUtilizationPercent !== undefined
        ? `${cluster.ramUtilizationPercent.toFixed(1)}%`
        : '—',
      ...results.map((r) => `${r.ramUtilizationPercent.toFixed(1)}%`),
    ],
    // Disk Util %
    [
      'Disk Util %',
      '—',
      ...results.map((r) => `${r.diskUtilizationPercent.toFixed(1)}%`),
    ],
  ]

  autoTable(doc, {
    startY: y,
    head: [compHead],
    body: compBody,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
    margin: { left: MARGIN, right: MARGIN },
  })

  // ── 8. Save ────────────────────────────────────────────────────────────

  doc.save('presizion-sizing-report.pdf')
}
