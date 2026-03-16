# Requirements — v2.4 Mobile UX & Web App Manifest

*Defined: 2026-03-16*
*Core Value: The sizing math must be correct — this milestone does not touch sizing formulas.*

## v2.4 Requirements

### Web App Manifest (MANIFEST)

- [x] **MANIFEST-01**: App includes a `manifest.webmanifest` with name "Presizion", short_name, start_url `/presizion/`, scope `/presizion/`, display `standalone`, theme_color, background_color
- [x] **MANIFEST-02**: Manifest references icon PNGs at 192x192 and 512x512 generated from the Presizion logo
- [x] **MANIFEST-03**: Manifest includes a 512x512 maskable icon variant for Android adaptive launchers
- [x] **MANIFEST-04**: `index.html` includes `<link rel="apple-touch-icon">` pointing to a 180x180 PNG (iOS ignores manifest icons)
- [x] **MANIFEST-05**: `index.html` includes `<meta name="theme-color">` matching the app's primary brand color
- [x] **MANIFEST-06**: `index.html` viewport meta tag updated with `viewport-fit=cover` for iOS safe area support

### Global Mobile Foundation (MOBILE)

- [ ] **MOBILE-01**: All form inputs render at >= 16px font-size to prevent iOS Safari auto-zoom on focus
- [ ] **MOBILE-02**: Layout uses `dvh` units (with `vh` fallback) instead of `100vh` to prevent iOS address bar clipping
- [ ] **MOBILE-03**: All interactive elements (buttons, links, toggles) have minimum 44px touch target size per iOS HIG / WCAG 2.5.5
- [ ] **MOBILE-04**: Page body prevents horizontal overflow (`overflow-x: hidden`) while allowing controlled scroll inside specific containers

### Navigation & Wizard Shell (NAV)

- [ ] **NAV-01**: Header toolbar is compact on mobile (< 640px) — logo, theme toggle, and Store-Predict link fit on one line without wrapping
- [ ] **NAV-02**: Wizard step indicators are usable at 390px — clickable, readable labels, clear active state
- [ ] **NAV-03**: SizingModeToggle wraps gracefully at 390px (flex-wrap) without clipping or horizontal overflow
- [ ] **NAV-04**: Step navigation (Next/Back buttons) is accessible and touch-friendly on mobile

### Step 1: Cluster Form (FORM)

- [ ] **FORM-01**: Form fields stack to single-column layout on screens < 640px (currently grid-cols-2/3/4)
- [ ] **FORM-02**: DerivedMetricsPanel grid collapses to 2-3 columns on mobile (currently 5-column)
- [ ] **FORM-03**: SPEC results panel table is horizontally scrollable on mobile if it overflows
- [ ] **FORM-04**: ImportPreviewModal renders as a bottom Drawer on mobile (< 640px), Dialog on desktop
- [ ] **FORM-05**: File import button and scope badge are accessible and readable at 390px

### Step 2: Scenario Cards (CARD)

- [ ] **CARD-01**: Scenario cards stack full-width on mobile (no side-by-side)
- [ ] **CARD-02**: Server config grid (sockets/cores/RAM/disk) collapses to 2-column on mobile
- [ ] **CARD-03**: Sizing assumptions grid collapses to 2-column on mobile
- [ ] **CARD-04**: VsanGrowthSection internal grids are responsive at 390px
- [ ] **CARD-05**: SPEC lookup search input and results panel are usable on mobile

### Step 3: Review & Export (REVIEW)

- [ ] **REVIEW-01**: Comparison table scrolls horizontally with a sticky first column ("Metric") at 390px
- [ ] **REVIEW-02**: Chart heights are responsive — shorter on mobile (e.g., h-48) vs desktop (h-72)
- [ ] **REVIEW-03**: Export actions presented as a bottom sheet (shadcn Sheet) on mobile instead of a button row
- [ ] **REVIEW-04**: iOS Safari PDF export uses fallback strategy (open in new tab) since blob download is broken
- [ ] **REVIEW-05**: Chart PNG download continues to work on mobile (canvas rendering)
- [ ] **REVIEW-06**: Core count chart and capacity stacked chart are readable at 390px width

## Future Requirements (v2.5+)

- **PWA-01**: Service worker for offline shell caching
- **PWA-02**: Background sync for session data
- **MOBILE-ADV-01**: Swipe gestures for wizard step navigation
- **MOBILE-ADV-02**: Native Web Share API for sharing results

## Out of Scope

| Feature | Reason |
|---------|--------|
| Service worker / offline | Manifest is for branding only; offline deferred to future |
| Swipe step navigation | Conflicts with drag-drop file import in Step 1 |
| Pinch-to-zoom on charts | Adds complexity with no clear user value |
| Native sharing (Web Share API) | Not supported uniformly; URL sharing already works |
| Tablet-specific layouts (768px+) | Focus on phone (390px); tablet already works at desktop breakpoints |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MANIFEST-01 | Phase 27 | Complete |
| MANIFEST-02 | Phase 27 | Complete |
| MANIFEST-03 | Phase 27 | Complete |
| MANIFEST-04 | Phase 27 | Complete |
| MANIFEST-05 | Phase 27 | Complete |
| MANIFEST-06 | Phase 27 | Complete |
| MOBILE-01 | Phase 28 | Pending |
| MOBILE-02 | Phase 28 | Pending |
| MOBILE-03 | Phase 28 | Pending |
| MOBILE-04 | Phase 28 | Pending |
| NAV-01 | Phase 28 | Pending |
| NAV-02 | Phase 28 | Pending |
| NAV-03 | Phase 28 | Pending |
| NAV-04 | Phase 28 | Pending |
| FORM-01 | Phase 29 | Pending |
| FORM-02 | Phase 29 | Pending |
| FORM-03 | Phase 29 | Pending |
| FORM-04 | Phase 29 | Pending |
| FORM-05 | Phase 29 | Pending |
| CARD-01 | Phase 30 | Pending |
| CARD-02 | Phase 30 | Pending |
| CARD-03 | Phase 30 | Pending |
| CARD-04 | Phase 30 | Pending |
| CARD-05 | Phase 30 | Pending |
| REVIEW-01 | Phase 31 | Pending |
| REVIEW-02 | Phase 31 | Pending |
| REVIEW-03 | Phase 31 | Pending |
| REVIEW-04 | Phase 31 | Pending |
| REVIEW-05 | Phase 31 | Pending |
| REVIEW-06 | Phase 31 | Pending |

**Coverage:**
- v2.4 requirements: 30 total
- Mapped to phases: 30
- Unmapped: 0

---
*Requirements defined: 2026-03-16*
*Last updated: 2026-03-16 — traceability mapped to Phases 27-31*
