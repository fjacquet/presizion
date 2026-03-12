// VALIDATION.md: cross-cutting — parseNumericInput NaN cascade prevention
import { describe, it, expect } from 'vitest';
import { parseNumericInput, parsePositiveInput } from '../parseNumericInput';

describe('parseNumericInput', () => {
  it('returns null for empty string', () => {
    expect(parseNumericInput('')).toBeNull();
  });
  it('returns null for undefined', () => {
    expect(parseNumericInput(undefined)).toBeNull();
  });
  it('returns null for non-numeric string', () => {
    expect(parseNumericInput('abc')).toBeNull();
  });
  it('returns null for Infinity', () => {
    expect(parseNumericInput('Infinity')).toBeNull();
  });
  it('returns null for NaN', () => {
    expect(parseNumericInput(NaN)).toBeNull();
  });
  it('returns 0 for string "0"', () => {
    expect(parseNumericInput('0')).toBe(0);
  });
  it('returns the number for valid positive string', () => {
    expect(parseNumericInput('3.5')).toBe(3.5);
  });
  it('returns the number for valid negative string (allowed by parseNumericInput)', () => {
    expect(parseNumericInput(-5)).toBe(-5);
  });
});

describe('parsePositiveInput', () => {
  it('returns null for zero', () => {
    expect(parsePositiveInput(0)).toBeNull();
  });
  it('returns null for negative numbers', () => {
    expect(parsePositiveInput(-1)).toBeNull();
  });
  it('returns the number for valid positive string', () => {
    expect(parsePositiveInput('4')).toBe(4);
  });
  it('returns null for empty string', () => {
    expect(parsePositiveInput('')).toBeNull();
  });
});
