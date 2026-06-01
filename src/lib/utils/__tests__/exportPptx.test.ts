/**
 * exportPptx — Unit tests
 * Requirements: PPTX-01, PPTX-02, PPTX-03
 *
 * Mocks pptxgenjs so tests run without a real PPTX library.
 * Visual assertions target the Midnight Executive palette + Arial/Consolas fonts.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SingleVmFit } from '@/lib/sizing/singleVmFit';
import type { ResourceBreakdown, StorageBreakdown, VsanCapacityBreakdown } from '@/types/breakdown';
import type { OldCluster, Scenario } from '@/types/cluster';
import type { ScenarioResult } from '@/types/results';

const UNKNOWN_SINGLE_VM_FIT: SingleVmFit = {
  vcpu: 'unknown',
  ram: 'unknown',
  overall: 'unknown',
  coresPerServer: 0,
  logicalCpus: 0,
  usableRamGb: 0,
};

// ---------------------------------------------------------------------------
// Mock pptxgenjs
// ---------------------------------------------------------------------------
const mockWriteFile = vi.fn().mockResolvedValue('ok');
const mockAddText = vi.fn().mockReturnThis();
const mockAddTable = vi.fn().mockReturnThis();
const mockAddImage = vi.fn().mockReturnThis();
const mockDefineSlideMaster = vi.fn();
const mockAddSlide = vi.fn().mockImplementation(() => ({
  background: undefined,
  addText: mockAddText,
  addTable: mockAddTable,
  addImage: mockAddImage,
}));

vi.mock('pptxgenjs', () => {
  class MockPptxGenJS {
    layout = '';
    author = '';
    title = '';
    addSlide = mockAddSlide;
    writeFile = mockWriteFile;
    defineSlideMaster = mockDefineSlideMaster;
  }
  return { default: MockPptxGenJS };
});

// Mock the logo helper (no canvas in test env)
vi.mock('@/lib/utils/logoDataUrl', () => ({
  getLogoDataUrl: vi.fn().mockResolvedValue(''),
}));

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const cluster: OldCluster = {
  totalVcpus: 2000,
  totalPcores: 500,
  totalVms: 300,
  existingServerCount: 20,
  cpuUtilizationPercent: 80,
  ramUtilizationPercent: 65,
};

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
  growthPercent: 0,
  safetyPercent: 20,
  haReserveCount: 0 as const,
};

const result: ScenarioResult = {
  cpuLimitedCount: 14,
  ramLimitedCount: 10,
  diskLimitedCount: 2,
  vmsLimitedCount: 0,
  rawCount: 14,
  requiredCount: 14,
  finalCount: 14,
  limitingResource: 'cpu',
  haReserveCount: 0,
  haReserveApplied: false,
  stretchApplied: false,
  achievedVcpuToPCoreRatio: 2.98,
  vmsPerServer: 21.43,
  cpuUtilizationPercent: 74.4,
  ramUtilizationPercent: 67.2,
  diskUtilizationPercent: 10.7,
  singleVmFit: UNKNOWN_SINGLE_VM_FIT,
};

const resourceBd: ResourceBreakdown = {
  vmsRequired: 100,
  vsanConsumption: 0,
  required: 100,
  reservedMaxUtil: 20,
  haReserve: 0,
  spare: 20,
  excess: 10,
  total: 130,
};

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
};

const breakdown: VsanCapacityBreakdown = {
  scenarioId: 'a',
  cpu: resourceBd,
  memory: resourceBd,
  storage: storageBd,
  minNodesByConstraint: { cpu: 14, memory: 10, storage: 2 },
};

// ---------------------------------------------------------------------------
// Helpers to flatten mock call options
// ---------------------------------------------------------------------------
type TableRows = Array<Array<{ text: unknown; options?: { fill?: { color?: string } } }>>;

function allTableHeaderFills(): string[] {
  const tableCalls = mockAddTable.mock.calls as Array<[TableRows, unknown]>;
  return tableCalls.flatMap(([rows]) => {
    const firstRow = rows[0];
    return firstRow
      ? firstRow.map((cell) => cell.options?.fill?.color).filter((c): c is string => Boolean(c))
      : [];
  });
}

/** Collect every fontFace seen across addText opts + table-cell opts (nested TextProps too). */
function allFontFaces(): string[] {
  const faces: string[] = [];

  const textCalls = mockAddText.mock.calls as Array<[unknown, Record<string, unknown>]>;
  for (const [text, opts] of textCalls) {
    if (opts && typeof opts.fontFace === 'string') faces.push(opts.fontFace);
    if (Array.isArray(text)) {
      for (const run of text as Array<{ options?: Record<string, unknown> }>) {
        const ff = run.options?.fontFace;
        if (typeof ff === 'string') faces.push(ff);
      }
    }
  }

  const tableCalls = mockAddTable.mock.calls as Array<
    [Array<Array<{ text: unknown; options?: Record<string, unknown> }>>, unknown]
  >;
  for (const [rows] of tableCalls) {
    for (const row of rows) {
      for (const cell of row) {
        const ff = cell.options?.fontFace;
        if (typeof ff === 'string') faces.push(ff);
        if (Array.isArray(cell.text)) {
          for (const run of cell.text as Array<{ options?: Record<string, unknown> }>) {
            const rff = run.options?.fontFace;
            if (typeof rff === 'string') faces.push(rff);
          }
        }
      }
    }
  }

  return faces;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

describe('exportPptx', () => {
  it('is a function that can be imported', async () => {
    const { exportPptx } = await import('../exportPptx');
    expect(typeof exportPptx).toBe('function');
  });

  it('calls pptxgenjs writeFile when invoked with valid data', async () => {
    const { exportPptx } = await import('../exportPptx');
    await exportPptx(cluster, [scenario], [result], [breakdown], {});
    expect(mockWriteFile).toHaveBeenCalledWith({
      fileName: 'presizion-sizing-report.pptx',
    });
  });

  it('does not throw when called with empty scenarios', async () => {
    const { exportPptx } = await import('../exportPptx');
    await expect(exportPptx(cluster, [], [], [], {})).resolves.toBeUndefined();
  });

  it('creates exactly 3 slides for single HCI scenario without charts (title + merged + config appendix)', async () => {
    const { exportPptx } = await import('../exportPptx');
    await exportPptx(cluster, [scenario], [result], [breakdown], {});
    // HCI (default showStorage=true) has enough config rows that the config table
    // overflows to its own appendix slide: Title + Summary&Comparison + Config = 3.
    // (mock returns null charts, so no per-scenario chart slides)
    expect(mockAddSlide.mock.calls.length).toBe(3);
  });

  it('merges config inline (2 slides) for a disaggregated scenario without charts', async () => {
    const { exportPptx } = await import('../exportPptx');
    // showStorage=false drops the storage rows, so sizing+config fit on one slide:
    // Title + merged Summary&Comparison(+Config inline) = 2 slides.
    await exportPptx(cluster, [scenario], [result], [breakdown], {}, false);
    expect(mockAddSlide.mock.calls.length).toBe(2);
  });

  it('generates a table on the executive summary slide', async () => {
    const { exportPptx } = await import('../exportPptx');
    await exportPptx(cluster, [scenario], [result], [breakdown], {});
    expect(mockAddTable).toHaveBeenCalled();
  });

  it('includes scenario name in table data', async () => {
    const { exportPptx } = await import('../exportPptx');
    await exportPptx(cluster, [scenario], [result], [breakdown], {});
    const allCalls = mockAddTable.mock.calls as Array<[Array<Array<{ text: string }>>, unknown]>;
    const hasScenarioName = allCalls.some(([rows]) =>
      rows.some((row) => row.some((cell) => cell.text === 'Test Scenario')),
    );
    expect(hasScenarioName).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // VISUAL: brand accent strip uses Midnight primary500 (3245b7), not old navy
  // ---------------------------------------------------------------------------
  it('renders the brand accent strip with Midnight primary500 fill (3245b7)', async () => {
    const { exportPptx } = await import('../exportPptx');
    await exportPptx(cluster, [scenario], [result], [breakdown], {});
    const textCalls = mockAddText.mock.calls as Array<[unknown, Record<string, unknown>]>;
    const stripFills = textCalls
      .map(([, opts]) => (opts?.fill as { color?: string } | undefined)?.color)
      .filter((c): c is string => Boolean(c));
    expect(stripFills).toContain('3245b7');
    expect(stripFills).not.toContain('1E3A5F');
  });

  // ---------------------------------------------------------------------------
  // VISUAL: table headers use Midnight primary500 (3245b7), not old navy/blue
  // ---------------------------------------------------------------------------
  it('uses Midnight primary500 fill in table header cells (not navy/blue)', async () => {
    const { exportPptx } = await import('../exportPptx');
    await exportPptx(cluster, [scenario], [result], [breakdown], {});
    const headerFills = allTableHeaderFills();
    expect(headerFills).toContain('3245b7');
    expect(headerFills).not.toContain('1E3A5F');
    expect(headerFills).not.toContain('3B82F6');
  });

  // ---------------------------------------------------------------------------
  // VISUAL: KPI callouts use roundRect with surface200 fill (d4d8de)
  // ---------------------------------------------------------------------------
  it('renders KPI callouts with roundRect shape and surface200 fill (d4d8de)', async () => {
    const { exportPptx } = await import('../exportPptx');
    await exportPptx(cluster, [scenario], [result], [breakdown], {});
    const textCalls = mockAddText.mock.calls as Array<[string, Record<string, unknown>]>;
    const kpiCalls = textCalls.filter(([, opts]) => opts?.shape === 'roundRect');
    expect(kpiCalls.length).toBeGreaterThan(0);
    const [, firstKpiOpts] = kpiCalls[0]!;
    expect(firstKpiOpts.fill).toEqual({ color: 'd4d8de' });
  });

  // ---------------------------------------------------------------------------
  // VISUAL: fonts are Arial (body/headings) + Consolas (metrics); never Calibri
  // ---------------------------------------------------------------------------
  it('uses Arial and Consolas fonts and never Calibri', async () => {
    const { exportPptx } = await import('../exportPptx');
    await exportPptx(cluster, [scenario], [result], [breakdown], {});
    const faces = allFontFaces();
    expect(faces).toContain('Arial');
    expect(faces).toContain('Consolas');
    expect(faces).not.toContain('Calibri');
  });

  // ---------------------------------------------------------------------------
  // Utilization cells contain colored band-dot TextProps[]
  // ---------------------------------------------------------------------------
  it('renders utilization cells with colored dot TextProps array', async () => {
    const { exportPptx } = await import('../exportPptx');
    await exportPptx(cluster, [scenario], [result], [breakdown], {});
    const tableCalls = mockAddTable.mock.calls as Array<[unknown[][], unknown]>;
    const cellsWithTextArray = tableCalls.flatMap(([rows]) =>
      rows.flatMap((row: unknown[]) =>
        row.filter((cell: unknown) => Array.isArray((cell as { text: unknown }).text)),
      ),
    );
    expect(cellsWithTextArray.length).toBeGreaterThan(0);
    const hasDot = cellsWithTextArray.some((cell: unknown) => {
      const textArr = (cell as { text: Array<{ text: string }> }).text;
      return textArr.some((t) => t.text.includes('●'));
    });
    expect(hasDot).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // MERGE-01: server config rows live in the comparison table
  // ---------------------------------------------------------------------------
  it('includes server config rows (e.g. "Sockets / Server") in the comparison table', async () => {
    const { exportPptx } = await import('../exportPptx');
    await exportPptx(cluster, [scenario], [result], [breakdown], {});
    const allCalls = mockAddTable.mock.calls as Array<[Array<Array<{ text: string }>>, unknown]>;
    const hasServerConfig = allCalls.some(([rows]) =>
      rows.some((row) => row.some((cell) => cell.text === 'Sockets / Server')),
    );
    expect(hasServerConfig).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // MERGE-03: slides 2 & 3 are merged into "Executive Summary & Comparison" with
  // a "Configuration & Assumptions" appendix; no separate standalone titles.
  // ---------------------------------------------------------------------------
  it('emits the merged executive + appendix headers and no merged-away slide titles', async () => {
    const { exportPptx } = await import('../exportPptx');
    await exportPptx(cluster, [scenario], [result], [breakdown], {});
    const textCalls = mockAddText.mock.calls as Array<[unknown, Record<string, unknown>]>;
    const headings = textCalls
      .map(([text]) => (typeof text === 'string' ? text : ''))
      .filter(Boolean);
    expect(headings).toContain('Executive Summary & Comparison');
    expect(headings).toContain('Configuration & Assumptions');
    // The standalone summary / comparison slides no longer exist as their own slides.
    expect(headings).not.toContain('Executive Summary');
    expect(headings).not.toContain('As-Is vs To-Be Comparison');
    expect(headings).not.toContain('Scenario Comparison');
    expect(headings).not.toContain('Sizing Parameters');
  });

  // ---------------------------------------------------------------------------
  // MERGE-02: no capacity breakdown slide when the chart capture is null
  // ---------------------------------------------------------------------------
  it('does not create a capacity breakdown slide when chart is null', async () => {
    const { exportPptx } = await import('../exportPptx');
    await exportPptx(cluster, [scenario], [result], [breakdown], {});
    const textCalls = mockAddText.mock.calls as Array<[unknown, Record<string, unknown>]>;
    const capacityTitles = textCalls.filter(
      ([text]) => typeof text === 'string' && text.includes('Capacity Breakdown'),
    );
    expect(capacityTitles).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Disaggregated layout (showStorage=false): storage/disk rows are omitted from
  // the comparison table to match the web (which hides storage when disaggregated).
  // ---------------------------------------------------------------------------
  function comparisonRowLabels(): string[] {
    const tableCalls = mockAddTable.mock.calls as Array<[Array<Array<{ text: unknown }>>, unknown]>;
    return tableCalls.flatMap(([rows]) =>
      rows.map((row) => row[0]?.text).filter((t): t is string => typeof t === 'string'),
    );
  }

  it('omits storage/disk comparison rows when showStorage is false (disaggregated)', async () => {
    const { exportPptx } = await import('../exportPptx');
    await exportPptx(cluster, [scenario], [result], [breakdown], {}, false);
    const labels = comparisonRowLabels();
    expect(labels).not.toContain('Total Disk');
    expect(labels).not.toContain('Disk / Server (GB)');
    expect(labels).not.toContain('Avg Disk/VM (GiB)');
  });

  it('includes storage/disk comparison rows by default (showStorage defaults to true)', async () => {
    const { exportPptx } = await import('../exportPptx');
    await exportPptx(cluster, [scenario], [result], [breakdown], {});
    const labels = comparisonRowLabels();
    expect(labels).toContain('Total Disk');
    expect(labels).toContain('Disk / Server (GB)');
    expect(labels).toContain('Avg Disk/VM (GiB)');
  });

  it('includes storage/disk comparison rows when showStorage is true (HCI)', async () => {
    const { exportPptx } = await import('../exportPptx');
    await exportPptx(cluster, [scenario], [result], [breakdown], {}, true);
    const labels = comparisonRowLabels();
    expect(labels).toContain('Total Disk');
    expect(labels).toContain('Disk / Server (GB)');
    expect(labels).toContain('Avg Disk/VM (GiB)');
  });

  it('omits the Raw Storage capacity row when showStorage is false (disaggregated)', async () => {
    const { exportPptx } = await import('../exportPptx');
    await exportPptx(
      cluster,
      [scenario],
      [result],
      [breakdown],
      { 'capacity-a': { dataUrl: 'data:image/png;base64,AAA', width: 100, height: 50 } },
      false,
    );
    const labels = comparisonRowLabels();
    expect(labels).not.toContain('Raw Storage TiB');
    // Non-storage capacity rows remain.
    expect(labels).toContain('CPU GHz');
    expect(labels).toContain('Memory GiB');
  });

  it('includes the Raw Storage capacity row by default (HCI)', async () => {
    const { exportPptx } = await import('../exportPptx');
    await exportPptx(cluster, [scenario], [result], [breakdown], {
      'capacity-a': { dataUrl: 'data:image/png;base64,AAA', width: 100, height: 50 },
    });
    const labels = comparisonRowLabels();
    expect(labels).toContain('Raw Storage TiB');
  });

  // ---------------------------------------------------------------------------
  // A captured ECharts PNG for a scenario yields an extra capacity chart slide
  // ---------------------------------------------------------------------------
  it('adds a capacity chart slide when a capture is supplied for the scenario', async () => {
    const { exportPptx } = await import('../exportPptx');
    await exportPptx(cluster, [scenario], [result], [breakdown], {
      'capacity-a': { dataUrl: 'data:image/png;base64,AAA', width: 100, height: 50 },
    });
    // HCI default: Title + Summary&Comparison + 1 capacity chart + Config appendix = 4 slides
    expect(mockAddSlide.mock.calls.length).toBe(4);
    const textCalls = mockAddText.mock.calls as Array<[unknown, Record<string, unknown>]>;
    const capacityTitles = textCalls.filter(
      ([text]) => typeof text === 'string' && text.includes('Capacity Breakdown'),
    );
    expect(capacityTitles.length).toBeGreaterThan(0);
  });
});
