# Code Style & Conventions

Source: `docs/constitution.md`

## TypeScript
- `strict: true`, `noImplicitAny`, `noUnusedLocals`, `noUnusedParameters`
- **No `any`** — use `unknown` + narrowing instead
- **Interfaces** for object shapes that may be extended (e.g. `OldCluster`, `Scenario`)
- **Type aliases** for unions and function signatures (e.g. `type LimitingResource = 'cpu' | 'ram' | 'disk'`)
- Explicit prop types on every component

## React
- **Function components only** — no class components
- One file = one main component
- Components ≤ ~150 lines; extract if larger
- Custom hooks named `useSomething`; hooks only at top level (never in conditions/loops)
- Keep state as local as possible; lift only when siblings need shared data
- No global state solution unless truly necessary

## Functional Style
- Pure functions: same input → same output, no side effects
- Immutable updates (spread, not mutation)
- Composition over inheritance

## Naming
- Components: PascalCase
- Hooks: camelCase prefixed with `use`
- Files: match component/hook name

## Commits
- `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`

## Key Structural Rule
All sizing formulas and constants MUST live in `src/lib/sizing/` — never inline in components.
