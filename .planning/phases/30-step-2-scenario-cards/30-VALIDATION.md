---
phase: 30
slug: step-2-scenario-cards
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-16
---

# Phase 30 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `rtk vitest run src/components/step2/__tests__/` |
| **Full suite command** | `rtk vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `rtk vitest run src/components/step2/__tests__/`
- **After every plan wave:** Run `rtk vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 30-01-01 | 01 | 1 | CARD-01..04 | unit | `rtk vitest run src/components/step2/__tests__/` | ✅ | ⬜ pending |
| 30-02-01 | 02 | 1 | CARD-05 | unit | `rtk vitest run` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing vitest infrastructure covers all requirements. No new test infra needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cards stack vertically at 390px | CARD-01 | Visual layout | Resize to 390px, verify no side-by-side cards |
| Server config 2-col grid at 390px | CARD-02 | Visual layout | Resize to 390px, verify 2-column grid |
| vSAN fields readable at 390px | CARD-04 | Visual layout | Open vSAN section, resize to 390px |
| SPEC lookup usable at 390px | CARD-05 | Visual + interaction | Search CPU at 390px, verify no overflow |

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
