---
phase: 32
slug: pptx-visual-polish-ux-fix
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 32 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 32-01-01 | 01 | 1 | UX-01 | unit | `npx vitest run src/lib/sizing/__tests__/defaults.test.ts` | ❌ W0 | ⬜ pending |
| 32-02-01 | 02 | 1 | VISUAL-01 | unit | `npx vitest run src/lib/utils/__tests__/exportPptx.test.ts` | ✅ | ⬜ pending |
| 32-02-02 | 02 | 1 | VISUAL-02 | unit | `npx vitest run src/lib/utils/__tests__/exportPptx.test.ts` | ✅ | ⬜ pending |
| 32-02-03 | 02 | 1 | VISUAL-03 | unit | `npx vitest run src/lib/utils/__tests__/exportPptx.test.ts` | ✅ | ⬜ pending |
| 32-02-04 | 02 | 1 | VISUAL-04 | unit | `npx vitest run src/lib/utils/__tests__/exportPptx.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/sizing/__tests__/defaults.test.ts` — stubs for UX-01 (createDefaultScenario name assertion)

*Existing exportPptx.test.ts covers VISUAL-01..04 test infrastructure.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Accent strip visible on content slides | VISUAL-01 | Visual rendering in PowerPoint | Export PPTX, open in PowerPoint, verify navy strip on left edge |
| Utilization color dots render correctly | VISUAL-02 | Color rendering in PowerPoint | Export PPTX, verify green/amber/red dots next to util values |
| KPI boxes have rounded-rect background | VISUAL-04 | Shape rendering in PowerPoint | Export PPTX, verify KPI callouts have light blue-gray rounded boxes |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
