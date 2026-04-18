import { z } from 'zod';

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
 * Required non-negative integer field (e.g., totalVcpus, totalPcores, totalVms).
 * Uses z.preprocess (NOT z.coerce.number) so that empty strings → ZodError.
 */
const requiredNonNegativeInt = z.preprocess(
  numericPreprocess,
  z.number({ error: 'This field is required' }).nonnegative().int(),
);

/**
 * Optional non-negative numeric field.
 * Absent or empty string → undefined (no error); provided value must be non-negative.
 */
const optionalNonNegativeNumber = z.preprocess(
  numericPreprocess,
  z.number().nonnegative().optional(),
);

/**
 * Optional percentage field (0–100).
 * Absent or empty string → undefined (no error); provided value must be in range [0, 100].
 */
const optionalPercent = z.preprocess(
  numericPreprocess,
  z.number().min(0).max(100).optional(),
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
 * Zod schema for OldCluster form input.
 *
 * Validates user-entered cluster metrics before they are stored.
 * Required fields: totalVcpus, totalPcores, totalVms (all non-negative integers).
 * Optional fields: totalDiskGb, socketsPerServer, coresPerSocket, ramPerServerGb.
 *
 * Behavior: empty string for required field → ZodError (no silent coercion to 0).
 */
export const currentClusterSchema = z.object({
  totalVcpus: requiredNonNegativeInt,
  totalPcores: requiredNonNegativeInt,
  totalVms: requiredNonNegativeInt,
  totalDiskGb: optionalNonNegativeNumber,
  socketsPerServer: optionalNonNegativeNumber,
  coresPerSocket: optionalNonNegativeNumber,
  ramPerServerGb: optionalNonNegativeNumber,
  existingServerCount: optionalNonNegativeNumber,
  specintPerServer: optionalPositiveNumber,
  cpuUtilizationPercent: optionalPercent,
  ramUtilizationPercent: optionalPercent,
  cpuFrequencyGhz: optionalPositiveNumber,
  isStretchCluster: z.boolean().optional(),
});

export type CurrentClusterInput = z.infer<typeof currentClusterSchema>;
