/**
 * export utils — Unit tests
 * Requirements: EXPO-02, EXPO-03
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResourceBreakdown, StorageBreakdown, VsanCapacityBreakdown } from '@/types/breakdown';
import type { OldCluster, Scenario } from '@/types/cluster';
import type { ScenarioResult } from '@/types/results';
import type { SingleVmFit } from '@/lib/sizing/singleVmFit';
import { buildCsvContent, buildJsonContent, csvEscape, downloadCsv, downloadJson } from '../export';

const UNKNOWN_SINGLE_VM_FIT: SingleVmFit = {
  vcpu: 'unknown',
  ram: 'unknown',
  overall: 'unknown',
  coresPerServer: 0,
  logicalCpus: 0,
  usableRamGb: 0,
};

const cluster: OldCluster = {
  totalVcpus: 2000,
  totalPcores: 500,
  totalVms: 300,
};

const scenario: Scenario = {
  id: 'test-scenario-1',
  name: 'Enterprise 2-socket',
  socketsPerServer: 2,
  coresPerSocket: 24,
  ramPerServerGb: 1024,
  diskPerServerGb: 20000,
  targetVcpuToPCoreRatio: 4,
  ramPerVmGb: 16,
  diskPerVmGb: 100,
  growthPercent: 0,
  safetyPercent: 20,
  haReserveCount: 0 as const,
};

const result: ScenarioResult = {
  cpuLimitedCount: 24,
  ramLimitedCount: 19,
  diskLimitedCount: 12,
  rawCount: 24,
  requiredCount: 24,
  finalCount: 24,
  limitingResource: 'cpu',
  haReserveCount: 0,
  haReserveApplied: false,
  achievedVcpuToPCoreRatio: 4.0,
  vmsPerServer: 12.5,
  cpuUtilizationPercent: 85.0,
  ramUtilizationPercent: 60.0,
  diskUtilizationPercent: 35.0,
  stretchApplied: false,
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
  scenarioId: 'test-scenario-1',
  cpu: resourceBd,
  memory: resourceBd,
  storage: storageBd,
  minNodesByConstraint: { cpu: 14, memory: 10, storage: 2 },
};

beforeEach(() => {
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn().mockReturnValue('blob:mock'),
    revokeObjectURL: vi.fn(),
  });
});

describe('buildCsvContent', () => {
  it('returns a string starting with a header row', () => {
    const csv = buildCsvContent(cluster, [scenario], [result]);
    const firstLine = csv.split('\n')[0];
    expect(firstLine).toContain('Name');
  });

  it('includes one data row per scenario', () => {
    const csv = buildCsvContent(cluster, [scenario], [result]);
    const lines = csv.split('\n').filter((l) => l.length > 0);
    // header + 1 data row = 2 lines
    expect(lines).toHaveLength(1 + 1);
  });

  it('includes scenario name in each row', () => {
    const csv = buildCsvContent(cluster, [scenario], [result]);
    expect(csv).toContain('Enterprise 2-socket');
  });

  it('includes final server count in each row', () => {
    const csv = buildCsvContent(cluster, [scenario], [result]);
    const lines = csv.split('\n');
    const dataRow = lines[1];
    expect(dataRow).toContain('24');
  });

  it('includes limiting resource in each row', () => {
    const csv = buildCsvContent(cluster, [scenario], [result]);
    const lines = csv.split('\n');
    const dataRow = lines[1];
    expect(dataRow).toContain('cpu');
  });

  it('escapes fields containing commas by wrapping in double-quotes', () => {
    expect(csvEscape('value,with,commas')).toBe('"value,with,commas"');
  });

  it('escapes fields containing double-quotes by doubling them', () => {
    expect(csvEscape('say "hello"')).toBe('"say ""hello"""');
  });

  it('omits the capacity breakdown section when no breakdowns are passed', () => {
    const csv = buildCsvContent(cluster, [scenario], [result]);
    expect(csv).not.toContain('Capacity Breakdown');
  });

  it('appends a capacity breakdown section per scenario when breakdowns are passed', () => {
    const csv = buildCsvContent(cluster, [scenario], [result], [breakdown]);
    expect(csv).toContain('Capacity Breakdown');
    expect(csv).toContain('CPU GHz');
    expect(csv).toContain('Required,Spare,Excess,Total');
  });

  it('includes Memory GiB and Raw Storage TiB rows with TiB conversion', () => {
    const csv = buildCsvContent(cluster, [scenario], [result], [breakdown]);
    expect(csv).toContain('Memory GiB');
    // Raw Storage TiB: total 133120 GiB / 1024 = 130.0 TiB
    expect(csv).toContain('Raw Storage TiB,100.0,20.0,10.0,130.0');
  });
});

describe('downloadCsv', () => {
  it('calls URL.createObjectURL with a Blob', () => {
    // Use a real anchor element so jsdom's appendChild accepts it; spy on click
    const link = document.createElement('a');
    vi.spyOn(link, 'click').mockImplementation(() => {});
    vi.spyOn(document, 'createElement').mockReturnValueOnce(link);

    downloadCsv('test.csv', 'header\ndata');

    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  });

  it('calls URL.revokeObjectURL after the download is triggered', () => {
    const link = document.createElement('a');
    vi.spyOn(link, 'click').mockImplementation(() => {});
    vi.spyOn(document, 'createElement').mockReturnValueOnce(link);

    downloadCsv('test.csv', 'header\ndata');

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });
});

describe('buildJsonContent', () => {
  it('returns a valid pretty-printed JSON string', () => {
    const json = buildJsonContent(cluster, [scenario], [result]);
    expect(() => JSON.parse(json)).not.toThrow();
    // pretty-printed: should contain newlines and indentation
    expect(json).toContain('\n');
  });

  it('includes currentCluster, scenarios, and computed results', () => {
    const json = buildJsonContent(cluster, [scenario], [result]);
    const parsed = JSON.parse(json) as Record<string, unknown>;
    expect(parsed).toHaveProperty('currentCluster');
    expect(parsed).toHaveProperty('scenarios');
    const scenarios = parsed.scenarios as Array<Record<string, unknown>>;
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0]).toHaveProperty('result');
  });

  it('sets undefined optional fields to null (not omitted)', () => {
    // OldCluster with no optional fields — they should appear as null in JSON
    const minimalCluster: OldCluster = {
      totalVcpus: 100,
      totalPcores: 25,
      totalVms: 50,
    };
    const json = buildJsonContent(minimalCluster, [], []);
    const parsed = JSON.parse(json) as { currentCluster: Record<string, unknown> };
    // existingServerCount is optional; if undefined it must be null (not omitted)
    expect(parsed.currentCluster).toHaveProperty('existingServerCount', null);
  });

  it('includes schemaVersion: "2" at top level', () => {
    const json = buildJsonContent(cluster, [scenario], [result]);
    const parsed = JSON.parse(json) as { schemaVersion: string };
    expect(parsed.schemaVersion).toBe('2');
  });

  it('includes isStretchCluster (true) when set on the cluster', () => {
    const stretched: OldCluster = { ...cluster, isStretchCluster: true };
    const json = buildJsonContent(stretched, [scenario], [result]);
    const parsed = JSON.parse(json) as { currentCluster: Record<string, unknown> };
    expect(parsed.currentCluster).toHaveProperty('isStretchCluster', true);
  });

  it('writes isStretchCluster as null when absent', () => {
    const json = buildJsonContent(cluster, [scenario], [result]);
    const parsed = JSON.parse(json) as { currentCluster: Record<string, unknown> };
    expect(parsed.currentCluster).toHaveProperty('isStretchCluster', null);
  });
});

describe('downloadJson', () => {
  it('calls URL.createObjectURL with a Blob of type application/json', () => {
    const link = document.createElement('a');
    vi.spyOn(link, 'click').mockImplementation(() => {});
    vi.spyOn(document, 'createElement').mockReturnValueOnce(link);

    downloadJson('test.json', '{"key":"value"}');

    expect(URL.createObjectURL).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'application/json;charset=utf-8;' }),
    );
  });

  it('calls URL.revokeObjectURL after download is triggered', () => {
    const link = document.createElement('a');
    vi.spyOn(link, 'click').mockImplementation(() => {});
    vi.spyOn(document, 'createElement').mockReturnValueOnce(link);

    downloadJson('test.json', '{"key":"value"}');

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });
});
