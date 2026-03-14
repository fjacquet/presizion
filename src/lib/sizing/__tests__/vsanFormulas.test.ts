// VSAN-01 through VSAN-11: vSAN formula engine unit tests
// All reference values are manually verified step-by-step in comments.
import { describe, it, expect } from 'vitest';
import {
  computeVsanStorageRaw,
  computeVsanEffectiveGhzPerNode,
  computeVsanEffectiveRamPerNode,
  serverCountByVsanStorage,
} from '../vsanFormulas';
import { FTT_POLICY_MAP } from '../vsanConstants';
import type { VsanFttPolicy } from '../vsanConstants';

// =====================================================================
// computeVsanStorageRaw
// =====================================================================

describe('computeVsanStorageRaw', () => {
  it('mirror-1 FTT=1 (2x), 1000 GiB usable, 1.5x compression, no swap, 25% slack', () => {
    // effectiveUsable = 1000 / 1.5 = 666.67
    // raw = 666.67 * 2.0 = 1333.33
    // metadata = 1000 * 0.02 = 20
    // rawWithMetadata = 1353.33
    // rawWithSlack = 1353.33 / 0.75 = 1804.44
    const result = computeVsanStorageRaw({
      usableGib: 1000,
      fttPolicy: 'mirror-1',
      compressionFactor: 1.5,
    });
    expect(result).toBeCloseTo(1804.44, 1);
  });

  it('mirror-2 FTT=2 (3x), 1000 GiB usable, no compression, no swap, 25% slack', () => {
    // effectiveUsable = 1000 / 1.0 = 1000
    // raw = 1000 * 3.0 = 3000
    // metadata = 1000 * 0.02 = 20
    // rawWithMetadata = 3020
    // rawWithSlack = 3020 / 0.75 = 4026.67
    const result = computeVsanStorageRaw({
      usableGib: 1000,
      fttPolicy: 'mirror-2',
    });
    expect(result).toBeCloseTo(4026.67, 1);
  });

  it('raid5 (4/3x), 1000 GiB usable, no compression, 25% slack', () => {
    // effectiveUsable = 1000 / 1.0 = 1000
    // raw = 1000 * (1 + 1/3) = 1333.33
    // metadata = 1000 * 0.02 = 20
    // rawWithMetadata = 1353.33
    // rawWithSlack = 1353.33 / 0.75 = 1804.44
    const result = computeVsanStorageRaw({
      usableGib: 1000,
      fttPolicy: 'raid5',
    });
    expect(result).toBeCloseTo(1804.44, 1);
  });

  it('raid6 (1.5x), 500 GiB, 2.0x compression, swap ON (totalVmRamGib=100), 25% slack', () => {
    // effectiveUsable = 500 / 2.0 + 100 = 350
    // raw = 350 * 1.5 = 525
    // metadata = 500 * 0.02 = 10
    // rawWithMetadata = 535
    // rawWithSlack = 535 / 0.75 = 713.33
    const result = computeVsanStorageRaw({
      usableGib: 500,
      fttPolicy: 'raid6',
      compressionFactor: 2.0,
      vmSwapEnabled: true,
      totalVmRamGib: 100,
    });
    expect(result).toBeCloseTo(713.33, 1);
  });

  it('compressionFactor defaults to 1.0 when omitted', () => {
    // effectiveUsable = 500 / 1.0 = 500
    // raw = 500 * 2.0 = 1000  (mirror-1)
    // metadata = 500 * 0.02 = 10
    // rawWithMetadata = 1010
    // rawWithSlack = 1010 / 0.75 = 1346.67
    const result = computeVsanStorageRaw({
      usableGib: 500,
      fttPolicy: 'mirror-1',
    });
    expect(result).toBeCloseTo(1346.67, 1);
  });

  it('compressionFactor clamped to min 1.0 (zero-guard: passing 0 does not cause Infinity)', () => {
    // Should behave the same as compressionFactor=1.0
    const withZero = computeVsanStorageRaw({
      usableGib: 500,
      fttPolicy: 'mirror-1',
      compressionFactor: 0 as never,
    });
    const withDefault = computeVsanStorageRaw({
      usableGib: 500,
      fttPolicy: 'mirror-1',
      compressionFactor: 1.0,
    });
    expect(withZero).toBeCloseTo(withDefault, 5);
    expect(Number.isFinite(withZero)).toBe(true);
  });
});

// =====================================================================
// computeVsanEffectiveGhzPerNode
// =====================================================================

describe('computeVsanEffectiveGhzPerNode', () => {
  it('100 GHz node with 10% overhead = 90', () => {
    expect(computeVsanEffectiveGhzPerNode(100, 10)).toBeCloseTo(90);
  });

  it('100 GHz node with default overhead (10%) = 90', () => {
    expect(computeVsanEffectiveGhzPerNode(100)).toBeCloseTo(90);
  });
});

// =====================================================================
// computeVsanEffectiveRamPerNode
// =====================================================================

describe('computeVsanEffectiveRamPerNode', () => {
  it('512 GB node with 6 GB vSAN overhead = 506', () => {
    expect(computeVsanEffectiveRamPerNode(512, 6)).toBe(506);
  });

  it('512 GB node with default overhead (6 GB) = 506', () => {
    expect(computeVsanEffectiveRamPerNode(512)).toBe(506);
  });

  it('4 GB node with 6 GB overhead = 0 (clamped at 0, not negative)', () => {
    expect(computeVsanEffectiveRamPerNode(4, 6)).toBe(0);
  });
});

// =====================================================================
// serverCountByVsanStorage
// =====================================================================

describe('serverCountByVsanStorage', () => {
  it('small cluster (3 TiB usable, 100 TiB/node, mirror-1) = 3 (min-node floor, not 1)', () => {
    // 3 TiB = 3072 GiB, 100 TiB = 102400 GiB
    // Storage raw = computeVsanStorageRaw(3072, mirror-1) ~ small number
    // Math.ceil(rawTotal / 102400) = 1
    // But mirror-1 minNodes = 3, so result = 3
    const result = serverCountByVsanStorage(3072, 102400, 'mirror-1');
    expect(result).toBe(3);
  });

  it('min-node floor for mirror-1 = 3', () => {
    expect(serverCountByVsanStorage(1, 100000, 'mirror-1')).toBe(3);
  });

  it('min-node floor for mirror-2 = 5', () => {
    expect(serverCountByVsanStorage(1, 100000, 'mirror-2')).toBe(5);
  });

  it('min-node floor for mirror-3 = 7', () => {
    expect(serverCountByVsanStorage(1, 100000, 'mirror-3')).toBe(7);
  });

  it('min-node floor for raid5 = 4', () => {
    expect(serverCountByVsanStorage(1, 100000, 'raid5')).toBe(4);
  });

  it('min-node floor for raid6 = 6', () => {
    expect(serverCountByVsanStorage(1, 100000, 'raid6')).toBe(6);
  });

  it('storage count exceeds min-node floor returns storage count', () => {
    // Use large usable storage relative to per-node capacity
    // 100000 GiB usable, 1000 GiB/node, mirror-1 (minNodes=3)
    // raw = computeVsanStorageRaw(100000, mirror-1) = 100000/1.0*2.0 = 200000 + 2000 metadata = 202000 / 0.75 = 269333.33
    // ceil(269333.33 / 1000) = 270 >> 3
    const result = serverCountByVsanStorage(100000, 1000, 'mirror-1');
    expect(result).toBeGreaterThan(FTT_POLICY_MAP['mirror-1'].minNodes);
  });

  it('rawPerNodeGib=0 returns minNodes (zero-guard)', () => {
    expect(serverCountByVsanStorage(1000, 0, 'mirror-1')).toBe(3);
    expect(serverCountByVsanStorage(1000, 0, 'mirror-2')).toBe(5);
    expect(serverCountByVsanStorage(1000, 0, 'raid6')).toBe(6);
  });
});
