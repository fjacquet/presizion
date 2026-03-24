/**
 * exportPptx — Unit tests
 * Requirements: PPTX-01, PPTX-02, PPTX-03
 *
 * Mocks pptxgenjs so tests run without a real PPTX library.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { OldCluster, Scenario } from '@/types/cluster'
import type { ScenarioResult } from '@/types/results'
import type { VsanCapacityBreakdown, ResourceBreakdown, StorageBreakdown } from '@/types/breakdown'

// ---------------------------------------------------------------------------
// Mock pptxgenjs
// ---------------------------------------------------------------------------
const mockWriteFile = vi.fn().mockResolvedValue('ok')
const mockAddText = vi.fn().mockReturnThis()
const mockAddTable = vi.fn().mockReturnThis()
const mockAddImage = vi.fn().mockReturnThis()
const mockDefineSlideMaster = vi.fn()
const mockAddSlide = vi.fn().mockReturnValue({
  addText: mockAddText,
  addTable: mockAddTable,
  addImage: mockAddImage,
})

vi.mock('pptxgenjs', () => {
  class MockPptxGenJS {
    layout = ''
    author = ''
    title = ''
    addSlide = mockAddSlide
    writeFile = mockWriteFile
    defineSlideMaster = mockDefineSlideMaster
  }
  return { default: MockPptxGenJS }
})

// Mock chartRefToDataUrl to return null (no DOM in test env)
vi.mock('@/lib/utils/chartCapture', () => ({
  chartRefToDataUrl: vi.fn().mockResolvedValue(null),
}))

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const cluster: OldCluster = {
  totalVcpus: 2000,
  totalPcores: 500,
  totalVms: 300,
}

const scenario: Scenario = {
  id: 'a',
  name: 'Test Scenario',
  socketsPerServer: 2,
  coresPerSocket: 24,
  ramPerServerGb: 512,
  diskPerServerGb: 20000,
  targetVcpuToPCoreRatio: 4,
  ramPerVmGb: 16,
  diskPerVmGb: 100,
  headroomPercent: 20,
  haReserveCount: 0 as const,
}

const result: ScenarioResult = {
  cpuLimitedCount: 14,
  ramLimitedCount: 10,
  diskLimitedCount: 2,
  rawCount: 14,
  requiredCount: 14,
  finalCount: 14,
  limitingResource: 'cpu',
  haReserveCount: 0,
  haReserveApplied: false,
  achievedVcpuToPCoreRatio: 2.98,
  vmsPerServer: 21.43,
  cpuUtilizationPercent: 74.4,
  ramUtilizationPercent: 67.2,
  diskUtilizationPercent: 10.7,
}

const resourceBd: ResourceBreakdown = {
  vmsRequired: 100,
  vsanConsumption: 0,
  required: 100,
  reservedMaxUtil: 20,
  haReserve: 0,
  spare: 20,
  excess: 10,
  total: 130,
}

const storageBd: StorageBreakdown = {
  ...resourceBd,
  required: 102400,
  spare: 20480,
  excess: 10240,
  total: 133120,
  usableRequired: 80000,
  swapOverhead: 0,
  metadataOverhead: 2400,
  fttOverhead: 20000,
  rawRequired: 102400,
  slackSpace: 20480,
}

const breakdown: VsanCapacityBreakdown = {
  scenarioId: 'a',
  cpu: resourceBd,
  memory: resourceBd,
  storage: storageBd,
  minNodesByConstraint: { cpu: 14, memory: 10, storage: 2 },
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
})

describe('exportPptx', () => {
  it('is a function that can be imported', async () => {
    const { exportPptx } = await import('../exportPptx')
    expect(typeof exportPptx).toBe('function')
  })

  it('calls pptxgenjs writeFile when invoked with valid data', async () => {
    const { exportPptx } = await import('../exportPptx')
    await exportPptx(cluster, [scenario], [result], [breakdown], {})
    expect(mockWriteFile).toHaveBeenCalledWith({
      fileName: 'presizion-sizing-report.pptx',
    })
  })

  it('does not throw when called with empty scenarios', async () => {
    const { exportPptx } = await import('../exportPptx')
    await expect(exportPptx(cluster, [], [], [], {})).resolves.toBeUndefined()
  })

  it('creates multiple slides (title + summary + comparison + sizing params = at least 4)', async () => {
    const { exportPptx } = await import('../exportPptx')
    await exportPptx(cluster, [scenario], [result], [breakdown], {})
    // Title + Summary + As-Is vs To-Be Comparison + Sizing Parameters = exactly 4 slides
    // No chart slides since chartRefToDataUrl returns null, no bdSlide or compSlide
    expect(mockAddSlide.mock.calls.length).toBe(4)
  })

  it('generates a table on the executive summary slide', async () => {
    const { exportPptx } = await import('../exportPptx')
    await exportPptx(cluster, [scenario], [result], [breakdown], {})
    // addTable should be called at least once (summary, breakdown, comparison)
    expect(mockAddTable).toHaveBeenCalled()
  })

  it('includes scenario name in table data', async () => {
    const { exportPptx } = await import('../exportPptx')
    await exportPptx(cluster, [scenario], [result], [breakdown], {})
    // Find a call that includes the scenario name
    const allCalls = mockAddTable.mock.calls as Array<[Array<Array<{ text: string }>>, unknown]>
    const hasScenarioName = allCalls.some(([rows]) =>
      rows.some((row) => row.some((cell) => cell.text === 'Test Scenario')),
    )
    expect(hasScenarioName).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // VISUAL-01: Accent strip in CONTENT_SLIDE master definition
  // ---------------------------------------------------------------------------
  it('defines CONTENT_SLIDE master with navy accent strip rect', async () => {
    const { exportPptx } = await import('../exportPptx')
    await exportPptx(cluster, [scenario], [result], [breakdown], {})
    const dsmCalls = mockDefineSlideMaster.mock.calls as Array<[{ title: string; objects: Array<Record<string, unknown>> }]>
    const contentCall = dsmCalls.find((c) => c[0]?.title === 'CONTENT_SLIDE')
    expect(contentCall).toBeDefined()
    if (contentCall) {
      const objects = contentCall[0].objects
      const rectObj = objects.find((o) => 'rect' in o)
      expect(rectObj).toBeDefined()
      const rect = (rectObj as { rect: { fill: { color: string } } }).rect
      expect(rect.fill.color).toBe('1E3A5F')
    }
  })

  // ---------------------------------------------------------------------------
  // VISUAL-03: No table header rows use BLUE (3B82F6); main tables use NAVY (1E3A5F)
  // ---------------------------------------------------------------------------
  it('uses navy fill in table header cells (not blue)', async () => {
    const { exportPptx } = await import('../exportPptx')
    await exportPptx(cluster, [scenario], [result], [breakdown], {})
    const tableCalls = mockAddTable.mock.calls as Array<[Array<Array<{ text: string; options?: { fill?: { color: string } } }>>, unknown]>
    const headerFills = tableCalls.flatMap(([rows]) => {
      const firstRow = rows[0]
      return firstRow ? firstRow.map((cell) => cell.options?.fill?.color).filter(Boolean) : []
    })
    // No header fill should be old BLUE (3B82F6) — it was replaced by NAVY (1E3A5F) or kept as GRAY
    expect(headerFills).not.toContain('3B82F6')
    // At least some headers should use NAVY
    expect(headerFills).toContain('1E3A5F')
  })

  // ---------------------------------------------------------------------------
  // VISUAL-04: KPI callout with roundRect shape and fill
  // ---------------------------------------------------------------------------
  it('renders KPI callouts with roundRect shape and fill', async () => {
    const { exportPptx } = await import('../exportPptx')
    await exportPptx(cluster, [scenario], [result], [breakdown], {})
    const textCalls = mockAddText.mock.calls as Array<[string, Record<string, unknown>]>
    const kpiCalls = textCalls.filter(([, opts]) => opts?.shape === 'roundRect')
    expect(kpiCalls.length).toBeGreaterThan(0)
    const [, firstKpiOpts] = kpiCalls[0]!
    expect(firstKpiOpts.rectRadius).toBe(0.3)
    expect(firstKpiOpts.fill).toEqual({ color: 'E8EDF2' })
  })

  // ---------------------------------------------------------------------------
  // VISUAL-02: Utilization cells contain colored dot TextProps[]
  // ---------------------------------------------------------------------------
  it('renders utilization cells with colored dot TextProps array', async () => {
    const { exportPptx } = await import('../exportPptx')
    await exportPptx(cluster, [scenario], [result], [breakdown], {})
    const tableCalls = mockAddTable.mock.calls as Array<[unknown[][], unknown]>
    const cellsWithTextArray = tableCalls.flatMap(([rows]) =>
      rows.flatMap((row: unknown[]) =>
        row.filter((cell: unknown) => Array.isArray((cell as { text: unknown }).text))
      )
    )
    // Should have at least one cell with TextProps[] (the utilization cells)
    expect(cellsWithTextArray.length).toBeGreaterThan(0)
    // Check that one of them contains the bullet dot character ●
    const hasDot = cellsWithTextArray.some((cell: unknown) => {
      const textArr = (cell as { text: Array<{ text: string }> }).text
      return textArr.some((t) => t.text.includes('\u25CF'))
    })
    expect(hasDot).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // MERGE-01: Sizing Parameters slide replaces separate Assumptions/Config/Growth
  // ---------------------------------------------------------------------------
  it('creates a "Sizing Parameters" slide title, not "Sizing Assumptions" or "Server Configuration"', async () => {
    const { exportPptx } = await import('../exportPptx')
    await exportPptx(cluster, [scenario], [result], [breakdown], {})
    const textCalls = mockAddText.mock.calls as Array<[string | Record<string, unknown>, Record<string, unknown>]>
    const slideTitles = textCalls
      .filter(([, opts]) => opts?.placeholder === 'title')
      .map(([text]) => (typeof text === 'string' ? text : ''))

    expect(slideTitles).toContain('Sizing Parameters')
    expect(slideTitles).not.toContain('Sizing Assumptions')
    expect(slideTitles).not.toContain('Per-Scenario Server Configuration')
    expect(slideTitles).not.toContain('Growth Projections')
  })

  // ---------------------------------------------------------------------------
  // MERGE-03: No final "Scenario Comparison" slide (As-Is vs To-Be is authoritative)
  // ---------------------------------------------------------------------------
  it('does not create a "Scenario Comparison" slide', async () => {
    const { exportPptx } = await import('../exportPptx')
    await exportPptx(cluster, [scenario], [result], [breakdown], {})
    const textCalls = mockAddText.mock.calls as Array<[string | Record<string, unknown>, Record<string, unknown>]>
    const slideTitles = textCalls
      .filter(([, opts]) => opts?.placeholder === 'title')
      .map(([text]) => (typeof text === 'string' ? text : ''))

    expect(slideTitles).not.toContain('Scenario Comparison')
    // The As-Is vs To-Be Comparison slide should still exist
    expect(slideTitles).toContain('As-Is vs To-Be Comparison')
  })

  // ---------------------------------------------------------------------------
  // MERGE-02: No standalone capacity breakdown table slide
  // ---------------------------------------------------------------------------
  it('does not create a standalone capacity breakdown table slide when chart is null', async () => {
    const { exportPptx } = await import('../exportPptx')
    await exportPptx(cluster, [scenario], [result], [breakdown], {})
    const textCalls = mockAddText.mock.calls as Array<[string | Record<string, unknown>, Record<string, unknown>]>
    // With chartRefToDataUrl returning null, no "Capacity Breakdown" title should appear
    // (it was only on the standalone bdSlide which is now removed, and capSlide is skipped when chart is null)
    const capacityTitles = textCalls
      .filter(([text]) => typeof text === 'string' && text.includes('Capacity Breakdown'))
    expect(capacityTitles).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Slide count: exactly 4 slides for single scenario without charts (post-consolidation)
  // ---------------------------------------------------------------------------
  it('creates exactly 4 slides for single scenario without charts (post-consolidation)', async () => {
    const { exportPptx } = await import('../exportPptx')
    await exportPptx(cluster, [scenario], [result], [breakdown], {})
    // Post-consolidation: Title(1) + Summary(2) + AsIsVsToBeComparison(3) + SizingParameters(4)
    // No chart slides (mock returns null), no bdSlide, no compSlide
    expect(mockAddSlide.mock.calls.length).toBe(4)
  })
})
