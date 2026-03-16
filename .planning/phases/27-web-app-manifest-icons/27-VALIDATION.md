---
phase: 27
slug: web-app-manifest-icons
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-16
---

# Phase 27 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `rtk vitest run src/__tests__/manifest.test.ts` |
| **Full suite command** | `rtk vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `rtk vitest run src/__tests__/manifest.test.ts`
- **After every plan wave:** Run `rtk vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 27-01-01 | 01 | 1 | MANIFEST-01 | unit | `rtk vitest run src/__tests__/manifest.test.ts` | ❌ W0 | ⬜ pending |
| 27-01-02 | 01 | 1 | MANIFEST-02 | unit | `rtk vitest run src/__tests__/manifest.test.ts` | ❌ W0 | ⬜ pending |
| 27-01-03 | 01 | 1 | MANIFEST-03 | unit | `rtk vitest run src/__tests__/manifest.test.ts` | ❌ W0 | ⬜ pending |
| 27-01-04 | 01 | 1 | MANIFEST-04 | unit | `rtk vitest run src/__tests__/manifest.test.ts` | ❌ W0 | ⬜ pending |
| 27-01-05 | 01 | 1 | MANIFEST-05 | unit | `rtk vitest run src/__tests__/manifest.test.ts` | ❌ W0 | ⬜ pending |
| 27-01-06 | 01 | 1 | MANIFEST-06 | manual | Chrome DevTools Application tab | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/manifest.test.ts` — stubs for MANIFEST-01..05 (read static files, parse JSON, check HTML meta tags)

*Existing vitest infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| iOS home screen icon shows Presizion logo | MANIFEST-04 | Requires physical iPhone + Safari | Add to Home Screen → verify icon is Presizion P, not screenshot |
| Android home screen install + standalone launch | MANIFEST-01 | Requires physical Android + Chrome | Add to Home Screen → verify standalone mode, no browser chrome |
| viewport-fit=cover renders without white bars | MANIFEST-06 | Requires notched device | Open on iPhone with notch → verify no white bars at edges |
| theme-color shows in address bar | MANIFEST-05 | Requires Chrome on Android | Open in Chrome → verify blue address bar |

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
