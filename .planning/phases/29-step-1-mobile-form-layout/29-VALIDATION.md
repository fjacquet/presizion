---
phase: 29
slug: step-1-mobile-form-layout
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-16
---

# Phase 29 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `rtk vitest run src/components/step1/__tests__/` |
| **Full suite command** | `rtk vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `rtk vitest run src/components/step1/__tests__/`
- **After every plan wave:** Run `rtk vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 29-01-01 | 01 | 1 | FORM-01 | unit | `rtk vitest run src/components/step1/__tests__/` | ✅ | ⬜ pending |
| 29-01-02 | 01 | 1 | FORM-02 | unit | `rtk vitest run src/components/step1/__tests__/DerivedMetricsPanel.test.tsx` | ✅ | ⬜ pending |
| 29-01-03 | 01 | 1 | FORM-03, FORM-05 | unit | `rtk vitest run` | ✅ | ⬜ pending |
| 29-02-01 | 02 | 1 | FORM-04 | unit | `rtk vitest run src/components/step1/__tests__/ImportPreviewModal.test.tsx` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Install shadcn Drawer component (`npx shadcn@latest add drawer`)

*Existing vitest infrastructure covers all requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Form fields single-column at 390px | FORM-01 | Visual layout check | Resize to 390px, verify single column stacking |
| ImportPreviewModal as bottom Drawer on phone | FORM-04 | Requires narrow viewport + interaction | Resize to < 640px, import file → verify drawer slides up |
| File import button + scope badge readable | FORM-05 | Visual check | Resize to 390px, verify no truncation |

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
