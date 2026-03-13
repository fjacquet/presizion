---
phase: 6
slug: conditional-ui-wiring
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.0 with jsdom + @testing-library/react |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `rtk vitest run` |
| **Full suite command** | `rtk vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds (205 tests baseline) |

---

## Sampling Rate

- **After every task commit:** Run `rtk vitest run`
- **After every plan wave:** Run `rtk vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green + `npm run build` clean
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 6-01-01 | 01 | 1 | PERF-02 | unit | `rtk vitest run src/components/wizard/__tests__/` | ❌ Wave 0 | ⬜ pending |
| 6-01-02 | 01 | 1 | PERF-02/PERF-03 | unit | `rtk vitest run src/components/step1/__tests__/` | ✅ (extend) | ⬜ pending |
| 6-02-01 | 02 | 2 | PERF-03 | unit | `rtk vitest run src/components/step2/__tests__/` | ✅ (extend) | ⬜ pending |
| 6-02-02 | 02 | 2 | PERF-03 (SC-3) | unit | `rtk vitest run src/components/step3/__tests__/` | ❌ Wave 0 | ⬜ pending |
| 6-02-03 | 02 | 2 | SC-4 | unit | `rtk vitest run src/components/step1/__tests__/` | ✅ (extend) | ⬜ pending |
| 6-02-04 | 02 | 2 | build | build | `npm run build 2>&1 \| tail -5` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/wizard/__tests__/SizingModeToggle.test.tsx` — stubs for PERF-01 (toggle visibility, aria-pressed, setSizingMode calls)
- [ ] `src/components/step3/__tests__/ComparisonTable.test.tsx` — stubs for PERF-03 (SC-3): 'SPECint' label (not 'Specint') in limiting resource row

*Existing test files (CurrentClusterForm, ScenarioCard, ScenarioResults) extended in-place — no new test files needed for those.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mode toggle visible in WizardShell header across all 3 steps | PERF-01 | Layout/visual placement requires browser inspection | Switch between steps with SPECint mode active; confirm toggle stays visible |
| Switching SPECint → vCPU hides fields but retains stored values | PERF-02/03 | State retention on mode switch requires interactive test | Enter SPECint values, switch to vCPU, switch back — values should be retained |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
