import { z } from 'zod';
import {
  DEFAULT_VCPU_TO_PCORE_RATIO,
  DEFAULT_HEADROOM_PERCENT,
  DEFAULT_HA_RESERVE_COUNT,
  DEFAULT_TARGET_CPU_UTILIZATION_PERCENT,
  DEFAULT_TARGET_RAM_UTILIZATION_PERCENT,
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
  z.number({ error: 'This field is required' }).positive(),
);

/**
 * Optional positive number field.
 * Absent or empty string → undefined (no error); provided value must be > 0.
 */
const optionalPositiveNumber = z.preprocess(
  numericPreprocess,
  z.number().positive().optional(),
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
  haReserveCount: z
    .union([z.literal(0), z.literal(1), z.literal(2)])
    .default(DEFAULT_HA_RESERVE_COUNT),
  targetSpecint: optionalPositiveNumber,
  targetCpuUtilizationPercent: z
    .preprocess(numericPreprocess, z.number().min(1).max(100).optional())
    .default(DEFAULT_TARGET_CPU_UTILIZATION_PERCENT),
  targetRamUtilizationPercent: z
    .preprocess(numericPreprocess, z.number().min(1).max(100).optional())
    .default(DEFAULT_TARGET_RAM_UTILIZATION_PERCENT),
  targetVmCount: z.preprocess(numericPreprocess, z.number().int().positive().optional()),
  minServerCount: z.preprocess(numericPreprocess, z.number().int().positive().optional()),
  targetCpuFrequencyGhz: optionalPositiveNumber,

  // vSAN settings (Phase 20 — all optional; absent = legacy sizing path per VSAN-12)
  vsanFttPolicy: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.enum(['mirror-1', 'mirror-2', 'mirror-3', 'raid5', 'raid6']).optional(),
  ),
  vsanCompressionFactor: z.preprocess(
    numericPreprocess,
    z.union([z.literal(1.0), z.literal(1.3), z.literal(1.5), z.literal(2.0), z.literal(3.0)]).optional(),
  ),
  vsanSlackPercent: z.preprocess(numericPreprocess, z.number().min(0).max(100).optional()),
  vsanCpuOverheadPercent: z.preprocess(numericPreprocess, z.number().min(0).max(100).optional()),
  vsanMemoryPerHostGb: z.preprocess(numericPreprocess, z.number().min(0).optional()),
  vsanVmSwapEnabled: z.boolean().optional().default(false),

  // Growth projections (Phase 20 — all optional; absent = 0% growth)
  cpuGrowthPercent: z.preprocess(numericPreprocess, z.number().min(0).max(200).optional()),
  memoryGrowthPercent: z.preprocess(numericPreprocess, z.number().min(0).max(200).optional()),
  storageGrowthPercent: z.preprocess(numericPreprocess, z.number().min(0).max(200).optional()),
});

export type ScenarioInput = z.infer<typeof scenarioSchema>;
