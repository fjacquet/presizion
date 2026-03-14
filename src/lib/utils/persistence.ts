import { z } from 'zod';
import type { OldCluster, Scenario } from '../../types/cluster';
import type { SizingMode, LayoutMode } from '../../store/useWizardStore';
import { currentClusterSchema } from '../../schemas/currentClusterSchema';
import { scenarioSchema } from '../../schemas/scenarioSchema';

const STORAGE_KEY = 'presizion-session';

/**
 * The full application session that is persisted to localStorage.
 * Captures the cluster, all scenarios, and UI mode settings.
 */
export interface SessionData {
  cluster: OldCluster;
  scenarios: Scenario[];
  sizingMode: SizingMode;
  layoutMode: LayoutMode;
}

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

/**
 * Encode a session to a URL-safe base64 string (no padding) for use as a URL hash.
 * Uses base64url encoding: '+' → '-', '/' → '_', '=' stripped.
 */
export function encodeSessionToHash(data: SessionData): string {
  const json = serializeSession(data);
  return btoa(json)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Decode a URL hash string back to SessionData.
 * - Accepts hash with or without a leading '#'.
 * - Returns null for empty string, '#', malformed base64, or invalid schema.
 */
export function decodeSessionFromHash(hash: string): SessionData | null {
  try {
    const stripped = hash.startsWith('#') ? hash.slice(1) : hash;
    if (!stripped) return null;
    // Restore standard base64 from URL-safe base64
    const base64 = stripped
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    // Add padding if needed
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    return deserializeSession(json);
  } catch {
    return null;
  }
}
