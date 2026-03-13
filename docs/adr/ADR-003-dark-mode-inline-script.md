# ADR-003: Dark Mode via Inline Script (Not ThemeProvider)

**Date:** 2026-03-12
**Status:** Accepted
**Milestone:** v1.0

## Context

The app uses Tailwind v4's `@custom-variant dark (&:is(.dark *))` — dark-mode utilities activate only when a `.dark` class is present on an ancestor element. No JS was setting this class, so OS dark-mode preference was ignored.

Options considered:

1. **Inline `<script>` in `<head>`**: Synchronously reads `window.matchMedia` and sets `.dark` on `<html>` before first paint.
2. **React ThemeProvider**: A React component reads OS preference and sets `.dark` via `useEffect`.
3. **Pure CSS `@media` query**: Replace the `.dark` block with `@media (prefers-color-scheme: dark) { :root { ... } }`.

## Decision

Use an **inline blocking `<script>` in `index.html`** that runs before the module script:

```html
<script>
  try {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark')
    }
  } catch (_) {}
</script>
```

## Rationale

- **No FOUC**: The script runs synchronously before any paint, so the correct theme is applied before the first pixel is rendered. A ThemeProvider-based approach runs after React hydration, causing a flash of the wrong theme.
- **No new dependencies**: `next-themes` is a Next.js library; building a custom ThemeProvider adds complexity for a feature that doesn't need React at all.
- **Pure CSS option rejected**: The shadcn/ui CSS variable overrides are defined in the `.dark` class block, not in any `@media` query. Replacing them with media queries would decouple the CSS from the `dark:` Tailwind utilities — future UI additions using `dark:` would not work without the `.dark` class.
- **v2 upgrade path**: A manual toggle (v2 `UI-01`) will need JS to set `.dark` regardless, so the inline script approach is forward-compatible.

## Consequences

- `index.html` contains a non-module `<script>` block in `<head>`.
- No `ThemeProvider` or `useTheme` hook exists in the React tree.
- OS preference is read once at page load; changes to OS preference during a session require a page reload (acceptable for v1).
- The `try/catch` guard ensures SSR or unusual environments (e.g., jsdom without matchMedia mock) don't throw.
