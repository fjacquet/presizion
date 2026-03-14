/**
 * Shared professional color palette for all bar charts.
 * Uses Tailwind 500-level colors chosen for accessibility (WCAG AA contrast on white).
 */
export const CHART_COLORS = [
  '#3b82f6', // blue-500 — CPU-limited / primary bar
  '#22c55e', // green-500 — RAM-limited
  '#f59e0b', // amber-500 — Disk-limited
  '#8b5cf6', // violet-500 — 4th scenario
  '#ec4899', // pink-500 — 5th scenario
  '#14b8a6', // teal-500 — 6th scenario
] as const
