---
gsd_state_version: 1.0
milestone: v2.4
milestone_name: — Mobile UX & Web App Manifest
status: planning
stopped_at: Completed 31-step-3-review-export-03-PLAN.md
last_updated: "2026-03-16T10:01:58.260Z"
last_activity: 2026-03-16 — Roadmap created, 30/30 requirements mapped to Phases 27-31
progress:
  total_phases: 14
  completed_phases: 14
  total_plans: 26
  completed_plans: 26
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
| Phase 29-step-1-mobile-form-layout P01 | 2 | 2 tasks | 4 files |
| Phase 29-step-1-mobile-form-layout P02 | 7 | 2 tasks | 5 files |
| Phase 30-step-2-scenario-cards P01 | 2min | 1 tasks | 4 files |
| Phase 31-step-3-review-export P01 | 4min | 2 tasks | 2 files |
| Phase 31-step-3-review-export P02 | 6min | 2 tasks | 6 files |
| Phase 31-step-3-review-export P03 | 6min | 2 tasks | 6 files |

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
- [Phase 29-01]: DerivedMetricsPanel grid-cols-2 sm:grid-cols-5 verified correct — no change needed at 390px
- [Phase 29-01]: FileImportButton uses default Button size (not size=sm) for ~40px height satisfying MOBILE-03 touch target
- [Phase 29-01]: ScopeBadge edit button changed to size=icon with h-9 w-9 shrink-0 to prevent off-screen push by long labels
- [Phase 29]: shadcn Drawer installed via npx shadcn@latest add drawer bringing vaul@1.1.2
- [Phase 29]: useIsMobile hook defined locally in ImportPreviewModal using matchMedia (max-width: 639px)
- [Phase 29]: matchMedia mock defaults to desktop in beforeEach for existing ImportPreviewModal tests
- [Phase 30-01]: ScenarioCard grids use grid-cols-1 sm:grid-cols-2 md:grid-cols-4 (3-tier breakpoint matching Phase 29 pattern)
- [Phase 30-01]: Card Duplicate/Remove buttons changed to size=icon h-9 w-9 — consistent with Phase 29 ScopeBadge touch target pattern
- [Phase 31-01]: bg-background (not bg-white) required on sticky cells — tracks light/dark CSS variables correctly
- [Phase 31-01]: min-w-max on Table + overflow-x-auto wrapper enables horizontal scroll at 390px without responsive breakpoints
- [Phase 31-step-3-review-export]: h-48 sm:h-72 for vertical bar charts; data-driven heights for horizontal bar charts in CapacityStackedChart and MinNodesChart
- [Phase 31-step-3-review-export]: CapacityStackedChart left margin reduced 120->90, YAxis width 110->80, fontSize 12->11 to gain ~20% bar area at 390px
- [Phase 31-step-3-review-export]: useIsMobile extracted to shared src/hooks/useIsMobile.ts — do not redefine locally in components
- [Phase 31-step-3-review-export]: iOS PDF: caller pre-opens about:blank synchronously before async export to bypass iOS popup blocker
- [Phase 31-step-3-review-export]: iOS PPTX: guard in caller (Step3ReviewExport), exportPptx.ts stays platform-agnostic

### Pending Todos

None

### Blockers/Concerns

- [Phase 31]: iOS Safari PDF/PPTX blob download (M-8) requires physical iPhone for acceptance testing — ensure device access before starting Phase 31 export work
- [Phase 31]: Recharts orientation-change resize behavior (M-7) may need key={orientationType} remount — investigate Recharts 2.15.4 behavior if min-w-0 fix is insufficient

## Session Continuity

Last session: 2026-03-16T10:01:58.257Z
Stopped at: Completed 31-step-3-review-export-03-PLAN.md
Resume file: None
