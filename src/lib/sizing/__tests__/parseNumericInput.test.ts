// VALIDATION.md: cross-cutting — parseNumericInput NaN cascade prevention
import { describe, it } from 'vitest';

describe('parseNumericInput', () => {
  it.todo('returns null for empty string');
  it.todo('returns null for undefined');
  it.todo('returns null for non-numeric string');
  it.todo('returns null for Infinity');
  it.todo('returns null for NaN');
  it.todo('returns 0 for string "0"');
  it.todo('returns the number for valid positive string');
  it.todo('returns the number for valid negative string (allowed by parseNumericInput)');
});

describe('parsePositiveInput', () => {
  it.todo('returns null for zero');
  it.todo('returns null for negative numbers');
  it.todo('returns the number for valid positive string');
  it.todo('returns null for empty string');
});
