import { z } from 'zod';
import {
  DEFAULT_VCPU_TO_PCORE_RATIO,
  DEFAULT_HEADROOM_PERCENT,
  DEFAULT_HA_RESERVE_ENABLED,
} from '../lib/sizing/defaults';

/**
 * Preprocessor for numeric form fields.
 * Converts numeric strings to numbers, but rejects empty strings (returns undefined).
 * This ensures empty form fields throw ZodError instead of silently coercing to 0.
 */
const numericPreprocess = (val: unknown) => {
  if (val === '' || val === null || val === undefined) return undefined;
  const n = Number(val);
  return isNaN(n) ? undefined : n;
};

/**
 * Required positive number field (no zeros allowed for server specs).
 * Uses z.preprocess (NOT z.coerce.number) so that empty strings → ZodError.
 */
const requiredPositiveNumber = z.preprocess(
  numericPreprocess,
  z.number({ required_error: 'This field is required' }).positive(),
);

/**
 * Zod schema for Scenario form input.
 *
 * Validates user-entered target server configuration and sizing assumptions.
 * Uses z.preprocess (never z.coerce.number) for all numeric fields.
 * Default values are imported from defaults.ts (single source of truth).
 *
 * Behavior: empty string for a numeric field → ZodError (no silent coercion to 0).
 */
export const scenarioSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Scenario name is required'),
  socketsPerServer: requiredPositiveNumber,
  coresPerSocket: requiredPositiveNumber,
  ramPerServerGb: requiredPositiveNumber,
  diskPerServerGb: requiredPositiveNumber,
  targetVcpuToPCoreRatio: z
    .preprocess(numericPreprocess, z.number().positive().optional())
    .default(DEFAULT_VCPU_TO_PCORE_RATIO),
  ramPerVmGb: requiredPositiveNumber,
  diskPerVmGb: requiredPositiveNumber,
  headroomPercent: z
    .preprocess(numericPreprocess, z.number().min(0).max(100).optional())
    .default(DEFAULT_HEADROOM_PERCENT),
  haReserveEnabled: z.boolean().default(DEFAULT_HA_RESERVE_ENABLED),
});

export type ScenarioInput = z.infer<typeof scenarioSchema>;
