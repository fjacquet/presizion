---
phase: 27-web-app-manifest-icons
plan: 01
subsystem: ui
tags: [pwa, manifest, icons, ios, android, meta-tags, vite, static-files]

# Dependency graph
requires: []
provides:
  - Web app manifest (manifest.webmanifest) with GitHub Pages subpath configuration
  - Four icon PNGs generated from favicon.svg (192, 512, maskable-512, apple-180)
  - iOS meta tags (apple-touch-icon, apple-mobile-web-app-capable/status-bar-style/title)
  - Dual theme-color meta tags with light/dark media queries
  - viewport-fit=cover for iOS safe area CSS variable support
  - 26 automated tests covering all six MANIFEST requirements
affects: [28-touch-targets, 29-mobile-layout, 30-safe-area, 31-export-mobile]

# Tech tracking
tech-stack:
  added: ["@vite-pwa/assets-generator ^1.0.2 (dev-only CLI)"]
  patterns:
    - "Static manifest.webmanifest in public/ with /presizion/ prefix on all URLs (GitHub Pages subpath pattern)"
    - "Icon generation via @vite-pwa/assets-generator minimal2023Preset, output moved to public/icons/"
    - "Dual theme-color meta with media queries for light/dark adaptation"

key-files:
  created:
    - public/manifest.webmanifest
    - public/icons/pwa-192x192.png
    - public/icons/pwa-512x512.png
    - public/icons/maskable-512x512.png
    - public/icons/apple-touch-icon-180x180.png
    - pwa-assets.config.ts
    - src/__tests__/manifest.test.ts
  modified:
    - index.html
    - package.json
    - package-lock.json

key-decisions:
  - "Used @vite-pwa/assets-generator CLI (not vite-plugin-pwa) to avoid service worker conflicts with Vite 8"
  - "All manifest URLs use /presizion/ absolute prefix to prevent GitHub Pages 404 on install (M-3 pitfall)"
  - "Generator outputs to public/ root — moved files into public/icons/ manually for clean structure"
  - "Generator named maskable icon maskable-icon-512x512.png — renamed to maskable-512x512.png for consistency"
  - "apple-mobile-web-app-status-bar-style set to default (not black-translucent) to avoid notch content overlap"

patterns-established:
  - "TDD for static file verification: use fs.readFileSync + path.resolve in Vitest to assert file existence and content"
  - "Icon generation is a one-time build step (generate-icons script), not part of main build or watch"

requirements-completed: [MANIFEST-01, MANIFEST-02, MANIFEST-03, MANIFEST-04, MANIFEST-05, MANIFEST-06]

# Metrics
duration: 3min
completed: 2026-03-16
---

# Phase 27 Plan 01: Web App Manifest & Icons Summary

**Web app installability via manifest.webmanifest, four icon PNGs from favicon.svg, and iOS/Android meta tags — covering all six MANIFEST requirements**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-16T08:09:00Z
- **Completed:** 2026-03-16T08:12:00Z
- **Tasks:** 1 (with TDD RED + GREEN phases)
- **Files modified:** 11

## Accomplishments

- Generated four PWA icon PNGs from favicon.svg using @vite-pwa/assets-generator minimal2023Preset, organized in public/icons/
- Created manifest.webmanifest with correct GitHub Pages subpath configuration (start_url/scope = /presizion/, icon src paths with /presizion/icons/ prefix)
- Updated index.html with manifest link, iOS apple-touch-icon, apple-mobile-web-app meta tags, dual theme-color with media queries, and viewport-fit=cover
- 26 automated tests covering MANIFEST-01 through MANIFEST-06 (all pass); full suite at 622 tests with zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Failing manifest tests** - `67f6fc7` (test)
2. **Task 1 GREEN: Manifest, icons, and index.html** - `d795c2f` (feat)

_Note: TDD task with RED + GREEN commits_

## Files Created/Modified

- `public/manifest.webmanifest` - Web app manifest with Presizion metadata, /presizion/ subpath URLs, three icon entries
- `public/icons/pwa-192x192.png` - Standard 192x192 Android/Chrome icon (generated from favicon.svg)
- `public/icons/pwa-512x512.png` - Large 512x512 standard icon (generated from favicon.svg)
- `public/icons/maskable-512x512.png` - Android adaptive launcher icon with 10% safe-zone padding (generated from favicon.svg)
- `public/icons/apple-touch-icon-180x180.png` - iOS home screen icon with solid background (generated from favicon.svg)
- `pwa-assets.config.ts` - @vite-pwa/assets-generator config using minimal2023Preset
- `src/__tests__/manifest.test.ts` - 26 tests covering MANIFEST-01 through MANIFEST-06 via static file reads
- `index.html` - Added manifest link, apple-touch-icon, iOS meta tags, dual theme-color, viewport-fit=cover
- `package.json` - Added @vite-pwa/assets-generator dev dep and generate-icons script
- `package-lock.json` - Updated lockfile
- `public/favicon.ico` - Additional ICO file generated as side effect of icon generation

## Decisions Made

- Used @vite-pwa/assets-generator CLI instead of vite-plugin-pwa to avoid service worker infrastructure and known Vite 8 conflicts
- All manifest src/start_url/scope use absolute /presizion/ prefix (critical for GitHub Pages deployment, M-3 pitfall prevention)
- apple-mobile-web-app-status-bar-style set to "default" not "black-translucent" to prevent content appearing under iPhone notch/Dynamic Island

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Generator outputs to public/ root with different icon naming**
- **Found during:** Task 1 GREEN (icon generation)
- **Issue:** @vite-pwa/assets-generator placed icons in public/ (not public/icons/) and named maskable icon maskable-icon-512x512.png (not maskable-512x512.png as expected by tests)
- **Fix:** Moved four required PNGs from public/ to public/icons/ and renamed maskable-icon-512x512.png to maskable-512x512.png; the plan explicitly anticipated this and instructed adaptation
- **Files modified:** public/icons/ directory created with correctly named files
- **Verification:** ls public/icons/ confirmed four PNGs; all 26 tests pass
- **Committed in:** d795c2f (Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — generator output path/naming mismatch)
**Impact on plan:** The plan explicitly noted the generator may output to public/ and to adapt. No scope creep.

## Issues Encountered

The @vite-pwa/assets-generator minimal2023Preset also outputs pwa-64x64.png and favicon.ico as extra files. These were left in public/ (they don't cause issues and favicon.ico is a useful bonus). The 64x64 PNG was not added to the manifest icons array as it's not in the test requirements.

## User Setup Required

None - no external service configuration required. All files are static and committed to the repository.

## Next Phase Readiness

- Presizion is now installable to iOS and Android home screens
- All six MANIFEST requirements satisfied and test-verified
- public/icons/ structure is in place for any future icon updates
- Phase 28 (touch targets) can proceed — no blockers
- Physical device testing on iPhone/Android remains a manual gate before shipping v2.4

---
*Phase: 27-web-app-manifest-icons*
*Completed: 2026-03-16*

## Self-Check: PASSED

All required files verified to exist. All commits verified in git history.
