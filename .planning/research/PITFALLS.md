# Pitfalls Research — Mobile-First Responsive Redesign + Web App Manifest

**Domain:** Adding mobile responsiveness to a desktop-first data-dense React + Tailwind v4 app
**Researched:** 2026-03-16
**Confidence:** HIGH

---

## Critical Pitfalls

### M-1: iOS Safari Auto-Zoom on Number Inputs

**What goes wrong:**
iOS Safari automatically zooms the viewport when the user taps any `<input>` whose computed font-size is below 16px. Every numeric stepper in Step 1 and Step 2 (ratio, headroom %, RAM, disk, core count) will trigger a jarring zoom-and-pan animation, making the form unusable until the user pinches back out.

**Why it happens:**
Safari renders inputs at their CSS size. If the computed font-size is below 16px — common with Tailwind's `text-sm` (14px) — the UA automatically zooms to 16px, which shifts the entire viewport.

**How to avoid:**
Set `font-size: 16px` (or `max(1rem, 16px)`) on every `input` element in your global CSS. Do NOT disable user scaling via `maximum-scale=1` in the viewport meta tag — that breaks accessibility and violates WCAG 2.1. Use a targeted media query: `@media (hover: none) { input { font-size: 16px; } }` so desktop layout is unaffected.

**Warning signs:**
Open Chrome DevTools device emulation on an iPhone profile and focus any number input. If the viewport shifts, the font-size is too small.

**Phase to address:**
Phase covering Step 1 mobile form layout (first mobile phase).

---

### M-2: 100vh Includes Hidden Browser Chrome on iOS

**What goes wrong:**
The wizard shell uses `min-height: 100vh` on the root container. On iOS Safari, `100vh` equals the maximum viewport height — the height available when the browser toolbar is fully hidden. On initial page load with the toolbar visible, content is clipped at the bottom, hiding action buttons or the "Next" step control.

**Why it happens:**
Mobile Safari's UI chrome (URL bar + toolbar) dynamically hides on scroll. `100vh` is calculated assuming chrome-hidden state, so the actual visible area at page load is shorter than `100vh`.

**How to avoid:**
Replace `100vh` with `100dvh` (dynamic viewport height) which tracks the actual visible area in real time. Add a CSS fallback for older Safari: `min-height: 100vh; min-height: 100dvh;`. For the wizard step container, `min-height: 100svh` (small viewport height — always the chrome-visible size) is also safe. Do not rely on JS `window.innerHeight` as it has the same stale-value problem.

**Warning signs:**
The "Next" or "Calculate" button is partially hidden when the page first loads on a physical iPhone. The issue disappears after scrolling down once.

**Phase to address:**
Phase covering WizardShell + header/footer mobile layout.

---

### M-3: Manifest `start_url` and `scope` Missing the Base Path

**What goes wrong:**
Presizion deploys at `/presizion/` on GitHub Pages. If `manifest.json` uses `"start_url": "/"` or `"scope": "/"`, the installed home screen icon opens `https://fjacquet.github.io/` (the root, which is a 404) instead of `https://fjacquet.github.io/presizion/`. The app silently fails to launch.

**Why it happens:**
The Web App Manifest spec resolves relative URLs against the manifest file URL, but `start_url` and `scope` are frequently copy-pasted from examples that assume root deployment. GitHub Pages project sites always live under a repository path.

**How to avoid:**
Set both explicitly:
```json
{
  "start_url": "/presizion/",
  "scope": "/presizion/"
}
```
The manifest file must also be served from `/presizion/manifest.json` (place in `public/manifest.json` and set Vite `base: '/presizion/'`). Verify in Chrome DevTools → Application → Manifest that "Installability" shows no scope errors.

**Warning signs:**
Chrome DevTools Application tab shows "Start URL is not in scope" error. Installing to home screen and tapping the icon shows a 404.

**Phase to address:**
Manifest phase (Phase 27 or equivalent manifest setup phase).

---

### M-4: iOS Safari Ignores `manifest.json` Icons — Requires `apple-touch-icon`

**What goes wrong:**
The developer adds icons to `manifest.json` and assumes iOS will use them for the home screen icon. On iOS Safari, the installed icon appears as a generic screenshot of the page rather than the configured icon.

**Why it happens:**
iOS Safari does not use `manifest.json` icon entries for the home screen icon. It requires a specific `<link rel="apple-touch-icon" href="..." />` tag in the HTML `<head>`. This is a longstanding Apple non-standard that still applies in 2025/2026 even as Safari has partially adopted Web App Manifest support.

**How to avoid:**
Add to `index.html`:
```html
<link rel="apple-touch-icon" sizes="180x180" href="/presizion/apple-touch-icon.png" />
```
The icon must be a 180×180 PNG (no transparency — iOS fills transparency with black). Place it in `public/` so Vite copies it to the build output with the correct base path. Keep it separate from the manifest icons array (which serves Android/Chrome).

**Warning signs:**
"Add to Home Screen" on iOS shows a page screenshot instead of the app icon. Lighthouse PWA audit passes (it checks manifest) but visual result on iPhone is wrong.

**Phase to address:**
Manifest phase.

---

### M-5: `apple-mobile-web-app-status-bar-style` Has No Effect Without Standalone Mode

**What goes wrong:**
Adding `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />` without `<meta name="apple-mobile-web-app-capable" content="yes" />` has zero effect. The status bar stays white/default.

**Why it happens:**
The status-bar-style tag is only processed when the app is launched in standalone mode (from home screen). It also has no effect inside the browser. Additionally, `black-translucent` overlays content under the status bar, requiring `padding-top: env(safe-area-inset-top)` or the content will be obscured.

**How to avoid:**
Always pair the two tags. For a light/dark theming app, use `"default"` (white status bar) or `"black"` (dark status bar). Avoid `black-translucent` unless you explicitly handle `env(safe-area-inset-top)` in CSS — it places content under the notch/island.

**Warning signs:**
Status bar text is invisible (dark text on dark background, or vice versa). Content appears behind the iPhone notch or Dynamic Island.

**Phase to address:**
Manifest phase.

---

### M-6: Comparison Table Overflow Breaks Layout Instead of Scrolling

**What goes wrong:**
The Step 3 comparison table has 5+ columns (As-Is + multiple scenarios). On a 390px screen with the default Tailwind layout, the table overflows the viewport, causing the entire page to scroll horizontally — not just the table. This makes navigation controls, the header, and step indicators scroll off-screen.

**Why it happens:**
When a child element (the table) overflows `overflow: visible` ancestors, the overflow propagates to the body/html, enabling horizontal scrolling at the page level. Wrapping the table in `overflow-x: auto` on the direct parent is necessary but not sufficient if any ancestor also lacks `overflow: hidden` or `overflow-x: clip`.

**How to avoid:**
Wrap the table in a `<div class="overflow-x-auto w-full">` and ensure the outer wizard container has `overflow-x: hidden` (or `overflow-x: clip`) to prevent page-level horizontal scroll. Add `touch-action: pan-x` to the scroll wrapper to enable smooth touch swipe scrolling. Use `white-space: nowrap` on table cells if text wrapping produces worse results than overflow.

**Warning signs:**
The entire page including the header slides when swiping left. A horizontal scrollbar appears at the bottom of the browser window (not inside the table wrapper).

**Phase to address:**
Phase covering Step 3 responsive layout.

---

### M-7: Recharts ResponsiveContainer Shrinks But Doesn't Re-Expand

**What goes wrong:**
On mobile, Recharts `ResponsiveContainer` correctly shrinks the chart when the viewport narrows. However, when the user rotates from portrait to landscape (or the layout reflows), the chart fails to grow back to the available width — it stays at the smaller size until the page is reloaded.

**Why it happens:**
`ResponsiveContainer` uses `ResizeObserver` on its parent element. If the parent's width is set by CSS that doesn't immediately reflow on orientation change (e.g., a flex child with `flex-shrink: 0` or a container with an explicit `width`), the observer never fires. This is a documented issue in the Recharts GitHub tracker.

**How to avoid:**
Ensure the chart's parent container has no explicit pixel width — use `width: 100%` and `min-width: 0` (the `min-w-0` Tailwind class). Set `ResponsiveContainer width="100%"` and `height={number}` (not percentage height, which requires a defined parent height). Test in DevTools by toggling device orientation. If the issue persists, add a `key` prop tied to a resize event counter to force remount.

**Warning signs:**
Charts appear narrower than their container after rotating the device. On orientation change, a gap appears to the right of the chart.

**Phase to address:**
Phase covering Step 2 and Step 3 chart responsiveness.

---

### M-8: jsPDF and PPTX Download Broken on iOS Safari

**What goes wrong:**
Tapping the PDF or PPTX export button on iOS Safari either reloads the page, opens a blank tab showing `blob:`, or shows the file as a binary download with no viewer — not a usable download experience.

**Why it happens:**
iOS Safari handles blob URLs differently from desktop browsers. When `jsPDF` calls `doc.save('file.pdf')`, it creates a temporary blob URL and sets `location.href` to it. iOS revokes the blob before Safari fetches it, resulting in a blank page. Additionally, iOS Safari cannot download arbitrary blob MIME types as files — it can only "open" types it understands natively in the browser.

**How to avoid:**
Use `jsPDF` output `'datauristring'` and set the `href` of a hidden `<a>` element, then call `.click()`. For PPTX (`pptxgenjs`), use `writeFile()` which internally uses FileSaver.js — also broken on iOS. The reliable alternative is to open the PDF in a new tab using `window.open(blobUrl)` (which iOS Safari can display inline for PDFs) and add a user message: "Tap the share icon → Save to Files". PPTX cannot be viewed inline in Safari, so show a toast: "PPTX download is not supported in Safari. Use Chrome or desktop." Add a browser detection guard before the export button.

**Warning signs:**
Testing on a physical iPhone (not simulator) — the download button causes a page navigation to a `blob:` URL or the page reloads.

**Phase to address:**
Phase covering Step 3 export buttons on mobile (likely a sub-task of the Step 3 mobile phase).

---

### M-9: PNG Chart Download Produces Blurry Images on Retina/3x Screens

**What goes wrong:**
The existing `downloadChartPng` utility captures the chart SVG to canvas. On an iPhone 14/15 with a 3x device pixel ratio, the exported PNG is crisp on desktop but appears blurry when the canvas is not scaled for the device pixel ratio. When embedded in PDF/PPTX exports, it looks unprofessional.

**Why it happens:**
`canvas.width` defaults to CSS pixels. On a 3x device, each CSS pixel = 3 physical pixels. Drawing at CSS resolution and then displaying at physical resolution downscales the image. The existing utility may already handle this for desktop (2x) but needs verification for 3x.

**How to avoid:**
In `downloadChartPng.ts`, multiply canvas dimensions by `window.devicePixelRatio` and scale the context: `ctx.scale(dpr, dpr)`. Set the canvas CSS size to the original CSS pixel dimensions (via `canvas.style.width/height`). For server-side or CI testing where `devicePixelRatio` is undefined, default to `2`.

**Warning signs:**
Exported PNG looks sharp in the browser but blurry when opened on a phone or inserted into a presentation. The PNG file dimensions are smaller than expected for the rendered size.

**Phase to address:**
Phase covering chart PNG download (can be fixed in the same phase as chart responsiveness).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `user-scalable=no` in viewport meta | Prevents zoom, avoids redesign | Breaks accessibility (WCAG 2.1 violation), frustrates users who need zoom | Never |
| Hiding export buttons on mobile entirely | Avoids iOS blob issues | Users on mobile cannot export; primary value prop is degraded | Never for PDF; acceptable temporary workaround for PPTX with a toast message |
| `overflow-x: hidden` on `<body>` | Kills page horizontal scroll quickly | Silently breaks position-fixed elements on iOS; can clip legitimate content | Only as a last resort after table scroll wrapper is in place |
| Fixed pixel heights on chart containers | Predictable layout | Charts unusable on narrow screens; no reflow on orientation change | Never on mobile breakpoints |
| Skipping `apple-touch-icon`, relying on manifest | Less HTML clutter | Home screen icon shows screenshot on iOS; brand degraded | Never for a PWA/manifest feature |
| `@media print` for PDF instead of jsPDF | Much simpler | Cannot embed charts as crisp images; page breaks uncontrolled | Only if rich PDF is dropped from scope |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Vite + GitHub Pages + `manifest.json` | Place manifest in `src/` and import it as a JS module | Place in `public/` so Vite copies it verbatim to `dist/presizion/manifest.json`; reference via `<link rel="manifest" href="/presizion/manifest.json" />` |
| Vite `base: '/presizion/'` + manifest icon paths | Use absolute paths like `/icons/icon-192.png` in manifest | Paths in manifest are resolved relative to manifest URL, not page URL — use relative paths `./icons/icon-192.png` or paths that include the base |
| Recharts + Tailwind v4 + `@container` | Wrap chart in `@container` parent and use `@sm:` breakpoints | Container queries can conflict with `ResponsiveContainer`'s `ResizeObserver` — test interaction before committing |
| shadcn/ui `Dialog` + iOS soft keyboard | Dialog opens, input focused, keyboard pushes dialog off-screen | Set `max-height: 90dvh; overflow-y: auto` on `DialogContent`; ensure `position: fixed` dialog is inside a `overscroll-behavior: contain` ancestor |
| `canvas.toDataURL()` inside Recharts SVG | Call immediately after render | SVG animations may still be running; add `isAnimationActive={false}` to all chart series before capture |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Recharts renders full-resolution chart offscreen for PNG download on mobile | 3x canvas crashes memory on low-end phones | Cap devicePixelRatio at 2 for export; use `Math.min(window.devicePixelRatio, 2)` | Devices with >2x pixel ratio under memory pressure |
| All 3 wizard steps mounted simultaneously for CSS transitions | Unnecessary React render on step change | Keep only active step mounted; use conditional rendering not CSS `display:none` | As form complexity grows (vSAN fields, SPEC search results) |
| Large Tailwind v4 CSS generated for all breakpoints | Slower initial parse on mobile CPUs | Ensure `@tailwindcss/vite` tree-shaking is active; verify build output size with `npm run build` | Not a threshold issue, but compounds with slow mobile CPUs |
| `window.matchMedia` orientation change listener not cleaned up | Memory leak; stale orientation state after component unmount | Return cleanup from `useEffect`; use `screen.orientation.addEventListener` instead | Long-lived sessions (multi-hour usage is plausible for presales engineers) |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Touch targets smaller than 44×44px | Mis-taps on increment/decrement buttons, scenario selectors, step indicators | All interactive elements: `min-h-[44px] min-w-[44px]`; use padding not size when visual size must stay small |
| Numeric steppers with `<input type="number">` on mobile | iOS shows decimal keyboard instead of integer keyboard for whole-number fields; Android shows confusing combined keyboard | Use `inputmode="numeric" pattern="[0-9]*"` for integer fields; use `inputmode="decimal"` for decimal inputs like ratio (4.0) |
| Collapsible sections default-collapsed on mobile | Users do not discover vSAN and growth fields exist | Default collapsed on desktop (space saving); default expanded on mobile for discoverability, or show a visible "expand to configure" prompt |
| Wizard step indicators too small / not touch-friendly | Users cannot tap step 1 to go back | Minimum 44px height on each step indicator; the existing requirement says step indicators must be clickable |
| Export button row wraps to multiple lines, no visible scroll on mobile | PDF/PPTX/PNG/URL buttons disappear; users do not know they exist | Use a horizontally scrollable pill row for export buttons with visual scroll indicator; or stack into a "Share / Export" action sheet |
| Chart tooltips require hover — unavailable on touch | Data values invisible on mobile | Add `active` prop to chart tooltips; enable `touch` interaction mode in Recharts |
| Form labels truncated at 390px | Users cannot read what a field controls | Use `text-wrap: balance` or full-width labels above the input (not inline) on mobile |

---

## "Looks Done But Isn't" Checklist

- [ ] **Viewport meta:** Verify `width=device-width, initial-scale=1.0` is present in `index.html` — missing `initial-scale` causes 980px default viewport on iOS.
- [ ] **iOS auto-zoom:** Open Step 1 on a real iPhone, focus each numeric input. Viewport must not shift.
- [ ] **Apple touch icon:** "Add to Home Screen" on iOS 17+ shows the Presizion icon, not a screenshot. Verify on-device.
- [ ] **Manifest scope:** Chrome DevTools → Application → Manifest → no scope/start_url error shown.
- [ ] **Standalone mode:** Launch from home screen on iOS. No Safari URL bar visible. Status bar style matches theme.
- [ ] **Table scroll:** The comparison table scrolls horizontally inside its container. The page header does NOT scroll with it.
- [ ] **Chart reflow:** Rotate iPhone from portrait to landscape. Charts expand to fill the wider width within 200ms.
- [ ] **Export on iOS:** PDF button on iOS Safari either opens PDF in new tab with a "save to Files" message, OR a friendly toast explains the limitation. No blank page or page reload.
- [ ] **Touch targets:** All buttons, step indicators, and icon buttons are at least 44×44px tap area. Verify with browser accessibility inspector.
- [ ] **Manifest icons in build:** `npm run build` output contains `dist/presizion/icons/icon-192.png` and `icon-512.png`. They are not 404 in production.
- [ ] **`dvh` fallback:** Browsers that do not support `dvh` (Safari < 16.0) fall back to `vh` — test with DevTools UA override.
- [ ] **Orientation change:** Rotate device twice quickly. No layout artifacts. Charts re-render correctly.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Auto-zoom baked into many form components | LOW | Add `@media (hover: none) { input { font-size: 16px; } }` to global CSS; one change fixes all inputs |
| Manifest scope wrong in production | LOW | Update `public/manifest.json`; rebuild and deploy; manifest is cached by browser but reinstall clears it |
| Apple-touch-icon missing or wrong size | LOW | Add 180×180 PNG to `public/`; add `<link>` tag to `index.html` |
| Table causing page-level overflow | MEDIUM | Add `overflow-x: hidden` to wizard shell + `overflow-x: auto` to table wrapper; must verify it doesn't break fixed-position modals |
| Chart not reflowing on orientation change | MEDIUM | Force remount with `key={orientation}` where `orientation` from `screen.orientation.type`; surgical fix per chart component |
| iOS PDF export broken | HIGH | Requires rearchitecting export to use inline viewer + save-to-files UX; test on physical device only (simulator doesn't replicate blob behavior accurately) |
| All touch targets under 44px | HIGH | Requires systematic audit + CSS additions across all three steps; should be caught in the mobile layout phase, not after |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| M-1: iOS input auto-zoom | Phase covering global CSS / Step 1 mobile form | Focus each input on real iPhone; viewport does not shift |
| M-2: 100vh clips content | Phase covering WizardShell mobile layout | Check on iPhone with toolbar visible; "Next" button fully visible on load |
| M-3: Manifest start_url/scope | Phase covering web app manifest setup | Chrome DevTools Application tab shows no installability errors |
| M-4: apple-touch-icon required | Phase covering web app manifest setup | Add to Home Screen on iOS shows Presizion icon |
| M-5: status-bar-style + standalone | Phase covering web app manifest setup | Launch from home screen; status bar readable in both light/dark themes |
| M-6: Table page overflow | Phase covering Step 3 responsive layout | Page header stays fixed when swiping table; no body horizontal scroll |
| M-7: Recharts resize failure | Phase covering Step 2/3 chart responsiveness | Rotate device; charts expand without page reload |
| M-8: jsPDF/PPTX iOS blob | Phase covering Step 3 export on mobile | Test PDF export on physical iPhone; no page reload or blank tab |
| M-9: PNG blurry on 3x screens | Phase covering chart PNG download | Export PNG on iPhone 14/15; open image; text is sharp at 100% zoom |

---

## Sources

- [iOS Safari shrink-to-fit viewport quirk — bitsofcode](https://bitsofco.de/ios-safari-and-shrink-to-fit/)
- [Apple: Configuring Web Applications (standalone mode, apple-touch-icon, status-bar-style)](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)
- [Web Icons in 2025: Touch Icons, Adaptive Icons & manifest.json — browserux.com](https://browserux.com/blog/guides/web-icons/touch-adaptive-icons-manifest.html)
- [iOS PWA Compatibility — firt.dev](https://firt.dev/notes/pwa-ios/)
- [16px or Larger Text Prevents iOS Form Zoom — CSS-Tricks](https://css-tricks.com/16px-or-larger-text-prevents-ios-form-zoom/)
- [Preventing iOS Textbox Auto Zooming — Rick Strahl](https://weblog.west-wind.com/posts/2023/Apr/17/Preventing-iOS-Textbox-Auto-Zooming-and-ViewPort-Sizing)
- [Defensive CSS: Input zoom on iOS Safari](https://defensivecss.dev/tip/input-zoom-safari/)
- [100vh problem with iOS Safari — DEV Community](https://dev.to/maciejtrzcinski/100vh-problem-with-ios-safari-3ge9)
- [Understanding svh, lvh, dvh — Medium](https://medium.com/@tharunbalaji110/understanding-mobile-viewport-units-a-complete-guide-to-svh-lvh-and-dvh-0c905d96e21a)
- [jsPDF output/save not working on Safari Mobile — GitHub Issue #3059](https://github.com/parallax/jsPDF/issues/3059)
- [jsPDF blob URL Safari — GitHub Issue #460](https://github.com/parallax/jsPDF/issues/460)
- [Recharts ResponsiveContainer not resizing from large to small — GitHub Issue #172](https://github.com/recharts/recharts/issues/172)
- [Recharts ResponsiveContainer performance — GitHub Issue #1767](https://github.com/recharts/recharts/issues/1767)
- [shadcn/ui Drawer Input Obstructed by Keyboard on Mobile — GitHub Issue #2849](https://github.com/shadcn-ui/ui/issues/2849)
- [Tailwind v4 — Desktop-first support broken — GitHub Discussion #16340](https://github.com/tailwindlabs/tailwindcss/discussions/16340)
- [Tailwind v4 Container Queries — SitePoint](https://www.sitepoint.com/tailwind-css-v4-container-queries-modern-layouts/)
- [Web App Manifest start_url — MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/start_url)
- [Turning a GitHub Page into a PWA — Christian Heilmann](https://christianheilmann.com/2022/01/13/turning-a-github-page-into-a-progressive-web-app/)
- [Vite PWA plugin — manifest icon 404 paths — GitHub Issue #396](https://github.com/vite-pwa/vite-plugin-pwa/issues/396)
- [iOS Safari position-fixed bounce — Smashing Magazine](https://smashingmagazine.com/2018/08/scroll-bouncing-websites/)
- [WCAG 2.5.8 Target Size (Minimum) — AllAccessible](https://www.allaccessible.org/blog/wcag-258-target-size-minimum-implementation-guide)
- [Canvas toDataURL + devicePixelRatio — MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toDataURL)

---
*Pitfalls research for: Mobile-first responsive redesign + Web App Manifest (Presizion v2.4)*
*Researched: 2026-03-16*
