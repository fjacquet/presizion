/**
 * exportPdf -- Unit tests
 * Requirements: PDF-01, PDF-02, PDF-03, PDF-05
 *
 * Mocks jsPDF and jspdf-autotable so tests run without real PDF rendering.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { OldCluster, Scenario } from '@/types/cluster'
import type { ScenarioResult } from '@/types/results'
import type { VsanCapacityBreakdown, ResourceBreakdown, StorageBreakdown } from '@/types/breakdown'

// ---------------------------------------------------------------------------
// Mock jsPDF
// ---------------------------------------------------------------------------
const mockText = vi.fn().mockReturnThis()
const mockSetFont = vi.fn().mockReturnThis()
const mockSetFontSize = vi.fn().mockReturnThis()
const mockAddPage = vi.fn().mockReturnThis()
const mockAddImage = vi.fn().mockReturnThis()
const mockSave = vi.fn()

vi.mock('jspdf', () => {
  class MockJsPDF {
    text = mockText
    setFont = mockSetFont
    setFontSize = mockSetFontSize
    setTextColor = vi.fn().mockReturnThis()
    setFillColor = vi.fn().mockReturnThis()
    rect = vi.fn().mockReturnThis()
    addPage = mockAddPage
    addImage = mockAddImage
    save = mockSave
    getNumberOfPages = vi.fn().mockReturnValue(1)
    internal = {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297,
      },
    }
    lastAutoTable = { finalY: 50 }
  }
  return { jsPDF: MockJsPDF }
})

// Mock autoTable as standalone function (v5 pattern)
const mockAutoTable = vi.fn()
vi.mock('jspdf-autotable', () => ({
  autoTable: (...args: unknown[]) => mockAutoTable(...args),
}))

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

describe('exportPdf', () => {
  it('is a function that can be imported', async () => {
    const { exportPdf } = await import('../exportPdf')
    expect(typeof exportPdf).toBe('function')
  })

  it('calls doc.save with the report filename when invoked with valid data', async () => {
    const { exportPdf } = await import('../exportPdf')
    await exportPdf(cluster, [scenario], [result], [breakdown], {})
    expect(mockSave).toHaveBeenCalledWith('presizion-sizing-report.pdf')
  })

  it('does not throw when called with empty scenarios and null chartRefs', async () => {
    const { exportPdf } = await import('../exportPdf')
    await expect(exportPdf(cluster, [], [], [], {})).resolves.toBeUndefined()
  })

  it('calls autoTable at least 3 times (summary + breakdown + comparison) for one scenario', async () => {
    const { exportPdf } = await import('../exportPdf')
    await exportPdf(cluster, [scenario], [result], [breakdown], {})
    // Executive summary + 1 capacity breakdown + comparison = 3 autoTable calls
    expect(mockAutoTable.mock.calls.length).toBeGreaterThanOrEqual(3)
  })

  it('creates the title page with report title text', async () => {
    const { exportPdf } = await import('../exportPdf')
    await exportPdf(cluster, [scenario], [result], [breakdown], {})
    // Check that doc.text was called with the title
    const textCalls = mockText.mock.calls as Array<[string, number, number, Record<string, string>?]>
    const hasTitle = textCalls.some(
      ([text]) => typeof text === 'string' && text.includes('Cluster Sizing Report'),
    )
    expect(hasTitle).toBe(true)
  })

  it('includes scenario name in autoTable calls', async () => {
    const { exportPdf } = await import('../exportPdf')
    await exportPdf(cluster, [scenario], [result], [breakdown], {})
    // Check autoTable body rows contain the scenario name
    const allCalls = mockAutoTable.mock.calls as Array<[unknown, { body?: string[][] }]>
    const hasScenarioName = allCalls.some(([, opts]) =>
      opts.body?.some((row: string[]) => row.some((cell: string) => cell === 'Test Scenario')),
    )
    expect(hasScenarioName).toBe(true)
  })

  it('adds pages for multi-section layout', async () => {
    const { exportPdf } = await import('../exportPdf')
    await exportPdf(cluster, [scenario], [result], [breakdown], {})
    // At minimum: addPage after title page
    expect(mockAddPage).toHaveBeenCalled()
  })
})
