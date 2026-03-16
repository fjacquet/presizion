---
phase: 31
slug: step-3-review-export
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-16
---

# Phase 31 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `rtk vitest run src/components/step3/__tests__/` |
| **Full suite command** | `rtk vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `rtk vitest run src/components/step3/__tests__/`
- **After every plan wave:** Run `rtk vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 31-01-01 | 01 | 1 | REVIEW-01 | unit | `rtk vitest run src/components/step3/__tests__/ComparisonTable.test.tsx` | ✅ | ⬜ pending |
| 31-01-02 | 01 | 1 | REVIEW-02, REVIEW-06 | unit | `rtk vitest run src/components/step3/__tests__/` | ✅ | ⬜ pending |
| 31-02-01 | 02 | 1 | REVIEW-03 | unit | `rtk vitest run src/components/step3/__tests__/Step3ReviewExport.test.tsx` | ✅ | ⬜ pending |
| 31-02-02 | 02 | 1 | REVIEW-04, REVIEW-05 | unit+manual | `rtk vitest run` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Extract `useIsMobile` hook to `src/hooks/useIsMobile.ts` (shared between ImportPreviewModal and export bottom sheet)

*Existing vitest infrastructure covers all requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sticky first column while scrolling table | REVIEW-01 | Visual + interaction | At 390px, swipe comparison table → Metric column stays fixed |
| Chart heights reduced on mobile | REVIEW-02 | Visual layout | At 390px, charts are shorter, no bleed outside viewport |
| Bottom sheet export on mobile | REVIEW-03 | Visual + interaction | At 390px, single "Export" button → sheet slides up with all options |
| iOS PDF opens in new tab | REVIEW-04 | Requires physical iPhone | Tap Export PDF on iOS Safari → new tab with PDF, toast shown |
| PNG not blurry on retina | REVIEW-05 | Requires high-DPI screen | Download chart PNG → verify crisp at 2x/3x |
| Chart labels readable at 390px | REVIEW-06 | Visual check | Charts at 390px → axis labels and legend readable |

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
