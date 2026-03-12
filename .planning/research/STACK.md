# Stack Research

**Domain:** Client-side-only static web app — infrastructure sizing calculator
**Researched:** 2026-03-12
**Confidence:** HIGH (all versions verified against npm registry and official sources)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| React | ^19.2.4 | UI rendering and component model | Current stable; React 19 adds native `use()` hook, improved actions, and better concurrent rendering. No server features needed — purely for component composition and reactivity. |
| TypeScript | ^5.9.3 | Static typing | Current stable. Strict mode required: the sizing formulas are safety-critical, and TypeScript strict mode catches the class of bugs (null coercions, implicit `any`) that silently break calculations. |
| Vite | ^7.3.1 | Build tooling and dev server | The de-facto standard replacing CRA. Builds pure static assets with no Node.js runtime in output. `base` path config makes GitHub Pages deployment trivial. Requires Node.js 20.19+ or 22.12+. |
| @vitejs/plugin-react | ^5.1.4 | Vite–React integration | Official Vite plugin. v5+ uses Oxc for React Refresh transform — Babel no longer required, cutting dev startup further. |

### Form and Validation

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| react-hook-form | ^7.71.2 | Form state management | Zero-dependency, uncontrolled inputs with ref-based API. Re-renders only the changed field — critical for a form-heavy app where every keystroke triggers recalculation. Deeply integrated with shadcn/ui `<Form>` primitive. |
| zod | ^4.x | Schema validation and type inference | Zod v4 is 14x faster than v3 with a 57% smaller core. `z.infer<typeof schema>` pattern eliminates double-declaring types. Use `@zod/mini` for tree-shaken frontend builds. |
| @hookform/resolvers | ^3.x | Bridges react-hook-form and Zod | Thin adapter, no logic of its own. Needed to connect Zod schemas to RHF's validation pipeline. |

### UI Components and Styling

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| shadcn/ui (CLI) | ^4.0.5 | Accessible component collection | Copy-owns components (not a node_modules dependency). Full TypeScript, full Radix UI accessibility primitives, Tailwind CSS v4 support, and built-in `<Form>` + `<Input>` primitives that compose with react-hook-form. CLI v4 supports Vite projects natively via `npx shadcn init`. |
| Tailwind CSS | ^4.2.1 | Utility-first styling | v4 moves to CSS-first config (`@import "tailwindcss"`) — no `tailwind.config.js`. Up to 100x faster incremental builds. CSS variables for theming are first-class. Best pairing for shadcn/ui v4. |
| Radix UI (via shadcn) | bundled | Accessible primitives | Pulled in automatically by shadcn components. Dialog, Tooltip, Select, etc. — all ARIA-compliant. Do not install separately. |

### State Management

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| Zustand | ^5.0.11 | Global app state | ~3KB, zero boilerplate, no provider wrap required. Perfect scope for this app: form inputs, scenario list, and computed outputs are global but simple. v5 uses React 18+ `useSyncExternalStore` for predictable rendering. React Context is not used because it triggers full subtree re-renders — unacceptable at <200ms recalculation budget. |

### Data Export

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| papaparse | ^5.5.3 | CSV serialization | `Papa.unparse()` converts JS arrays/objects to RFC 4180 CSV in the browser with no backend. Zero dependencies. TypeScript types via `@types/papaparse`. Widely adopted (2500+ dependents). |
| @types/papaparse | ^5.x | TypeScript types for papaparse | Papaparse ships no built-in types; this package provides them. |

### Charting (optional, deferred)

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| recharts | ^2.x | Bar/comparison charts | React-native SVG charts. Component-based API matches React mental model. Suitable for side-by-side scenario bars if visualization is added in a later phase. Do not install until actually needed — deferred to v1.1. |

### Development Tools

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| Vitest | ^4.0.18 | Unit testing | Reuses Vite config — no separate babel/jest config. Jest-compatible API so React Testing Library works unchanged. Required for formula correctness tests (`src/lib/sizing/`). |
| @testing-library/react | ^16.x | Component testing | Works with Vitest via `jsdom`. Preferred over Enzyme — tests behavior, not implementation. |
| @testing-library/user-event | ^14.x | Simulates user interactions | More realistic than `fireEvent`. Required for form validation tests. |
| ESLint | ^9.x | Linting | v9 flat config (`eslint.config.js`). Pair with `@typescript-eslint/eslint-plugin` and `eslint-plugin-react-hooks`. |
| Prettier | ^3.x | Code formatting | Zero-config formatter. Use `prettier-plugin-tailwindcss` to auto-sort Tailwind classes (prevents class order drift in shadcn components). |
| gh-pages | ^6.x | GitHub Pages deploy helper | Publishes the `dist/` folder to the `gh-pages` branch. Used in CI or as an npm script. Alternative: GitHub Actions with `actions/deploy-pages`. |

## Installation

```bash
# Scaffold the project (if starting from scratch)
npm create vite@latest cluster-sizer -- --template react-ts
cd cluster-sizer

# Core runtime dependencies
npm install react@^19.2.4 react-dom@^19.2.4
npm install react-hook-form@^7.71.2 zod@^4 @hookform/resolvers@^3
npm install zustand@^5.0.11
npm install papaparse@^5.5.3
npm install @types/papaparse@^5

# Tailwind CSS v4
npm install tailwindcss@^4.2.1

# shadcn/ui — use the CLI, do NOT install as a package
npx shadcn@latest init
# Select: Vite, TypeScript, Tailwind v4
# Then add components as needed:
npx shadcn@latest add form input label card button tooltip

# Dev dependencies
npm install -D typescript@^5.9.3
npm install -D vitest@^4 @testing-library/react@^16 @testing-library/user-event@^14 jsdom
npm install -D eslint@^9 @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-react-hooks
npm install -D prettier@^3 prettier-plugin-tailwindcss
npm install -D gh-pages@^6
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Zustand | React Context + useReducer | Use Context if state is truly local to a subtree and re-render scope is controlled. For this app, scenario data is accessed across many subtrees — Context would cause unnecessary re-renders. |
| Zustand | Jotai | Jotai's atomic model suits editors with many independent pieces of state. Our state is one cohesive "sizing session" — Zustand's store model is cleaner. |
| Vite | Next.js | Use Next.js if you need SSR, API routes, or ISR. This app is explicitly client-side-only; Next.js adds server runtime complexity and complicates GitHub Pages deployment. |
| shadcn/ui | Mantine / Chakra UI | Mantine and Chakra are full library installs — you own none of the component code and must work within their theming systems. shadcn gives you full code ownership, which is correct for a presales tool where subtle UI tweaks are expected. |
| Zod v4 | Yup | Yup has no TypeScript-first type inference. Zod v4's `z.infer<>` pattern integrates cleanly with react-hook-form and the app's own data model types. |
| papaparse | native CSV string building | Manual CSV building breaks on values containing commas or newlines. papaparse handles RFC 4180 quoting correctly with no effort. |
| recharts | Chart.js | Chart.js is imperative (canvas refs, not components). Recharts is idiomatic React. For this app's simple bar comparisons, Recharts is the better fit. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Create React App (CRA) | Unmaintained since 2023. Slow webpack build, no ESM output, missing modern TS defaults. | Vite |
| Redux Toolkit | 3–5x boilerplate vs. Zustand for a single-session, no-server app. RTK Query is pointless without a server. | Zustand |
| Formik | Controlled components re-render the entire form on every keystroke. react-hook-form uses refs and is significantly faster for real-time recalculation. | react-hook-form |
| Moment.js | Not relevant here — no dates. If date formatting is ever added, use `date-fns` (tree-shakable) instead. | date-fns (if needed) |
| Enzyme | Deprecated; not compatible with React 19. | @testing-library/react |
| Sass/SCSS | Tailwind CSS v4 covers all layout and utility needs without a preprocessor. Adding Sass creates two styling systems. | Tailwind CSS v4 |
| localStorage (v1) | PROJECT.md explicitly defers this — don't add it in Phase 1. Adds state hydration complexity. | Deferred to v1.1 |

## Stack Patterns by Variant

**For formula-heavy pure logic (the sizing engine):**
- Keep in `src/lib/sizing/` as pure TypeScript functions (no React imports)
- Export each formula as a named function with explicit typed parameters
- Test exhaustively with Vitest; these are the correctness-critical units
- Because they are pure functions, testing is straightforward: input → expected output

**For form state feeding the sizing engine:**
- Zustand store holds the raw inputs and computed outputs
- react-hook-form controls the form DOM and validation
- On `handleSubmit` / `onChange`, write validated values to Zustand
- Sizing functions subscribe to Zustand and recompute; they do not subscribe to RHF directly

**For CSV export:**
- Pull current state from Zustand
- Pass inputs + outputs object to `Papa.unparse()`
- Trigger browser download via `URL.createObjectURL(new Blob(...))`
- No library other than papaparse is needed for this pattern

**For GitHub Pages deployment:**
- Set `base: '/cluster-sizer/'` in `vite.config.ts` (repo name as base)
- Use `gh-pages` npm script or GitHub Actions workflow with `actions/deploy-pages@v4`
- The `dist/` folder is the only artifact needed

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| react@^19.2.4 | @vitejs/plugin-react@^5.1.4 | v5 plugin required for React 19 JSX transform |
| react@^19.2.4 | @testing-library/react@^16 | RTL v16 required for React 19 compatibility |
| tailwindcss@^4.2.1 | shadcn@^4.0.5 | shadcn v4 supports Tailwind v4 natively; v3 shadcn does NOT |
| vite@^7.x | Node.js 20.19+ or 22.12+ | Vite 7 dropped Node 18 (EOL April 2025) |
| zod@^4 | @hookform/resolvers@^3 | resolvers v3 supports Zod v4 schema signature |
| vitest@^4 | vite@^7 | Keep Vitest and Vite major versions in sync |

## Sources

- npm registry — react 19.2.4, vite 7.3.1, @vitejs/plugin-react 5.1.4, vitest 4.0.18, zustand 5.0.11, papaparse 5.5.3, tailwindcss 4.2.1, shadcn 4.0.5, react-hook-form 7.71.2, typescript 5.9.3 (verified March 2026)
- https://vite.dev/guide/static-deploy — GitHub Pages base path configuration (HIGH confidence)
- https://ui.shadcn.com/docs/tailwind-v4 — shadcn Tailwind v4 support status (HIGH confidence)
- https://ui.shadcn.com/docs/changelog/2026-03-cli-v4 — shadcn CLI v4 Vite template support (HIGH confidence)
- https://zod.dev/v4 — Zod v4 release notes, perf benchmarks, migration guide (HIGH confidence)
- https://react-hook-form.com/ — controlled vs. uncontrolled input performance rationale (HIGH confidence)
- https://zustand.docs.pmnd.rs/ — Zustand v5 useSyncExternalStore notes (HIGH confidence)
- https://www.papaparse.com/docs — unparse() API for CSV export without backend (HIGH confidence)
- WebSearch — recharts vs Chart.js for React TypeScript (MEDIUM confidence, corroborated by multiple sources)
- WebSearch — Zustand vs Jotai vs Context 2025 (MEDIUM confidence, corroborated by multiple sources)

---
*Stack research for: Cluster Refresh Sizing Tool — client-side static web app*
*Researched: 2026-03-12*
