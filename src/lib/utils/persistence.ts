import { z } from 'zod';
import type { OldCluster, Scenario } from '../../types/cluster';
import type { SizingMode, LayoutMode } from '../../store/useWizardStore';
import type { ExclusionRules } from '../../types/exclusions';
import { currentClusterSchema } from '../../schemas/currentClusterSchema';
import { scenarioSchema } from '../../schemas/scenarioSchema';

const STORAGE_KEY = 'presizion-session';

/**
 * Maximum allowed character length of an encoded URL hash payload.
 * Approximate proxy for byte size since base64url output is ASCII-only.
 */
const HASH_MAX_BYTES = 8192;

/**
 * The full application session that is persisted to localStorage.
 * Captures the cluster, all scenarios, and UI mode settings.
 */
export interface SessionData {
  cluster: OldCluster;
  scenarios: Scenario[];
  sizingMode: SizingMode;
  layoutMode: LayoutMode;
  exclusions?: ExclusionRules;
  /** Set by encodeSessionToHash when hash-size truncation dropped rules. */
  truncated?: boolean;
}

const exclusionsSchema = z
  .object({
    namePattern: z.string().default(''),
    exactNames: z.array(z.string()).default([]),
    excludePoweredOff: z.boolean().default(false),
    manuallyExcluded: z.array(z.string()).default([]),
    manuallyIncluded: z.array(z.string()).default([]),
  })
  .optional();

/**
 * Zod schema for parsing a stored session.
 * - Uses the same cluster and scenario schemas as the forms.
 * - Provides defaults for sizingMode and layoutMode so old sessions without these fields still load.
 * - Unknown fields are stripped (Zod's default strip behavior).
 */
const sessionSchema = z.object({
  cluster: currentClusterSchema,
  scenarios: z.array(scenarioSchema),
  sizingMode: z.enum(['vcpu', 'specint', 'aggressive', 'ghz']).default('vcpu'),
  layoutMode: z.enum(['hci', 'disaggregated']).default('hci'),
  exclusions: exclusionsSchema,
  truncated: z.boolean().optional(),
});

/**
 * Serialize a session to a JSON string.
 * Pure function — no side effects.
 */
export function serializeSession(data: SessionData): string {
  return JSON.stringify(data);
}

/**
 * Deserialize a JSON string back to SessionData.
 * Returns null if the JSON is malformed or fails validation.
 * Unknown fields are stripped (Zod default), not rejected.
 */
export function deserializeSession(json: string): SessionData | null {
  try {
    const parsed = JSON.parse(json) as unknown;
    const result = sessionSchema.safeParse(parsed);
    if (!result.success) return null;
    return result.data as SessionData;
  } catch {
    return null;
  }
}

/**
 * Write the session to localStorage.
 * Silently ignores failures (e.g., storage quota exceeded, private browsing restrictions).
 */
export function saveToLocalStorage(data: SessionData): void {
  try {
    localStorage.setItem(STORAGE_KEY, serializeSession(data));
  } catch {
    // Silently ignore write failures
  }
}

/**
 * Read the session from localStorage.
 * Returns null when:
 * - The key does not exist
 * - The stored value is malformed or fails schema validation
 * - localStorage is inaccessible (e.g., SecurityError in private browsing)
 */
export function loadFromLocalStorage(): SessionData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    return deserializeSession(raw);
  } catch {
    return null;
  }
}

function encodeInner(data: SessionData): string {
  const json = serializeSession(data);
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Encode a session to a URL-safe base64 string (no padding) for use as a URL hash.
 * Uses base64url encoding: '+' → '-', '/' → '_', '=' stripped.
 *
 * Graceful degradation ladder (stops at first attempt under HASH_MAX_BYTES):
 *   0. Full payload (no truncation).
 *   1. Drop `exclusions.manuallyExcluded`.
 *   2. Drop `exclusions.manuallyExcluded` + `exclusions.exactNames`.
 *   3. Drop `exclusions` entirely.
 *
 * Attempts ≥ 1 mark the serialized payload with `truncated: true` so decoders
 * can surface a toast to the user.
 */
export function encodeSessionToHash(data: SessionData): string {
  const attempts: Array<(d: SessionData) => SessionData> = [
    (d) => d,
    (d) =>
      d.exclusions
        ? { ...d, exclusions: { ...d.exclusions, manuallyExcluded: [] } }
        : d,
    (d) =>
      d.exclusions
        ? { ...d, exclusions: { ...d.exclusions, manuallyExcluded: [], exactNames: [] } }
        : d,
    (d) => {
      const rest: SessionData = { ...d };
      delete rest.exclusions;
      return rest;
    },
  ];

  let lastEncoded = '';
  for (let i = 0; i < attempts.length; i++) {
    const transform = attempts[i]!;
    const trimmed = transform(data);
    const payload: SessionData = i === 0 ? trimmed : { ...trimmed, truncated: true };
    const encoded = encodeInner(payload);
    if (encoded.length <= HASH_MAX_BYTES) return encoded;
    lastEncoded = encoded;
  }
  // Last resort: return whatever the most-trimmed attempt produced.
  return lastEncoded;
}

/**
 * Decode a URL hash string back to SessionData.
 * - Accepts hash with or without a leading '#'.
 * - Returns null for empty string, '#', malformed base64, or invalid schema.
 * - The `truncated` flag (if any) was set by the encoder and is already in the
 *   deserialized payload, so no extra handling is required here.
 */
export function decodeSessionFromHash(hash: string): SessionData | null {
  try {
    const stripped = hash.startsWith('#') ? hash.slice(1) : hash;
    if (!stripped) return null;
    // Restore standard base64 from URL-safe base64
    const base64 = stripped.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    return deserializeSession(json);
  } catch {
    return null;
  }
}
