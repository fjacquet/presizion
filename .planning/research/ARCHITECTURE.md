# Architecture Research

**Domain:** Mobile-first responsive redesign + web app manifest for existing Tailwind v4 + shadcn/ui React app
**Researched:** 2026-03-16
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    index.html (public entry)                      │
│  <meta viewport> + apple-touch-icon + manifest link + theme JS  │
├─────────────────────────────────────────────────────────────────┤
│                        WizardShell                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Header: logo | toolbar (reset, store-predict, theme)     │   │
│  │         → mobile: compact row, icon-only buttons         │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ SizingModeToggle                                         │   │
│  │ → mobile: 2-row wrapping, smaller tap targets            │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ StepIndicator (nav)                                      │   │
│  │ → mobile: number circles only (labels hidden on xs)      │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ Main (routed by step)                                    │   │
│  │  ┌─────────────┐ ┌──────────────┐ ┌──────────────────┐ │   │
│  │  │ Step1       │ │ Step2        │ │ Step3            │ │   │
│  │  │ single-col  │ │ stacked tabs │ │ scroll-x table   │ │   │
│  │  │ form        │ │ + full-width │ │ + responsive     │ │   │
│  │  │ collapsible │ │ cards        │ │ charts           │ │   │
│  │  │ sections    │ │              │ │ + flex-wrap      │ │   │
│  │  │             │ │              │ │ export buttons   │ │   │
│  │  └─────────────┘ └──────────────┘ └──────────────────┘ │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ Bottom nav bar (Back / Next) — sticky on mobile          │   │
│  └──────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│              public/ (static assets — no Vite processing)        │
│  manifest.webmanifest  favicon.svg  icon-192.png  icon-512.png  │
│  apple-touch-icon.png (180x180)                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Mobile Change |
|-----------|----------------|---------------|
| `WizardShell` | Layout orchestrator, header, nav bar | Shrink header, make nav bar sticky |
| `StepIndicator` | Clickable step circles + labels | Labels hidden at xs, wider tap target |
| `SizingModeToggle` | 2-row mode selector | Allow wrapping, `text-xs` on mobile |
| `Step1CurrentCluster` | Layout shell for step 1 | Stack header row vertically on xs |
| `CurrentClusterForm` | Multi-section form | All grids to single column on xs |
| `DerivedMetricsPanel` | KPI grid | `grid-cols-2` on xs (was `grid-cols-2 sm:grid-cols-5`) |
| `FileImportButton` | File input trigger | Full-width button on xs |
| `Step2Scenarios` | Header + tab list + add button | Stack header row; full-width tabs |
| `ScenarioCard` | Card with 5 sections | All `grid-cols-2 sm:grid-cols-4` collapse to single col on xs |
| `ScenarioResults` | 3-col constraint grid | `grid-cols-1` on xs (stack CPU/RAM/Disk) |
| `VsanGrowthSection` | Collapsible advanced section | Already collapsible — audit internal grids only |
| `Step3ReviewExport` | Container for table + charts + buttons | Flex-wrap export buttons |
| `ComparisonTable` | Horizontal scroll table | `overflow-x-auto` already present — ensure min-width on inner table |
| `SizingChart` | Two bar charts | Reduce chart height on xs |
| `CoreCountChart` | Bar chart | Reduce chart height on xs |
| `CapacityStackedChart` | Stacked bar chart | Reduce chart height on xs |
| `MinNodesChart` | Bar chart | Reduce chart height on xs |
| `ImportPreviewModal` | Dialog with scope selector | Use Drawer on mobile |
| `index.html` | HTML entry point | Add manifest link + apple meta tags |
| `public/manifest.webmanifest` | NEW — PWA identity file | Create from scratch |
| `public/apple-touch-icon.png` | NEW — 180x180 iOS icon | Generate from icons.svg |
| `public/icon-192.png` | NEW — Android manifest icon | Generate from icons.svg |
| `public/icon-512.png` | NEW — Android manifest icon | Generate from icons.svg |

## Recommended Project Structure

```
public/
├── favicon.svg              # existing
├── logo.svg                 # existing
├── icons.svg                # existing (source for raster icons)
├── manifest.webmanifest     # NEW — web app manifest
├── apple-touch-icon.png     # NEW — 180x180 PNG for iOS Safari
├── icon-192.png             # NEW — 192x192 PNG for manifest
└── icon-512.png             # NEW — 512x512 PNG for manifest

src/
├── components/
│   ├── wizard/
│   │   ├── WizardShell.tsx          # modify — sticky bottom nav, compact header
│   │   ├── StepIndicator.tsx        # modify — label visibility at xs
│   │   ├── SizingModeToggle.tsx     # modify — allow wrapping on xs
│   │   └── ThemeToggle.tsx          # no change needed
│   ├── step1/
│   │   ├── Step1CurrentCluster.tsx  # modify — stack header row on xs
│   │   ├── CurrentClusterForm.tsx   # modify — verify sm: grid breakpoints
│   │   ├── DerivedMetricsPanel.tsx  # modify — grid-cols-2 on xs audit
│   │   ├── FileImportButton.tsx     # modify — full-width on xs
│   │   ├── ScopeBadge.tsx           # no change needed (already flex-wrap)
│   │   └── ImportPreviewModal.tsx   # modify — Drawer on mobile
│   ├── step2/
│   │   ├── Step2Scenarios.tsx       # modify — stack header row on xs
│   │   ├── ScenarioCard.tsx         # modify — collapse 4-col grids to 1-col
│   │   └── ScenarioResults.tsx      # modify — grid-cols-1 on xs
│   └── step3/
│       ├── Step3ReviewExport.tsx    # modify — flex-wrap export buttons
│       ├── ComparisonTable.tsx      # modify — min-width on inner table
│       ├── SizingChart.tsx          # modify — responsive height
│       ├── CoreCountChart.tsx       # modify — responsive height
│       ├── CapacityStackedChart.tsx # modify — responsive height
│       └── MinNodesChart.tsx        # modify — responsive height
└── index.html               # modify — manifest link + apple meta tags
```

### Structure Rationale

- **No new component folders needed.** All changes are inline Tailwind class additions to existing components — no structural refactor.
- **public/ gets raster icons.** Vite does not process files in `public/` through its build pipeline, so PNG icons placed there are served verbatim. The `manifest.webmanifest` references them with `/presizion/` prefix (matching `vite.config.ts` base).
- **ImportPreviewModal is the one structural exception.** It currently uses shadcn Dialog (center modal). On mobile this is cramped. A responsive Dialog+Drawer pattern using `useMediaQuery` replaces this with a bottom Drawer on narrow viewports. No new shadcn components need to be installed — the Drawer component is already available in the shadcn ecosystem.

## Architectural Patterns

### Pattern 1: Mobile-First Tailwind Class Layering

**What:** Write base classes for 390px (xs/mobile), add `sm:` overrides for 640px+. Never use `sm:` as the "default" — mobile IS the default. Tailwind v4 default breakpoints: `sm` = 40rem (640px), `md` = 48rem (768px).

**When to use:** Every component in this redesign.

**Trade-offs:** Minimal overhead — this is exactly how Tailwind is designed. No extra CSS generated. The key audit: every existing `grid-cols-2` or `grid-cols-4` without a mobile-first `grid-cols-1` base must be fixed.

**Example:**
```tsx
// Before (desktop-biased — 2 cols even on 390px):
<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

// After (mobile-first — 1 col on 390px, 2 cols on 640px, 4 cols on 768px):
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
```

### Pattern 2: Sticky Bottom Navigation Bar

**What:** Move the Back/Next navigation bar from a document-flow `mt-8` div to a `sticky bottom-0` bar with safe-area inset padding for iOS notch and home indicator.

**When to use:** Step 2 and Step 3 (where back/next exist). Step 1 already has Next inline in the form.

**Trade-offs:** Requires `pb-20` (80px) padding on `<main>` to prevent content from being hidden behind the sticky bar. Print styles must hide it. The safe-area padding handles iPhone notch/home-indicator.

**Example:**
```tsx
// WizardShell sticky nav (replaces the current mt-8 div)
<div className="sticky bottom-0 z-10 bg-background border-t px-4 py-3
                pb-[calc(0.75rem+env(safe-area-inset-bottom))]
                flex justify-between print:hidden">
  <Button variant="outline" onClick={prevStep}>Back</Button>
  {currentStep === 2 && <Button onClick={nextStep}>Next</Button>}
</div>
```

### Pattern 3: Responsive Chart Height via Parent Div

**What:** Use a Tailwind height class on the chart's parent div and set `height="100%"` on `ResponsiveContainer` so it inherits the responsive height.

**When to use:** All four Step 3 charts (SizingChart, CoreCountChart, CapacityStackedChart, MinNodesChart). The existing pattern uses `height={300}` directly on `ResponsiveContainer`, which is fixed and too tall on 390px.

**Trade-offs:** Slightly less precise than JavaScript-driven resize, but avoids duplicating 100+ line chart components.

**Example:**
```tsx
// Before:
<ResponsiveContainer width="100%" height={300}>

// After:
<div className="h-48 sm:h-72">  {/* 192px mobile, 288px desktop */}
  <ResponsiveContainer width="100%" height="100%">
    <BarChart ...>
```

### Pattern 4: Responsive Dialog to Drawer (ImportPreviewModal)

**What:** Detect viewport width with a `useMediaQuery` hook and conditionally render shadcn Drawer (bottom sheet) on mobile vs. Dialog (centered) on desktop.

**When to use:** `ImportPreviewModal` only — the one dialog with enough content (scope selector, preview table) to be cramped on 390px. Other dialogs (reset confirmation) are small enough to remain as Dialog.

**Trade-offs:** Adds ~20 lines of code and one hook. The Drawer component (Vaul via shadcn) must be installed: `npx shadcn@latest add drawer`.

**Example:**
```tsx
function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(
    () => window.matchMedia('(max-width: 639px)').matches
  )
  React.useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isMobile
}

// In ImportPreviewModal — conditional render:
const isMobile = useIsMobile()
if (isMobile) {
  return <Drawer open={open} onOpenChange={(o) => !o && onClose()}>{content}</Drawer>
}
return <Dialog open={open} onOpenChange={(o) => !o && onClose()}>{content}</Dialog>
```

### Pattern 5: Web App Manifest with Dual Icon Strategy

**What:** Place `manifest.webmanifest` in `public/` (served verbatim by Vite), reference icon paths with `/presizion/` prefix, and ALSO add `<link rel="apple-touch-icon">` directly in `index.html`. iOS Safari ignores manifest icons and requires the `<link>` tag.

**When to use:** Manifest + apple-touch-icon setup phase.

**Trade-offs:** Requires generating 3 raster PNGs from the SVG source (`icons.svg` already exists in `public/`). No Vite plugin needed — manual generation via a script is simpler and avoids a build dependency.

**Example (public/manifest.webmanifest):**
```json
{
  "name": "Presizion",
  "short_name": "Presizion",
  "description": "Cluster Refresh Sizing Tool",
  "start_url": "/presizion/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0f172a",
  "icons": [
    { "src": "/presizion/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/presizion/icon-512.png", "sizes": "512x512", "type": "image/png",
      "purpose": "any maskable" }
  ]
}
```

**Example (index.html additions in `<head>`):**
```html
<link rel="manifest" href="/presizion/manifest.webmanifest" />
<link rel="apple-touch-icon" href="/presizion/apple-touch-icon.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Presizion" />
<meta name="theme-color" content="#0f172a"
      media="(prefers-color-scheme: dark)" />
<meta name="theme-color" content="#ffffff"
      media="(prefers-color-scheme: light)" />
```

## Data Flow

No data flow changes are required for this milestone. The responsive redesign is purely presentational. All Zustand stores, sizing formulas, and derive-on-read hooks remain unchanged.

### State Management (unchanged)

```
Zustand stores (cluster, scenarios, wizard, theme, import)
    ↓ (unchanged — no new state needed for responsive layout)
Components ← responsive Tailwind classes only → same Zustand actions
```

### Key Constraint: No Logic Changes

The mobile redesign MUST NOT touch:
- `src/lib/sizing/` — all formula logic
- `src/store/` — all Zustand stores
- `src/schemas/` — Zod schemas
- `src/hooks/useScenariosResults`, `useVsanBreakdowns`, etc.

The one hook addition allowed: `useMediaQuery` (or inline `useIsMobile`) for the ImportPreviewModal Drawer pattern.

### Icon Generation Pipeline

```
public/icons.svg  (source — existing vector, multicolor SVG)
    ↓ (one-time generation via script)
    → public/apple-touch-icon.png  (180x180, no padding needed)
    → public/icon-192.png          (192x192, 12px safe-zone padding for maskable)
    → public/icon-512.png          (512x512, 32px safe-zone padding for maskable)
```

Generation recommendation: use `sharp` via a one-off `node scripts/gen-icons.mjs`. Add sharp as a devDependency (`npm install -D sharp`). The script is 20 lines and makes the process reproducible. Do NOT use npx without lockfile pinning — icon generation should be stable.

Alternative if sharp is undesired: Inkscape CLI (`inkscape --export-type=png --export-width=512`) is zero npm dependencies and works on CI if Inkscape is installed.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 390px (iPhone 14/15 target) | Single-column forms, sticky nav, flex-wrap buttons, 192px chart height |
| 640px+ (sm breakpoint) | Most existing layouts restore — 2-3 column grids, 288px charts |
| 768px+ (md breakpoint) | Full 4-column ScenarioCard grids, 300px+ charts |
| 1280px+ (desktop) | Current max-w-4xl container unchanged — no changes needed |

### Scaling Priorities

1. **First concern: touch target size.** WCAG 2.1 AAA minimum is 44px. shadcn `Button size="sm"` is ~32px tall. On mobile, interactive elements must use `size="default"` (40px) or explicit `min-h-[44px]`. The `SizingModeToggle` buttons with `py-1` are ~28px — they need `py-2.5` or `py-3` on mobile.

2. **Second concern: horizontal overflow at 390px.** The two critical overflow risks are:
   - `SizingModeToggle` (4 buttons + 2 layout buttons in 2 rows on 390px — needs `flex-wrap` audit)
   - `ComparisonTable` (multi-column table that must scroll, not clip)

## Anti-Patterns

### Anti-Pattern 1: Using `sm:` as the mobile reset

**What people do:** Write `sm:grid-cols-1` expecting it to produce single column on mobile.

**Why it's wrong:** `sm:` applies at 640px and above. On 390px, the unprefixed class applies. `sm:grid-cols-1` does nothing for mobile — it produces single column only at 640px+.

**Do this instead:**
```tsx
// Wrong:
<div className="grid-cols-2 sm:grid-cols-1">

// Right (mobile first):
<div className="grid-cols-1 sm:grid-cols-2">
```

### Anti-Pattern 2: Hardcoded pixel heights in ResponsiveContainer

**What people do:** Leave `height={300}` directly on `ResponsiveContainer`.

**Why it's wrong:** At 390px viewport height (~664px on iPhone 14), a 300px chart plus multiple chart sections stack to an unusable scroll length. The chart is also too wide to show meaningful data at narrow widths.

**Do this instead:** Wrap in a div with Tailwind responsive heights and pass `height="100%"` to `ResponsiveContainer`:
```tsx
<div className="h-48 sm:h-72">
  <ResponsiveContainer width="100%" height="100%">
```

### Anti-Pattern 3: Omitting min-width on horizontally scrollable tables

**What people do:** Add `overflow-x-auto` to the wrapper but forget to set a minimum width on the inner `<Table>`, causing the table to collapse rather than scroll.

**Why it's wrong:** Without `min-w-max` or explicit column widths, the browser compresses the table into the viewport width, making all columns unreadably narrow.

**Do this instead:** Add `min-w-max` to the `<Table>` component and explicit `w-36`/`w-24` on `<TableHead>` cells so the browser renders the full natural width and the wrapper scrolls.

### Anti-Pattern 4: Manifest icon paths without base prefix

**What people do:** Write `"src": "/icon-192.png"` in `manifest.webmanifest` for a site at `/presizion/`.

**Why it's wrong:** The browser fetches `/icon-192.png` (root), which returns 404 from GitHub Pages. The manifest must use the full path `/presizion/icon-192.png`.

**Do this instead:** All `src` paths in `manifest.webmanifest` must start with `/presizion/` matching `vite.config.ts` `base: '/presizion/'`.

### Anti-Pattern 5: Relying solely on manifest icons for iOS Safari

**What people do:** Put icons only in `manifest.webmanifest`, expecting iOS Safari to use them for Add to Home Screen.

**Why it's wrong:** iOS Safari (as of 2026) ignores `manifest.webmanifest` icons. It requires `<link rel="apple-touch-icon" href="...">` in `index.html` `<head>`.

**Do this instead:** Include BOTH the manifest icons AND `<link rel="apple-touch-icon">` in `index.html`.

### Anti-Pattern 6: Modifying sizing logic for mobile

**What people do:** Simplify or alter calculations to reduce output displayed on mobile.

**Why it's wrong:** Correctness is the core product value. Sizing outputs must be identical regardless of viewport. The formula layer (`src/lib/sizing/`) must not be touched.

**Do this instead:** Use progressive disclosure (collapsible sections, detail disclosure) to reduce visual density on mobile without changing computed values.

## Integration Points

### Existing Component Modification Map

| Component | Action | Key Changes |
|-----------|--------|-------------|
| `index.html` | Modify | Add manifest link, apple-touch-icon, apple meta tags, dual theme-color |
| `WizardShell` | Modify | Compact header on xs; sticky bottom nav bar; `pb-20` on main to prevent content hiding |
| `StepIndicator` | Modify | Circle tap target `h-10 w-10`; labels `hidden sm:block` already correct |
| `SizingModeToggle` | Modify | `flex-wrap` on button row; `py-2` min for touch; `text-xs sm:text-sm` |
| `Step1CurrentCluster` | Modify | `flex-col gap-2 sm:flex-row sm:items-start` for header + FileImportButton row |
| `CurrentClusterForm` | Modify | Base grids already `grid-cols-1 sm:grid-cols-N` — verify all sections; `w-full sm:w-auto` on Next button |
| `DerivedMetricsPanel` | Modify | `grid-cols-2 sm:grid-cols-5` already correct — verify 390px layout fits |
| `FileImportButton` | Modify | `w-full sm:w-auto` on the Button |
| `ImportPreviewModal` | Structural | Add `useIsMobile` hook + shadcn Drawer path for mobile; Dialog remains for desktop |
| `Step2Scenarios` | Modify | `flex-col gap-2 sm:flex-row sm:items-center sm:justify-between` on header |
| `ScenarioCard` | Modify | `grid-cols-2 sm:grid-cols-4` → `grid-cols-1 sm:grid-cols-2 md:grid-cols-4` |
| `ScenarioResults` | Modify | `grid-cols-3` → `grid-cols-1 sm:grid-cols-3`; font-mono formula strings may need `text-xs` |
| `VsanGrowthSection` | Modify | Audit internal grids — likely same pattern as ScenarioCard |
| `Step3ReviewExport` | Modify | Export button row: `flex flex-wrap gap-2` (current `flex gap-3` clips at 390px) |
| `ComparisonTable` | Modify | Add `min-w-max` or `w-full` to inner `<Table>`; verify `overflow-x-auto` wrapper |
| `SizingChart` | Modify | Responsive height parent div `h-48 sm:h-72`; `height="100%"` on ResponsiveContainer |
| `CoreCountChart` | Modify | Same responsive height pattern |
| `CapacityStackedChart` | Modify | Same responsive height pattern |
| `MinNodesChart` | Modify | Same responsive height pattern |

### New Files to Create

| File | Purpose | Notes |
|------|---------|-------|
| `public/manifest.webmanifest` | Web app identity for Add to Home Screen | JSON — Vite serves verbatim from public/ |
| `public/apple-touch-icon.png` | iOS Safari home screen icon (180x180) | Generate from icons.svg |
| `public/icon-192.png` | Android/Chrome manifest icon | Generate from icons.svg |
| `public/icon-512.png` | Android/Chrome large manifest icon (maskable) | Generate from icons.svg |
| `scripts/gen-icons.mjs` | Reproducible icon generation script | devDependency: sharp |

### shadcn Component to Add

| Component | Command | Needed For |
|-----------|---------|------------|
| Drawer | `npx shadcn@latest add drawer` | ImportPreviewModal mobile path |

### Internal Boundaries (unchanged)

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Components ↔ Zustand | Direct selector subscriptions | No change |
| Components ↔ `src/lib/sizing/` | Pure function calls | No change — formulas untouched |
| `public/` ↔ browser | Verbatim static file serving | manifest, icons added here |
| Vite build ↔ output | `base: '/presizion/'` prefix | All public/ assets served at /presizion/ |

## Build Order for Implementation

Dependency-ordered phases:

1. **Web app manifest + icons** — pure addition to `public/` and `index.html`. Zero regression risk. Independent of all other work. Create icons first so the manifest can reference real files.

2. **WizardShell responsive header + sticky nav** — affects all steps visually. Do this before per-step work so the container dimensions are correct. The `pb-20` padding on `<main>` must be in place before per-step layout audit.

3. **SizingModeToggle + StepIndicator mobile** — header toolbar components. Do after WizardShell so the context (compact header) is established.

4. **Step 1 responsive forms** — `Step1CurrentCluster` header, `CurrentClusterForm` (most grids already correct — verification pass), `DerivedMetricsPanel` audit, `FileImportButton` width.

5. **ImportPreviewModal Drawer** — structural change, isolated to one component. Do after Step 1 since it is invoked from Step 1's FileImportButton.

6. **Step 2 scenario cards** — `Step2Scenarios` header, `ScenarioCard` grid collapse, `ScenarioResults` single-column, `VsanGrowthSection` grid audit.

7. **Step 3 export buttons + table** — `Step3ReviewExport` flex-wrap buttons, `ComparisonTable` min-width. These are visual fixes with no logic involvement.

8. **Step 3 charts** — responsive heights on all four charts. Last because device testing is the acceptance criterion and cannot be completed until the surrounding layout is stable.

## Sources

- [Tailwind CSS v4 Responsive Design docs](https://tailwindcss.com/docs/responsive-design) — HIGH confidence, official
- [Tailwind CSS v4 breakpoint customization](https://bordermedia.org/blog/tailwind-css-4-breakpoint-override) — MEDIUM confidence
- [Apple Configuring Web Applications (safari meta tags)](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html) — HIGH confidence, official Apple
- [iOS PWA Compatibility tracker (firt.dev)](https://firt.dev/notes/pwa-ios/) — HIGH confidence, authoritative tracker
- [shadcn/ui Drawer Component](https://ui.shadcn.com/docs/components/radix/drawer) — HIGH confidence, official docs
- [Responsive Dialog+Drawer pattern (nextjsshop)](https://www.nextjsshop.com/resources/blog/responsive-dialog-drawer-shadcn-ui) — MEDIUM confidence
- [Recharts ResponsiveContainer API](https://recharts.org/?p=%2Fen-US%2Fapi%2FResponsiveContainer) — HIGH confidence, official docs
- [PWA Icon Requirements 2025](https://leandine.hashnode.dev/icogenie-pwa-icon-requirements) — MEDIUM confidence
- [Vite Static Deploy Guide](https://vite.dev/guide/static-deploy) — HIGH confidence, official Vite docs
- [Web Icons 2025: Touch Icons, Adaptive Icons & manifest.json](https://browserux.com/blog/guides/web-icons/touch-adaptive-icons-manifest.html) — MEDIUM confidence

---
*Architecture research for: Mobile-first responsive redesign + web app manifest (Presizion v2.4)*
*Researched: 2026-03-16*
