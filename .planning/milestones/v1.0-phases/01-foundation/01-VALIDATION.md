---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.0.18 |
| **Config file** | `vitest.config.ts` — Wave 0 (does not exist yet) |
| **Quick run command** | `npx vitest run src/lib/sizing/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/sizing/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green + `npx tsc --noEmit` zero errors
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | (scaffold) | build | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 1 | CALC-01 | unit | `npx vitest run src/lib/sizing/__tests__/formulas.test.ts` | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 1 | CALC-02 | unit | `npx vitest run src/lib/sizing/__tests__/formulas.test.ts` | ❌ W0 | ⬜ pending |
| 1-02-03 | 02 | 1 | CALC-03 | unit | `npx vitest run src/lib/sizing/__tests__/formulas.test.ts` | ❌ W0 | ⬜ pending |
| 1-02-04 | 02 | 1 | CALC-04 | unit | `npx vitest run src/lib/sizing/__tests__/constraints.test.ts` | ❌ W0 | ⬜ pending |
| 1-02-05 | 02 | 1 | CALC-05 | unit | `npx vitest run src/lib/sizing/__tests__/constraints.test.ts` | ❌ W0 | ⬜ pending |
| 1-02-06 | 02 | 1 | CALC-06 | unit | `npx vitest run src/lib/sizing/__tests__/constraints.test.ts` | ❌ W0 | ⬜ pending |
| 1-02-07 | 02 | 1 | CALC-07 | unit | `npx vitest run src/lib/display/__tests__/formulaStrings.test.ts` | ❌ W0 | ⬜ pending |
| 1-03-01 | 03 | 2 | (cross-cutting) | unit | `npx vitest run src/lib/sizing/__tests__/parseNumericInput.test.ts` | ❌ W0 | ⬜ pending |
| 1-04-01 | 04 | 2 | (cross-cutting) | unit | `npx vitest run src/hooks/__tests__/useScenariosResults.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `package.json` — Vite + React + TypeScript project scaffolding (`npm create vite@latest`)
- [ ] `vitest.config.ts` — jsdom environment, globals: true, coverage config
- [ ] `tsconfig.json` — strict: true, noImplicitAny, noUnusedLocals, noUnusedParameters
- [ ] `src/lib/sizing/__tests__/formulas.test.ts` — CALC-01/02/03 with 3 fixture pairs + boundary rounding cases
- [ ] `src/lib/sizing/__tests__/constraints.test.ts` — CALC-04/05/06; `computeScenarioResult` public API tests
- [ ] `src/lib/sizing/__tests__/parseNumericInput.test.ts` — empty string, zero, negative, non-numeric inputs
- [ ] `src/lib/display/__tests__/formulaStrings.test.ts` — CALC-07 display string format verification
- [ ] `src/hooks/__tests__/useScenariosResults.test.ts` — hook returns correct ScenarioResult[] for fixture inputs

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
