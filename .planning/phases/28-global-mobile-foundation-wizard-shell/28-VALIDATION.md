---
phase: 28
slug: global-mobile-foundation-wizard-shell
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-16
---

# Phase 28 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `rtk vitest run src/components/wizard/__tests__/` |
| **Full suite command** | `rtk vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `rtk vitest run src/components/wizard/__tests__/`
- **After every plan wave:** Run `rtk vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 28-01-01 | 01 | 1 | MOBILE-01 | unit | `rtk vitest run` | ❌ W0 | ⬜ pending |
| 28-01-02 | 01 | 1 | MOBILE-02 | manual | Visual check on iPhone | N/A | ⬜ pending |
| 28-01-03 | 01 | 1 | MOBILE-04 | unit | `rtk vitest run` | ❌ W0 | ⬜ pending |
| 28-02-01 | 02 | 1 | MOBILE-03, NAV-01..04 | unit | `rtk vitest run src/components/wizard/__tests__/` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Verify existing wizard tests pass before changes
- [ ] Tests for touch target minimum sizes (44px) on buttons/indicators

*Existing vitest infrastructure covers most requirements. CSS-only changes verified via snapshot or manual.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| iOS auto-zoom prevention on input focus | MOBILE-01 | Requires physical iPhone | Tap any numeric input → viewport should not zoom |
| dvh viewport height on iOS Safari | MOBILE-02 | Requires physical iPhone | Content should not be hidden behind Safari chrome |
| Header fits on one line at 390px | NAV-01 | Visual check | Resize browser to 390px, verify no wrapping |
| SizingModeToggle wraps without horizontal scroll | NAV-03 | Visual check | Resize to 390px, verify no horizontal scrollbar |

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
