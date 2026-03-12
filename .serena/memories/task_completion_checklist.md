# Task Completion Checklist

When finishing any coding task, run in order:

1. `npm run lint` — must pass with zero errors
2. `npm run test` — all tests must pass
3. `npm run build` — production build must succeed

## PR Checklist (from constitution)
- [ ] Solution is simple (KISS) — could a plain function replace an abstraction?
- [ ] No logic duplicated elsewhere (DRY)
- [ ] Only building what is actually needed (YAGNI)
- [ ] No `any` introduced in TypeScript
- [ ] Sizing formulas remain centralized in `src/lib/sizing/`
- [ ] Component stays ≤ ~150 lines; single responsibility
- [ ] Lint, tests, build all pass locally
