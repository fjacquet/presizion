# Style and Conventions

## TypeScript
- `strict: true` with `exactOptionalPropertyTypes`
- No `any` — ever
- **Interfaces** for object shapes; **type aliases** for unions/functions
- Optional props that may be passed as `undefined` need `| undefined` in the type

## React
- Function components only, one per file, max ~150 lines
- Hooks: `useSomething` naming, only at top level
- State: keep as local as possible; lift only when siblings need shared data
- Derive-on-read pattern: compute in hooks (`useScenariosResults`, `useVsanBreakdowns`), never store results in Zustand

## Zustand Stores (5 total)
- `useClusterStore` — current cluster data
- `useScenariosStore` — scenario list with CRUD
- `useWizardStore` — navigation + mode toggles
- `useThemeStore` — dark mode
- `useImportStore` — file import buffer + scope state

## Sizing Formulas
- ALL formulas in `src/lib/sizing/` — never inline in components
- vSAN constants as exact fractions (RAID-5 = `1 + 1/3`, not `1.33`)
- GiB internally for all storage, display converts to TiB > 1024
- Ratio display: always `N.N:1` format

## Import Parsers
- ALL parsers in `src/lib/utils/import/`
- Scope key format: `dc||cluster` or `dc||__standalone__`
- ESX host scope priority: hostToCluster (from VMs) first, then ESX Hosts cluster column
- Column aliases handle vendor variations

## Testing
- Vitest + React Testing Library
- Co-located `__tests__/` directories
- TDD for formulas (RED/GREEN/REFACTOR)
- `toBeCloseTo` for floating-point assertions
- `haReserveCount: 0 as const` for literal types
- Mock recharts with all used exports including `Cell`, `LabelList`

## Commit Style
- `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
- Phase-scoped: `feat(18-01):`, `test(26-02):`

## External URLs
- Centralized in `src/lib/config.ts`
- SPEC search: `fjacquet.github.io/spec-search`
- Store-Predict: `store.srv1023035.hstgr.cloud`
