/**
 * Stretch cluster detection — pure, no I/O.
 *
 * Inputs are assembled by the parser (vSAN sheet probe when available, host
 * distribution from vHost/ESX sheets, and the scope label string). Output is
 * a verdict plus human-readable signals that feed the preview tooltip.
 */

export type StretchConfidence = 'high' | 'medium' | 'low';

export interface StretchAnalysis {
  readonly isStretchCluster: boolean;
  readonly confidence: StretchConfidence;
  readonly signals: readonly string[];
}

export interface StretchDetectorInput {
  readonly scopeKey: string;
  readonly scopeLabel: string;
  /** Host counts grouped by datacenter / fault domain, when known. */
  readonly hostCountByDc?: ReadonlyMap<string, number>;
  /** Explicit flag from vSAN sheet "Stretched Cluster" column. */
  readonly explicitStretchFromVsan?: boolean;
  /** Number of distinct fault domains seen in the vSAN sheet for this cluster. */
  readonly faultDomainCount?: number;
}

const NAME_KEYWORD_RE = /\b(stretch(ed)?|metro)\b/i;
const SYMMETRY_TOLERANCE = 0.25;

function isSymmetric(a: number, b: number): boolean {
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  if (hi === 0) return false;
  return (hi - lo) / hi <= SYMMETRY_TOLERANCE;
}

/**
 * Analyze a cluster for stretched topology signals.
 *
 * Priority:
 *   1. Explicit vSAN signal (stretched column, or ≥2 fault domains).
 *   2. Two DCs with symmetric host counts.
 *   3. Name keyword match (stretch / stretched / metro).
 * Anything else → low confidence, not stretched.
 */
export function analyzeStretchCluster(input: StretchDetectorInput): StretchAnalysis {
  const signals: string[] = [];

  if (input.explicitStretchFromVsan === true) {
    signals.push('vSAN sheet marks cluster as stretched');
    return { isStretchCluster: true, confidence: 'high', signals };
  }

  if (typeof input.faultDomainCount === 'number' && input.faultDomainCount >= 2) {
    signals.push(`vSAN sheet lists ${input.faultDomainCount} fault domains`);
    return { isStretchCluster: true, confidence: 'high', signals };
  }

  if (input.hostCountByDc && input.hostCountByDc.size === 2) {
    const [a, b] = Array.from(input.hostCountByDc.values()) as [number, number];
    if (isSymmetric(a, b)) {
      const dcs = Array.from(input.hostCountByDc.keys()).join(' / ');
      signals.push(`2 datacenters with symmetric host counts (${a} / ${b} across ${dcs})`);
      const nameMatch = NAME_KEYWORD_RE.test(input.scopeLabel);
      if (nameMatch) signals.push(`scope label "${input.scopeLabel}" contains stretch/metro keyword`);
      return {
        isStretchCluster: true,
        confidence: nameMatch ? 'high' : 'medium',
        signals,
      };
    }
  }

  if (NAME_KEYWORD_RE.test(input.scopeLabel)) {
    signals.push(`scope label "${input.scopeLabel}" contains stretch/metro keyword`);
    return { isStretchCluster: true, confidence: 'medium', signals };
  }

  return { isStretchCluster: false, confidence: 'low', signals };
}
