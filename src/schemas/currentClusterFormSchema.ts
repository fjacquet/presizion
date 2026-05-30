import { z } from 'zod';
import { currentClusterSchema } from './currentClusterSchema';

/**
 * Step 1 FORM schema. Identical to the storage schema except utilization is
 * REQUIRED — the user must enter measured-or-estimated CPU and RAM utilization
 * before sizing. No 100% default (that over-sizes). Storage schema stays lenient
 * so legacy sessions still load; the live form is strict.
 */
const requiredPercent = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
  z.number({ error: 'Utilization is required — enter measured or estimated %' })
    .min(1, 'Must be at least 1%')
    .max(100, 'Cannot exceed 100%'),
);

export const currentClusterFormSchema = currentClusterSchema.extend({
  cpuUtilizationPercent: requiredPercent,
  ramUtilizationPercent: requiredPercent,
});

export type CurrentClusterFormInput = z.infer<typeof currentClusterFormSchema>;
