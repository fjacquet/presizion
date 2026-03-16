---
gsd_state_version: 1.0
milestone: v2.4
milestone_name: — Mobile UX & Web App Manifest
status: planning
stopped_at: Completed 28-global-mobile-foundation-wizard-shell-02-PLAN.md
last_updated: "2026-03-16T08:43:55.444Z"
last_activity: 2026-03-16 — Roadmap created, 30/30 requirements mapped to Phases 27-31
progress:
  total_phases: 14
  completed_phases: 11
  total_plans: 20
  completed_plans: 20
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-16)

**Core value:** The sizing math must be correct — given the same inputs, the tool must produce server counts that match a reference spreadsheet, with transparent formulas behind every number.
**Current focus:** v2.4 — Mobile UX & Web App Manifest (Phase 27: Web App Manifest & Icons)

## Current Position

Phase: 27 of 31 (Web App Manifest & Icons)
Plan: — (not yet planned)
Status: Ready to plan
Last activity: 2026-03-16 — Roadmap created, 30/30 requirements mapped to Phases 27-31

Progress: [░░░░░░░░░░] 0% (v2.4 milestone — 0/10 plans complete)

## Performance Metrics

**Velocity (v2.2 reference):**

- Total plans completed (v2.2): 4
- Average duration: ~4.5 min/plan

**By Phase (recent):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 25 | 2/2 | 4min | 2min |
| 26 | 2/2 | 8min | 4min |

*Updated after each plan completion*
| Phase 27-web-app-manifest-icons P01 | 3 | 1 tasks | 11 files |
| Phase 28-global-mobile-foundation-wizard-shell P01 | 1 | 2 tasks | 2 files |
| Phase 28-global-mobile-foundation-wizard-shell P02 | 2 | 3 tasks | 5 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v2.4 research]: No new runtime deps except shadcn Drawer — existing stack handles all mobile changes
- [v2.4 research]: vite-plugin-pwa must NOT be installed (Vite 8 conflict + service worker out of scope)
- [v2.4 research]: ComparisonTable stays as scrollable table with sticky column — not converted to cards
- [v2.4 research]: iOS PDF export uses window.open(blobUrl) fallback — test on physical device before Phase 31
- [Phase 27-web-app-manifest-icons]: Used @vite-pwa/assets-generator CLI (not vite-plugin-pwa) to avoid service worker conflicts with Vite 8
- [Phase 27-web-app-manifest-icons]: All manifest URLs use /presizion/ absolute prefix to prevent GitHub Pages 404 on install (M-3 pitfall prevention)
- [Phase 27-web-app-manifest-icons]: apple-mobile-web-app-status-bar-style set to default (not black-translucent) to avoid notch content overlap
- [Phase 28-01]: Use @media (hover: none) not max-width to target touch devices for iOS auto-zoom prevention
- [Phase 28-01]: Use inline style minHeight: 100dvh rather than Tailwind class for clean Safari < 15.4 fallback
- [Phase 28-02]: Used CSS child selector [&_button]:h-11 [&_button]:w-11 on ThemeToggle wrapper to achieve 44px touch target without modifying ThemeToggle.tsx
- [Phase 28-02]: sticky bottom-0 on mobile with sm:static on desktop avoids element duplication for sticky Back/Next nav
- [Phase 28-02]: paddingBottom: calc(0.75rem + env(safe-area-inset-bottom, 0px)) as inline style — Tailwind cannot express env() calculations

### Pending Todos

None

### Blockers/Concerns

- [Phase 31]: iOS Safari PDF/PPTX blob download (M-8) requires physical iPhone for acceptance testing — ensure device access before starting Phase 31 export work
- [Phase 31]: Recharts orientation-change resize behavior (M-7) may need key={orientationType} remount — investigate Recharts 2.15.4 behavior if min-w-0 fix is insufficient

## Session Continuity

Last session: 2026-03-16T08:43:55.442Z
Stopped at: Completed 28-global-mobile-foundation-wizard-shell-02-PLAN.md
Resume file: None
