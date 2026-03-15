# Task Completion Checklist

Before considering any task complete, verify:

## Code Quality
- [ ] `npx tsc -b` — zero TypeScript errors (NOT `tsc --noEmit`)
- [ ] `npx vitest run` — all 596+ tests pass, zero failures
- [ ] No `any` types introduced
- [ ] New formulas have unit tests with hand-calculated expected values
- [ ] New components have co-located tests in `__tests__/`

## Architecture
- [ ] Sizing formulas in `src/lib/sizing/` only (never in components)
- [ ] Import parsers in `src/lib/utils/import/` only
- [ ] Derive-on-read: no computed results stored in Zustand
- [ ] External URLs in `src/lib/config.ts`
- [ ] New Scenario fields are optional (preserve legacy path per VSAN-12)

## Common Pitfalls to Check
- [ ] `exactOptionalPropertyTypes`: optional props passed explicitly need `| undefined`
- [ ] `haReserveCount` literals need `as const` (type `0 | 1 | 2`)
- [ ] Recharts stacked bar labels: use custom function, not LabelList (cumulative values)
- [ ] ESX scope keys: check hostToCluster priority
- [ ] ImportPreviewModal: read from `previewCluster`, not `result`

## Before Committing
- [ ] Commit message follows convention: `feat:`, `fix:`, `test:`, `docs:`, `chore:`
- [ ] Include `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>` when applicable
- [ ] Use `rtk` prefix for all CLI commands
