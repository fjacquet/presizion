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

  it('creates multiple slides (title + summary + breakdown + comparison)', async () => {
    const { exportPptx } = await import('../exportPptx')
    await exportPptx(cluster, [scenario], [result], [breakdown], {})
    // Title + Summary + Breakdown table (1 scenario) + Comparison = at least 4 slides
    // No chart slides since chartRefToDataUrl returns null
    expect(mockAddSlide.mock.calls.length).toBeGreaterThanOrEqual(4)
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
})
