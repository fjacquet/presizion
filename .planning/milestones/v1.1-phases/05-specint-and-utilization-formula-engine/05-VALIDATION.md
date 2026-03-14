---
phase: 5
slug: specint-and-utilization-formula-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.0 with jsdom |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~15 seconds (166 tests baseline) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green + `npm run build` clean
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 1 | PERF-01/UTIL-01/02 | unit | `rtk vitest run src/lib/sizing/__tests__/` | ❌ Wave 0 stubs | ⬜ pending |
| 5-01-02 | 01 | 1 | PERF-01 | unit | `rtk vitest run src/store/__tests__/` | ❌ Wave 0 stubs | ⬜ pending |
| 5-02-01 | 02 | 2 | PERF-04/05 | unit | `rtk vitest run src/lib/sizing/__tests__/formulas.test.ts` | ✅ (extend) | ⬜ pending |
| 5-02-02 | 02 | 2 | UTIL-01/02/03 | unit | `rtk vitest run src/lib/sizing/__tests__/formulas.test.ts` | ✅ (extend) | ⬜ pending |
| 5-03-01 | 03 | 2 | PERF-04/05 | integration | `rtk vitest run src/store/__tests__/useScenariosResults.test.ts` | ❌ Wave 0 | ⬜ pending |
| 5-03-02 | 03 | 2 | PERF-01/04/05 | build | `npm run build 2>&1 \| tail -5` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/sizing/__tests__/formulas.test.ts` — extend with `it.todo` stubs for PERF-04/05 and UTIL-03 fixture cases
- [ ] `src/store/__tests__/useWizardStore.test.ts` — stubs for sizingMode getter/setter (PERF-01)
- [ ] `src/store/__tests__/useScenariosResults.test.ts` — stubs for SPECint mode integration (PERF-04/05)

*Existing `formulas.test.ts` already exists — extend, do not replace.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SPECint mode produces lower server count than vCPU mode for same cluster | PERF-04 | Formula correctness vs. reference spreadsheet | Compare output with known Dell reference sizing calc |
| Utilization % scaling produces intuitively correct right-sized counts | UTIL-03 | Sanity check against engineer expectations | Run with 65% CPU util — expect ~35% fewer servers than 100% util |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
