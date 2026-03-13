/**
 * Maps a utilization percentage to a Tailwind color className.
 * < 70%  → green (healthy)
 * 70-89% → amber (watch)
 * >= 90% → red (danger)
 */
export function utilizationClass(pct: number): string {
  if (pct >= 90) return 'text-red-600 dark:text-red-400 font-semibold'
  if (pct >= 70) return 'text-amber-600 dark:text-amber-400'
  return 'text-green-600 dark:text-green-400'
}
