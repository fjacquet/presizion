---
phase: 33
slug: pptx-slide-consolidation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 33 — Validation Strategy

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
| 33-01-01 | 01 | 1 | MERGE-01 | unit | `npx vitest run src/lib/utils/__tests__/exportPptx.test.ts` | ✅ | ⬜ pending |
| 33-02-01 | 02 | 1 | MERGE-02, MERGE-03 | unit | `npx vitest run src/lib/utils/__tests__/exportPptx.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements — exportPptx.test.ts already has mock setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Merged "Sizing Parameters" slide layout renders correctly | MERGE-01 | Visual layout in PowerPoint | Export PPTX, verify single slide with 3 stacked table sections |
| Capacity chart + breakdown table co-exist on same slide | MERGE-02 | Visual rendering | Export PPTX, verify chart and table both visible on one slide |
| Slide count decreased by 3+ | MERGE-01..03 | End-to-end count | Export PPTX, count total slides vs pre-v2.5 baseline |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
