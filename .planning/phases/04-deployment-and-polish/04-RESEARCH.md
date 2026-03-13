# Phase 4: Deployment and Polish - Research

**Researched:** 2026-03-12
**Domain:** Vite/GitHub Pages deployment, Tailwind v4 dark mode, formula display, UX polish
**Confidence:** HIGH

---

## Summary

Phase 4 has two hard requirements: DEPLOY-01 (static build with correct base path for GitHub Pages) and UX-06 (OS dark-mode preference respected). The remaining success criteria — formula display, utilization color-coding, clipboard feedback — are largely or wholly already implemented in Phase 1–3 code. The planner should confirm existing implementations before planning new work.

**Primary recommendation:** Fix the dark mode custom variant in `src/index.css` (currently class-only, must add media query fallback), set `base: '/presizion/'` in `vite.config.ts`, and add a GitHub Actions workflow. Formula display (CALC-07) and color-coded utilization (UX-04) are already implemented; clipboard feedback (button state) is the one remaining polish item.

**The GitHub repository slug is `presizion`** (verified from `git remote -v` showing `https://github.com/fjacquet/presizion.git`). GitHub Pages URL will be `https://fjacquet.github.io/presizion/`.

---

<phase_requirements>   s s s

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEPLOY-01 | App builds as pure static assets (Vite) with correct `base` path configuration for GitHub Pages deployment | Vite `base` config + GitHub Actions `pages` workflow |
| UX-06 | App respects user's OS dark-mode preference (`prefers-color-scheme`); all text, backgrounds, borders, and utilization color indicators render correctly in both light and dark mode | Fix `@custom-variant dark` in index.css + add anti-flash script to index.html |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vite | ^8.0.0 (already installed) | Build tool with `base` config | Official GitHub Pages deployment method |
| GitHub Actions | N/A | CI/CD pipeline | Zero-infra, integrates with Pages natively |
| `actions/deploy-pages@v4` | v4 | Deploy `dist/` to GitHub Pages | Official action, handles Pages API |
| `actions/upload-pages-artifact@v3` | v3 | Upload build output as artifact | Required by deploy-pages |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `npx serve` | any | Local verification of `dist/` build | Manual smoke test post-build |
| Tailwind v4 `@custom-variant` | already installed | Override dark mode selector | Required to combine class + media |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| GitHub Actions deploy | `gh-pages` npm package | Actions is official; no extra dep needed |
| `@custom-variant` override | Remove override entirely | Removing `@custom-variant dark` restores pure media-query behavior, but `dark:` utilities in shadcn would stop working unless `.dark` class applied by JS |

**No new npm install needed for DEPLOY-01.** GitHub Actions does not require a package.

---

## Architecture Patterns

### Recommended Project Structure

```
.github/
  workflows/
    deploy.yml           # GitHub Actions deploy workflow
src/
  index.css              # MODIFIED: fix @custom-variant dark
index.html               # MODIFIED: add anti-flash script
vite.config.ts           # MODIFIED: add base: '/presizion/'
```

### Pattern 1: Vite Base Path for GitHub Pages (Project Repo)

**What:** Set `base` in `vite.config.ts` to `'/<repo-name>/'` so all asset URLs in the compiled output are rooted at the subpath, not `/`.

**When to use:** Always for project repositories (not org-level pages).

**Example:**

```typescript
// Source: https://vite.dev/guide/static-deploy#github-pages
// vite.config.ts
import path from 'path'
import tailwindcss from '@tailwindcss/postcss'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/presizion/',          // <-- ADD THIS
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
})
```

**Why `/presizion/` specifically:** `git remote -v` confirms the repo is `https://github.com/fjacquet/presizion.git`. GitHub Pages for a project repo deploys to `https://fjacquet.github.io/presizion/`. Assets served from `/` would 404.

### Pattern 2: GitHub Actions Deploy Workflow

**What:** A workflow that builds on push to `main` and deploys `dist/` to the GitHub Pages environment.

**When to use:** Every push to main; requires Pages enabled in repo settings with Source = "GitHub Actions".

**Example:**

```yaml
# Source: https://vite.dev/guide/static-deploy#github-pages
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

**Setup prerequisite:** In the GitHub repository Settings > Pages, set Source to "GitHub Actions" (not the branch/folder method).

### Pattern 3: Dark Mode Fix — Two-Strategy Approach

**Critical finding:** The current `src/index.css` has:

```css
@custom-variant dark (&:is(.dark *));
```

This means `dark:` Tailwind utilities ONLY activate when a `.dark` class is present on an ancestor element. Without a `ThemeProvider` or JavaScript that adds `.dark` to `<html>`, the OS dark mode preference is completely ignored. This directly violates UX-06.

**The CSS already has** `.dark { ... }` variable overrides (lines 181–212 of `src/index.css`) and `@media (prefers-color-scheme: dark)` overrides for `--bg`, `--text`, etc. (lines 100–118). But these only cover the custom CSS variables (`--bg`, `--text-h`, etc.) — the shadcn/ui CSS variables (`--background`, `--foreground`, `--card`, etc.) in the `.dark` block are NOT covered by any media query.

**Solution — add anti-flash script to `index.html` + expand `@custom-variant`:**

**Option A (recommended for v1 — OS preference only, no manual toggle):**

In `index.html`, add a blocking script before `<div id="root">` to apply `.dark` class based on system preference:

```html
<!-- index.html — add inside <head>, before <script type="module"> -->
<script>
  try {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark')
    }
  } catch (_) {}
</script>
```

The `@custom-variant dark (&:is(.dark *))` already in `index.css` then works correctly because JS sets `.dark` on `<html>` before first paint. No `ThemeProvider` needed for v1 (manual toggle is v2 requirement UI-01).

**Option B (pure CSS, simpler but loses `dark:` utility support for shadcn variables):**

Replace `.dark { ... }` block with `@media (prefers-color-scheme: dark) { :root { ... } }`. This works for the custom CSS vars but shadcn CSS vars would not respond to `dark:` Tailwind classes.

**Verdict: Use Option A.** The shadcn/ui variables are defined in the `.dark` block only (not in any media query). Option A applies `.dark` via JS based on OS preference — this activates both the shadcn CSS vars and all `dark:` Tailwind utilities correctly. The anti-flash script runs synchronously before DOM render, so no flash occurs.

### Pattern 4: Clipboard Visual Feedback

**What:** After "Copy Summary" is clicked, the button label briefly changes to "Copied!" to confirm success.

**When to use:** Any async action with ambiguous completion state.

**Implementation approach:** Use a `useState` boolean for `copied`. On click success, set `copied = true` and schedule `setTimeout(() => setCopied(false), 2000)`. Render button label as `{copied ? 'Copied!' : 'Copy Summary'}`.

**Caution:** Avoid memory leaks — clear the timeout in a cleanup if the component unmounts. Use `useEffect` cleanup or store the timeout ref.

### Anti-Patterns to Avoid

- **Setting `base: '/'` for a project repo:** Assets will load from the root domain path, not the subpath, causing 404s on GitHub Pages.
- **Omitting `base` entirely:** Same problem as above — Vite defaults to `'/'`.
- **Using `@custom-variant dark` with media query override only (no class):** Breaks manual toggle (v2 UI-01) and the current shadcn `.dark` CSS variable block.
- **Using `ThemeProvider` from `next-themes`:** This is a Next.js library. For Vite React, use the inline script approach or a simple custom hook.
- **Adding `dark:` classes without ensuring `.dark` class is set:** If the anti-flash script is absent, OS dark mode will not apply `dark:` utilities until React hydrates, causing flash.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GitHub Pages deployment | Custom bash script | GitHub Actions `actions/deploy-pages@v4` | Official, handles permissions + artifact API |
| Dark mode class detection | Custom MutationObserver | Inline `<script>` in `index.html` | Runs synchronously before paint, eliminates flash |
| Asset base path at build time | Runtime path computation | Vite `base` config option | Build-time substitution, no runtime overhead |

**Key insight:** For a client-side static app, dark mode via an inline script is simpler and more reliable than a React ThemeProvider — it runs before the first paint so there is never a flash of wrong theme.

---

## Common Pitfalls

### Pitfall 1: Blank Page on GitHub Pages After Deployment

**What goes wrong:** Assets are served from the wrong path; `index.html` loads but JS/CSS 404.
**Why it happens:** Vite's default `base: '/'` generates asset URLs like `/assets/index-abc.js`, which resolves to `https://fjacquet.github.io/assets/...` instead of `https://fjacquet.github.io/presizion/assets/...`.
**How to avoid:** Set `base: '/presizion/'` in `vite.config.ts` before running `npm run build`.
**Warning signs:** Browser console shows net::ERR_ABORTED 404 for JS/CSS files after deploy.

### Pitfall 2: Dark Mode Flash (FOUC)

**What goes wrong:** Page renders in light mode for ~100ms then switches to dark if OS prefers dark.
**Why it happens:** React hydration applies the `.dark` class after initial paint.
**How to avoid:** Add the synchronous blocking script to `index.html` `<head>` before `<script type="module">`.
**Warning signs:** Visible white flash on load in dark OS environments.

### Pitfall 3: Dark Mode Ignores Utilization Colors

**What goes wrong:** `text-red-600`, `text-amber-600`, `text-green-600` look incorrect in dark mode.
**Why it happens:** Tailwind's named colors (red-600 etc.) do not have dark: variants applied in ComparisonTable; the `utilizationClass()` function returns fixed color classes.
**How to avoid:** Use `dark:text-red-400`, `dark:text-amber-400`, `dark:text-green-400` variants alongside the existing light-mode classes OR use semantic color tokens (`text-destructive`, etc.) that already have dark mode CSS variable overrides.
**Warning signs:** In dark mode the table cells appear to use insufficiently contrasting colors.

### Pitfall 4: SPA Routing 404 on Refresh

**What goes wrong:** Navigating to `https://fjacquet.github.io/presizion/step/2` returns a 404 from GitHub Pages.
**Why it happens:** GitHub Pages serves only static files; it doesn't know to route all paths to `index.html`.
**How to avoid:** This app uses Zustand state (not URL routing), so no actual URL routing exists — this pitfall does NOT apply here. Confirm there is no `react-router` or similar in `package.json`. Confirmed: no router present.
**Warning signs:** Any navigation that changes the browser URL path.

### Pitfall 5: `npm run build` Fails TypeScript Errors

**What goes wrong:** `tsc -b && vite build` (the build script) fails on TypeScript errors before Vite runs.
**Why it happens:** `npm run build` includes `tsc -b` — any type errors in source files will block the build.
**How to avoid:** Run `npm run build` locally and fix all TypeScript errors before setting up the CI workflow.
**Warning signs:** GitHub Actions build step exits with non-zero code on `tsc -b`.

---

## Code Examples

Verified patterns from official sources:

### Anti-Flash Dark Mode Script (index.html)

```html
<!-- Source: https://ui.shadcn.com/docs/dark-mode/vite -->
<!-- Place in <head> before <script type="module"> -->
<script>
  try {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark')
    }
  } catch (_) {}
</script>
```

### Clipboard Feedback (useState pattern)

```typescript
// Source: React useState + setTimeout pattern
import { useState } from 'react'

const [copied, setCopied] = useState(false)

const handleCopy = async (): Promise<void> => {
  const text = buildSummaryText(currentCluster, scenarios, results)
  await copyToClipboard(text)
  setCopied(true)
  setTimeout(() => setCopied(false), 2000)
}

// In JSX:
// <Button variant="outline" onClick={() => { void handleCopy() }}>
//   {copied ? 'Copied!' : 'Copy Summary'}
// </Button>
```

### Dark Mode Utilization Colors (safe dark-mode variants)

```typescript
// Source: project pattern, extends existing utilizationClass()
// In ComparisonTable.tsx, update utilizationClass():
export function utilizationClass(pct: number): string {
  if (pct >= 90) return 'text-red-600 dark:text-red-400 font-semibold'
  if (pct >= 70) return 'text-amber-600 dark:text-amber-400'
  return 'text-green-600 dark:text-green-400'
}
```

---

## What Is Already Implemented (Do NOT re-implement)

| Success Criterion | Status | Location |
|-------------------|--------|----------|
| Utilization color-coding green/amber/red | DONE | `src/components/step3/ComparisonTable.tsx` — `utilizationClass()` exported |
| Limiting resource visually highlighted | DONE | `ComparisonTable.tsx` line 78: `font-bold` class on limiting resource cell |
| Formula strings available | PARTIAL | `src/lib/sizing/formulas.ts` has JSDoc formulas; no `display.ts` yet (Phase 1 plan 04 was planned but `src/lib/sizing/display.ts` does not exist — file check shows only `constraints.ts`, `defaults.ts`, `formulas.ts`, `parseNumericInput.ts`) |
| Formula display in Step 2 | NOT DONE | `ScenarioResults.tsx` shows counts but no formula strings |
| Formula display in Step 3 | NOT DONE | `ComparisonTable.tsx` shows values but no formula strings |
| Clipboard "Copied!" feedback | NOT DONE | `Step3ReviewExport.tsx` calls `copyToClipboard` with no UI state change |

**Implication for planning:** CALC-07 (formula display, Phase 1 plan 04) was planned but the `display.ts` module was not created. The planner should include a task to create `src/lib/sizing/display.ts` with formula string functions, and update `ScenarioResults.tsx` to show formula strings inline. ComparisonTable formula strings are optional (data is shown; adding formula would increase noise) — the planner should assess whether success criterion 3 applies to the comparison table or only to the per-scenario results in Step 2.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.js` `darkMode: 'class'` | `@custom-variant dark` in CSS | Tailwind v4 | CSS-first, no JS config |
| `gh-pages` npm package for deployment | GitHub Actions `deploy-pages` | 2023+ | No extra runtime dep |
| `process.env.NODE_ENV` base path switching | Vite `base` config option | Vite v2+ | Cleaner, declarative |
| `tailwindcss/vite` plugin | `@tailwindcss/postcss` plugin | Tailwind v4 | Project already uses postcss path |

**Deprecated/outdated:**

- `tailwindcss-animate`: Replaced by `tw-animate-css` in this project (already done).
- `peaceiris/actions-gh-pages`: Replaced by official `actions/deploy-pages`. Both work, but official is preferred.

---

## Open Questions

1. **Formula display scope (success criterion 3)**
   - What we know: Criterion says "Each key output value in Steps 2 and 3" — CALC-07 was supposed to cover this in Phase 1
   - What's unclear: Whether the planner should create `display.ts` + update both Step 2 and Step 3 components, or only Step 2 (where per-scenario results are shown)
   - Recommendation: Create `display.ts` with formula string generators; add inline formula display to `ScenarioResults.tsx` (Step 2); skip ComparisonTable (too many cells, would be noise)

2. **GitHub Pages repository access**
   - What we know: The remote is `https://github.com/fjacquet/presizion.git`
   - What's unclear: Whether GitHub Pages is enabled for this repo and whether the user account/plan supports it
   - Recommendation: Document as a manual setup step in the Wave 0 or deployment plan — repo Settings > Pages > Source must be set to "GitHub Actions" by the repo owner

3. **Node version for CI**
   - What we know: Local package.json uses Vite 8 and TypeScript 5.9
   - What's unclear: Whether Node 20 or Node 22 is optimal for this toolchain
   - Recommendation: Use Node 22 LTS (stable as of 2025); Vite 8 is compatible

---

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json` — this section is REQUIRED.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.0 with jsdom |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npm run test` (runs `vitest run`) |
| Full suite command | `npm run test` |
| Current baseline | 155 tests passing, 0 failing |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEPLOY-01 | `vite build` produces dist/ with correct asset paths | smoke (manual) | `npm run build && ls dist/` — verify no blank page via `npx serve dist` | N/A (build artifact) |
| DEPLOY-01 | `base` config set to `/presizion/` in vite.config.ts | unit (config check) | `grep "base.*presizion" vite.config.ts` | ❌ Wave 0 — config change |
| UX-06 | Anti-flash script in index.html adds `.dark` class when OS prefers dark | unit | `src/__tests__/darkMode.test.ts` — jsdom matchMedia mock | ❌ Wave 0 |
| UX-06 | `utilizationClass()` uses dark: variants for correct dark mode contrast | unit | `src/components/step3/__tests__/ComparisonTable.test.tsx` — extend existing tests | ✅ exists, needs extension |
| UX-06 | `.dark` CSS variable block covers all shadcn tokens | manual | Visual inspection in dark OS + DevTools | Manual only |
| CALC-07 (carried from P1) | `display.ts` exports formula string for CPU/RAM/disk constraints | unit | `src/lib/sizing/__tests__/display.test.ts` | ❌ Wave 0 |
| CALC-07 (carried from P1) | `ScenarioResults.tsx` renders formula strings inline | unit | `src/components/step2/__tests__/ScenarioResults.test.tsx` | ✅ exists, needs extension |

### Sampling Rate

- **Per task commit:** `npm run test`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green + manual dark mode smoke test before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/__tests__/darkMode.test.ts` — unit tests for the anti-flash script behavior (mock `window.matchMedia`)
- [ ] `src/lib/sizing/__tests__/display.test.ts` — unit tests for formula string functions in display.ts (if display.ts is created as part of this phase)
- [ ] GitHub Actions workflow: `.github/workflows/deploy.yml` — deployment config (not a test file, but must exist before deploy plan executes)
- [ ] `vite.config.ts` `base` field: must be set before build verification

Note: The `darkMode.test.ts` is inherently limited in jsdom — `window.matchMedia` must be mocked. The test validates the script logic in isolation, not the full DOM behavior. Visual dark mode verification remains a manual step.

---

## Sources

### Primary (HIGH confidence)

- <https://vite.dev/guide/static-deploy> — Official Vite static deployment guide; GitHub Pages section reviewed
- <https://tailwindcss.com/docs/dark-mode> — Tailwind v4 official dark mode documentation; `@custom-variant` syntax verified
- `src/index.css` (project file) — Current `@custom-variant dark (&:is(.dark *))` confirmed; `.dark` CSS variable block confirmed; `@media (prefers-color-scheme: dark)` block for legacy vars confirmed

### Secondary (MEDIUM confidence)

- <https://ui.shadcn.com/docs/dark-mode/vite> — shadcn/ui Vite dark mode guide; anti-flash script pattern
- <https://ui.shadcn.com/docs/tailwind-v4> — Tailwind v4 integration notes for shadcn
- `git remote -v` output — Confirmed repo slug is `presizion`; base path derived from this

### Tertiary (LOW confidence)

- WebSearch results for GitHub Actions YAML — workflow structure confirmed against official Vite docs pattern

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — Vite, GitHub Actions, Tailwind v4 all verified via official docs
- Architecture: HIGH — `base` path value derived from actual git remote; dark mode diagnosis from reading actual index.css
- Pitfalls: HIGH — Flash-of-wrong-theme and blank-page pitfalls verified against Vite/Tailwind official docs; routing pitfall verified as N/A (no router in project)

**Research date:** 2026-03-12
**Valid until:** 2026-06-12 (Tailwind v4 and Vite 8 are stable releases; GitHub Actions API is stable)

---

## RESEARCH COMPLETE
