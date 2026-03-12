/**
 * Parses a value that may be a string, number, null, or undefined into a number.
 *
 * Returns null for any value that cannot be safely represented as a finite number:
 * - empty string
 * - undefined / null
 * - non-numeric strings (e.g. 'abc')
 * - 'Infinity', '-Infinity', NaN
 *
 * Allows negative numbers and zero — callers that need positive-only values
 * should use parsePositiveInput instead.
 *
 * NaN cascade prevention: all form inputs should pass through this function
 * before being used in any arithmetic to avoid silent propagation of NaN.
 */
export function parseNumericInput(
  value: string | number | undefined | null,
): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;

  const n = Number(value);

  if (!isFinite(n)) return null;

  return n;
}

/**
 * Like parseNumericInput but additionally rejects zero and negative numbers.
 * Returns null for any value that is not strictly positive (> 0).
 *
 * Use this for inputs where zero or negative values are nonsensical
 * (e.g. server counts, core counts, RAM sizes).
 */
export function parsePositiveInput(
  value: string | number | undefined | null,
): number | null {
  const n = parseNumericInput(value);
  if (n === null) return null;
  if (n <= 0) return null;
  return n;
}
