---
phase: 4
slug: deployment-and-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.0 with jsdom |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~15 seconds (155 tests baseline) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green + manual dark mode smoke test
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 1 | DEPLOY-01 | config | `grep "base.*presizion" vite.config.ts` | ✅ vite.config.ts | ⬜ pending |
| 4-01-02 | 01 | 1 | DEPLOY-01 | build | `npm run build && ls dist/` | N/A (artifact) | ⬜ pending |
| 4-01-03 | 01 | 1 | DEPLOY-01 | CI | `.github/workflows/deploy.yml` exists | ❌ Wave 0 | ⬜ pending |
| 4-02-01 | 02 | 2 | UX-06 | unit | `npm run test -- darkMode` | ❌ Wave 0 | ⬜ pending |
| 4-02-02 | 02 | 2 | UX-06 | unit | `npm run test -- ComparisonTable` | ✅ exists (needs extension) | ⬜ pending |
| 4-03-01 | 03 | 2 | CALC-07 | unit | `npm run test -- display` | ❌ Wave 0 | ⬜ pending |
| 4-03-02 | 03 | 2 | CALC-07 | unit | `npm run test -- ScenarioResults` | ✅ exists (needs extension) | ⬜ pending |
| 4-04-01 | 04 | 2 | UX-05 | unit | `npm run test -- Step3ReviewExport` | ✅ exists (needs extension) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/darkMode.test.ts` — stubs for UX-06 anti-flash script behavior (mock `window.matchMedia`)
- [ ] `src/lib/sizing/__tests__/display.test.ts` — stubs for CALC-07 formula string functions
- [ ] `.github/workflows/deploy.yml` — GitHub Actions deployment workflow (not a test, required for DEPLOY-01)

*Existing test files (`ComparisonTable.test.tsx`, `ScenarioResults.test.tsx`, `Step3ReviewExport.test.tsx`) need extension, not Wave 0 creation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dark mode renders correctly in OS dark mode | UX-06 | jsdom cannot render actual CSS; matchMedia is mocked | Set OS to dark mode, run `npm run dev`, inspect all 3 wizard steps |
| shadcn/ui tokens (--background, --foreground, etc.) render in dark mode | UX-06 | CSS variable inspection requires real browser | Open DevTools > Elements, verify `.dark` class on `<html>`, check computed CSS vars |
| Deployed app loads at `https://fjacquet.github.io/presizion/` | DEPLOY-01 | GitHub Pages availability is a manual step | After Actions deploy, visit URL in browser; check no 404/blank page |
| No FOUC (flash of wrong theme) on page load | UX-06 | FOUC requires real browser with throttled JS | Load page with CPU throttle 4x; confirm no white flash in dark OS mode |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
