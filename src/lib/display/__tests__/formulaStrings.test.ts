// VALIDATION.md: CALC-07 — formula display strings for inline UI rendering
// Imported functions will come from src/lib/display/formulaStrings.ts (Plan 04)
import { describe, it } from 'vitest';

// The display module returns a human-readable formula string showing
// both the formula template and the substituted values.
// Example: getCpuFormulaString({totalVcpus:3200, headroomPercent:20, ratio:4, coresPerServer:40})
//   → "ceil(3200 × 1.20 / 4 / 40) = 24 servers"

describe('getCpuFormulaString', () => {
  it.todo('returns formula string with substituted values for CPU constraint');
  it.todo('string contains the computed result');
});

describe('getRamFormulaString', () => {
  it.todo('returns formula string with substituted values for RAM constraint');
});

describe('getDiskFormulaString', () => {
  it.todo('returns formula string with substituted values for disk constraint');
});
