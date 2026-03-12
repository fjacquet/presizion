---
phase: 2
slug: input-forms
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x + @testing-library/react 16.x |
| **Config file** | `vitest.config.ts` (exists — jsdom environment, globals: true) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test` (full suite)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~8 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 0 | (deps + stubs) | build | `npm test` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 1 | INPUT-01, INPUT-02, INPUT-04, UX-03 | unit (RTL) | `npm test -- src/components/step1` | ❌ W0 | ⬜ pending |
| 2-02-02 | 02 | 1 | INPUT-03, INPUT-05, UX-02 | unit (RTL) | `npm test -- src/components/step1` | ❌ W0 | ⬜ pending |
| 2-03-01 | 03 | 2 | SCEN-01, SCEN-02, SCEN-03, SCEN-04, SCEN-05 | unit (RTL) | `npm test -- src/components/step2` | ❌ W0 | ⬜ pending |
| 2-04-01 | 04 | 2 | UX-01, UX-02 | unit (RTL) | `npm test -- src/components/wizard` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `npm install react-hook-form @hookform/resolvers` — RHF + Zod v4 resolver
- [ ] `npm install -D tailwindcss @tailwindcss/postcss postcss && npx shadcn@latest init` — Tailwind v4 + shadcn (PostCSS path, not Vite plugin — Vite 8 compatibility issue)
- [ ] `src/components/step1/__tests__/CurrentClusterForm.test.tsx` — stubs for INPUT-01, INPUT-02, INPUT-04, INPUT-05, UX-03
- [ ] `src/components/step2/__tests__/ScenarioCard.test.tsx` — stubs for SCEN-01, SCEN-02, SCEN-03, SCEN-04, SCEN-05
- [ ] `src/components/wizard/__tests__/WizardShell.test.tsx` — stubs for UX-01, UX-02

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Derived metrics panel updates within 200ms | INPUT-04 | Timing assertion is unreliable in jsdom | Change a cluster input field, observe panel updates immediately; measure with browser DevTools if needed |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
