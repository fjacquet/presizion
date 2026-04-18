import { describe, it, expect } from 'vitest';
import { analyzeStretchCluster } from '../stretchClusterDetector';

describe('analyzeStretchCluster', () => {
  it('returns high confidence when vSAN sheet explicitly marks stretched', () => {
    const result = analyzeStretchCluster({
      scopeKey: 'dc-a|cluster-01',
      scopeLabel: 'cluster-01',
      explicitStretchFromVsan: true,
    });
    expect(result.isStretchCluster).toBe(true);
    expect(result.confidence).toBe('high');
    expect(result.signals).toContain('vSAN sheet marks cluster as stretched');
  });

  it('returns high confidence when vSAN sheet shows ≥2 fault domains', () => {
    const result = analyzeStretchCluster({
      scopeKey: 'dc-a|cluster-01',
      scopeLabel: 'cluster-01',
      faultDomainCount: 2,
    });
    expect(result.isStretchCluster).toBe(true);
    expect(result.confidence).toBe('high');
    expect(result.signals[0]).toMatch(/2 fault domains/);
  });

  it('returns medium confidence for 2 DCs with symmetric host counts', () => {
    const hostCountByDc = new Map([
      ['dc-a', 8],
      ['dc-b', 8],
    ]);
    const result = analyzeStretchCluster({
      scopeKey: 'dc-a+dc-b|cluster-01',
      scopeLabel: 'cluster-01',
      hostCountByDc,
    });
    expect(result.isStretchCluster).toBe(true);
    expect(result.confidence).toBe('medium');
  });

  it('within 25% tolerance counts as symmetric (8 vs 10)', () => {
    const hostCountByDc = new Map([
      ['dc-a', 8],
      ['dc-b', 10],
    ]);
    const result = analyzeStretchCluster({
      scopeKey: 'dc-a+dc-b|cluster-01',
      scopeLabel: 'cluster-01',
      hostCountByDc,
    });
    expect(result.isStretchCluster).toBe(true);
    expect(result.confidence).toBe('medium');
  });

  it('upgrades to high confidence when 2-DC symmetric AND name matches', () => {
    const hostCountByDc = new Map([
      ['dc-a', 8],
      ['dc-b', 8],
    ]);
    const result = analyzeStretchCluster({
      scopeKey: 'dc-a+dc-b|Metro-Cluster',
      scopeLabel: 'Metro-Cluster',
      hostCountByDc,
    });
    expect(result.isStretchCluster).toBe(true);
    expect(result.confidence).toBe('high');
    expect(result.signals.some((s) => s.includes('metro'))).toBe(true);
  });

  it('returns medium confidence for name keyword match alone', () => {
    const result = analyzeStretchCluster({
      scopeKey: 'dc-a|stretched-prod',
      scopeLabel: 'stretched-prod',
    });
    expect(result.isStretchCluster).toBe(true);
    expect(result.confidence).toBe('medium');
  });

  it('asymmetric 2-DC host distribution without name match is not stretched', () => {
    // 4 vs 16 is 75% off — not symmetric
    const hostCountByDc = new Map([
      ['dc-a', 4],
      ['dc-b', 16],
    ]);
    const result = analyzeStretchCluster({
      scopeKey: 'dc-a+dc-b|prod',
      scopeLabel: 'prod',
      hostCountByDc,
    });
    expect(result.isStretchCluster).toBe(false);
    expect(result.confidence).toBe('low');
  });

  it('single-DC cluster without signals is not stretched', () => {
    const hostCountByDc = new Map([['dc-a', 10]]);
    const result = analyzeStretchCluster({
      scopeKey: 'dc-a|cluster-01',
      scopeLabel: 'cluster-01',
      hostCountByDc,
    });
    expect(result.isStretchCluster).toBe(false);
    expect(result.confidence).toBe('low');
    expect(result.signals).toEqual([]);
  });

  it('3-DC topology is not treated as stretched (stretched is strictly 2-site)', () => {
    const hostCountByDc = new Map([
      ['dc-a', 8],
      ['dc-b', 8],
      ['dc-c', 8],
    ]);
    const result = analyzeStretchCluster({
      scopeKey: 'multi|cluster',
      scopeLabel: 'cluster',
      hostCountByDc,
    });
    expect(result.isStretchCluster).toBe(false);
  });

  it('faultDomainCount of 1 does not trigger', () => {
    const result = analyzeStretchCluster({
      scopeKey: 'dc-a|cluster',
      scopeLabel: 'cluster',
      faultDomainCount: 1,
    });
    expect(result.isStretchCluster).toBe(false);
  });

  it('explicitStretchFromVsan=false does not override other weak signals', () => {
    const result = analyzeStretchCluster({
      scopeKey: 'dc-a|stretched-prod',
      scopeLabel: 'stretched-prod',
      explicitStretchFromVsan: false,
    });
    // Name keyword still fires — we only short-circuit on true
    expect(result.isStretchCluster).toBe(true);
    expect(result.confidence).toBe('medium');
  });

  it('keyword match is case-insensitive and word-bounded', () => {
    const positives = ['Stretch', 'STRETCHED', 'Metro'];
    const negatives = ['production', 'dev-stretcher', 'metropark'];
    for (const label of positives) {
      expect(analyzeStretchCluster({ scopeKey: 'k', scopeLabel: label }).isStretchCluster).toBe(true);
    }
    for (const label of negatives) {
      expect(analyzeStretchCluster({ scopeKey: 'k', scopeLabel: label }).isStretchCluster).toBe(false);
    }
  });
});
