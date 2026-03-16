# Stack Research — v2.4 Mobile-First Responsive Redesign + Web App Manifest

**Domain:** Mobile-first responsive web app + PWA branding for existing React 19 + Tailwind v4 + shadcn/ui static site
**Researched:** 2026-03-16
**Confidence:** HIGH

## Recommended Stack

### Core Technologies (No New Packages Required)

| Technology | Version | Purpose | Why Sufficient |
|------------|---------|---------|----------------|
| Tailwind CSS v4 | ^4.2.1 (already installed) | Mobile-first responsive layout, touch utilities, container queries | v4 ships breakpoints, `touch-action`, `overflow-x`, `min-w`, `max-w`, `gap`, grid utilities natively. No plugin needed |
| shadcn/ui ScrollArea | already installed | Horizontally scrollable comparison table on mobile | Wraps Radix ScrollArea with custom thumb; `ScrollAreaScrollbar orientation="horizontal"` handles Step 3 table overflow |
| Recharts ResponsiveContainer | 2.15.4 (already installed) | Charts resize to parent width on mobile | Already used in the project; wrapping charts in 100%-width containers is sufficient — no library change needed |

### Supporting Libraries (New — Icon Generation Only)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @vite-pwa/assets-generator | ^0.2.x (dev only) | CLI tool: generates all PWA icon sizes from source SVG | Run once at dev time to produce `public/icons/` PNGs. Not bundled into app. Standalone — does NOT require vite-plugin-pwa |

### Development Tools (No Changes)

| Tool | Purpose | Notes |
|------|---------|-------|
| Vite 8 | Static build + asset handling | Already handles `public/manifest.webmanifest` via static copy; no PWA plugin required since we explicitly exclude service workers (see PROJECT.md Out of Scope) |

## Installation

```bash
# Icon generation only — dev dependency, not bundled
npm install -D @vite-pwa/assets-generator

# No new runtime dependencies needed
```

## What Changes in index.html

The following meta tags must be added to `index.html` `<head>` (no npm install):

```html
<!-- Already present — leave as-is -->
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<!-- Replace with viewport-fit=cover for iPhone safe area support -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />

<!-- Web app manifest link -->
<link rel="manifest" href="/presizion/manifest.webmanifest" />

<!-- iOS-specific: Safari ignores manifest, reads these directly -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Presizion" />
<link rel="apple-touch-icon" href="/presizion/icons/apple-touch-icon-180x180.png" />

<!-- Android/Chrome theme color -->
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
<meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />
```

## manifest.webmanifest Content

File at `public/manifest.webmanifest` (Vite copies `public/` to dist verbatim):

```json
{
  "name": "Presizion — Cluster Refresh Sizing",
  "short_name": "Presizion",
  "description": "Size a refreshed server cluster from existing environment metrics",
  "start_url": "/presizion/",
  "scope": "/presizion/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#7c3aed",
  "icons": [
    {
      "src": "/presizion/icons/pwa-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/presizion/icons/pwa-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/presizion/icons/maskable-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

Key constraint: `start_url` and `scope` must use `/presizion/` (the GitHub Pages base path). Relative URLs in manifest resolve against the manifest file's own URL, but explicit absolute paths with the subpath are safer across browsers.

## Icon Generation with @vite-pwa/assets-generator

Source: existing `public/logo.svg` (or `public/favicon.svg`).

Config file `pwa-assets.config.ts`:

```typescript
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  preset: minimal2023Preset,
  images: ['public/favicon.svg'],
})
```

Run script in `package.json`:

```json
"generate-icons": "pwa-assets-generator --config pwa-assets.config.ts"
```

Output: `public/icons/` directory with `pwa-192x192.png`, `pwa-512x512.png`, `maskable-512x512.png`, `apple-touch-icon-180x180.png`. The `minimal2023` preset covers exactly these sizes.

## Tailwind v4 Responsive Utilities (Already Available)

No new CSS library needed. Tailwind v4's built-in utilities cover all mobile requirements:

| Requirement | Tailwind Approach | Example |
|-------------|-------------------|---------|
| Single-column form on mobile | Unprefixed layout + `md:grid-cols-2` | `grid grid-cols-1 md:grid-cols-2` |
| Stacked scenario cards | `flex flex-col md:flex-row` | Already the right direction |
| Horizontally scrollable table | `overflow-x-auto` on wrapper | `<div class="overflow-x-auto">` |
| Touch-friendly tap targets | `min-h-11 min-w-11` (44px minimum) | Applies to buttons and nav items |
| iPhone safe area padding | CSS `env()` variables in `index.css` | `padding-bottom: env(safe-area-inset-bottom)` |
| Container-based queries | `@container` + `@sm:` variants | Optional; viewport breakpoints likely sufficient |

Breakpoints in v4 (rem-based, mobile-first):
- `sm` = 40rem (640px) — tablets portrait
- `md` = 48rem (768px) — tablets landscape
- `lg` = 64rem (1024px) — desktop

iPhone 14/15 is 390px wide. All unprefixed utilities apply at 390px. Use `sm:` variants only for 640px+ layouts.

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Manual manifest.webmanifest in public/ | vite-plugin-pwa | Full PWA plugin adds service worker infrastructure — explicitly out of scope (PROJECT.md). Also has known Vite 6+ conflict with Vite's own manifest.json build output |
| @vite-pwa/assets-generator (CLI, dev-only) | pwa-asset-generator (npm pkg) | Both use Sharp under the hood; @vite-pwa/assets-generator integrates with the project's existing Vite ecosystem and has better preset support for the required sizes |
| shadcn ScrollArea for table overflow | react-virtualized / tanstack-virtual | Overkill — the comparison table has at most 5-6 scenario columns; virtual scrolling adds complexity with no benefit at that scale |
| Tailwind v4 built-ins for responsive | Headless UI breakpoint hooks | Unnecessary — CSS breakpoints handle all layout switching; JS-driven layout changes add complexity |
| CSS env() safe-area in index.css | Capacitor / Ionic safe area plugin | Native wrapper approach — irrelevant for a static GitHub Pages web app |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| vite-plugin-pwa | Installs service worker infrastructure that is explicitly out of scope; known conflict with Vite 8's `manifest.json` build output option | Manual `public/manifest.webmanifest` + `@vite-pwa/assets-generator` for icons only |
| Service worker (any) | PROJECT.md explicitly states "Service worker / offline capability — manifest is for branding only, not full PWA" | No service worker |
| `sm:` prefix for mobile-only styles | Tailwind is mobile-first: `sm:` means 640px+, NOT mobile. Common mistake that breaks iPhone layouts | Unprefixed utilities for mobile; `sm:` and above for larger screens |
| Transparent PNG icons | iOS fills transparency with uncontrolled background color; looks wrong on home screen | Solid background in all icon PNGs; use the maskable icon with padding for Android adaptive icons |
| Adding a custom Tailwind breakpoint for 390px | Redundant — unprefixed utilities already apply at all widths below `sm` (640px) | Design mobile layout with unprefixed classes; 390px is fully covered |

## Stack Patterns by Scenario

**If a section needs horizontal scroll on mobile (Step 3 comparison table):**
- Wrap in `<div class="overflow-x-auto -mx-4 px-4">` to allow edge-to-edge scroll while keeping page padding
- Inner table: `min-w-[600px]` to set minimum scroll width
- Do NOT use ScrollArea for this — native `overflow-x-auto` has better touch momentum on iOS

**If a section should stack on mobile and go side-by-side on tablet (Step 2 scenario cards):**
- `flex flex-col sm:flex-row gap-4`
- Cards: `w-full sm:w-80 flex-shrink-0`

**If a button row needs to wrap gracefully on 390px:**
- `flex flex-wrap gap-2` not `flex gap-2` (prevents overflow)

**If a chart needs to fit iPhone 390px:**
- `<ResponsiveContainer width="100%" height={220}>` with reduced `height` for mobile
- Use CSS media query or Tailwind's `sm:h-80` on the chart wrapper div to increase height on larger screens

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| @vite-pwa/assets-generator ^0.2.x | Node 18+, any Vite version | Dev-time CLI only; has no runtime; no Vite version constraint |
| manifest.webmanifest (static file) | Vite 8 | Vite copies `public/` verbatim to `dist/` — no compatibility concern |
| CSS env(safe-area-inset-*) | iOS Safari 11.1+, Chrome 69+ | Universally supported on all target devices; requires `viewport-fit=cover` in viewport meta tag |

## Sources

- [Tailwind CSS v4 Responsive Design](https://tailwindcss.com/docs/responsive-design) — breakpoints, mobile-first approach, v4 `--breakpoint-*` theme variables (HIGH confidence)
- [Tailwind CSS touch-action](https://tailwindcss.com/docs/touch-action) — touch interaction utilities (HIGH confidence)
- [MDN: Making PWAs Installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable) — service worker NOT required; minimum manifest fields for Chrome (192+512px icons, name, start_url, display) (HIGH confidence)
- [MDN: Web Application Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest) — manifest field reference (HIGH confidence)
- [vite-pwa/assets-generator](https://github.com/vite-pwa/assets-generator) — standalone CLI, minimal2023 preset, SVG source support (MEDIUM confidence — verified via npm page and GitHub README)
- [web.dev: Web App Manifest](https://web.dev/learn/pwa/web-app-manifest) — icon sizing, maskable icons, background_color for splash screen (HIGH confidence)
- [MDN: start_url](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/start_url) — subdirectory URL handling for GitHub Pages (HIGH confidence)
- [CSS-Tricks: env()](https://css-tricks.com/almanac/functions/e/env/) — safe-area-inset-* variables, viewport-fit=cover requirement (HIGH confidence)
- [shadcn/ui: Scroll Area](https://ui.shadcn.com/docs/components/radix/scroll-area) — horizontal scrollbar support via ScrollAreaScrollbar (MEDIUM confidence)
- [Recharts: ResponsiveContainer](https://recharts.org/?p=%2Fen-US%2Fapi%2FResponsiveContainer) — existing component, sufficient for mobile (HIGH confidence)

---
*Stack research for: Mobile-first responsive redesign + web app manifest (Presizion v2.4)*
*Researched: 2026-03-16*
