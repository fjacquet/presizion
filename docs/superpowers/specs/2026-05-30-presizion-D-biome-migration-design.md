# Sub-project D — Biome Migration — Design

**Date:** 2026-05-30
**Status:** Scoped (decisions locked); to be planned after sub-project A
**Parent:** `2026-05-30-presizion-simplification-design.md`

## Goal

Replace ESLint with **Biome** so presizion shares vatlas's lint/format tooling and a
single, fast, deterministic code-style source of truth.

## Why early in the sequence

Biome reformats the whole tree in one commit. Running it early means every later
sub-project (B charts/UI, C, E) is authored in Biome's style from the start, avoiding
repeated reformat churn. It runs **after A** only so A's large field/formula deletions
don't collide with a repo-wide reformat diff.

## Current state

- `package.json`: `"lint": "eslint ."`; deps `eslint@^10`, `@eslint/js`,
  `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`.
- No Prettier in presizion.

## Approach

1. Add `biome.json` mirroring vatlas's config (the proven baseline):
   - formatter: 2-space indent, line width **100**, single quotes, semicolons `asNeeded`.
   - linter: `recommended` + `noUnusedImports`/`noUnusedVariables` error, `useConst`
     error, `noNonNullAssertion` warn, `noConsole` error (allow warn/error).
   - test-file + `scripts/**` overrides (relax `noConsole`, `noUnusedImports` → warn).
   - `css.parser.tailwindDirectives: true` so `@theme`/`@custom-variant` parse cleanly
     (needed once B lands the Tailwind theme).
   - `assist.organizeImports: on`, `vcs.useIgnoreFile: true`.
2. Add dev dep `@biomejs/biome` (match vatlas `^2.4.15`); remove all ESLint deps.
3. Update scripts: `"lint": "biome check ."`, `"lint:fix": "biome check --write ."`,
   `"format": "biome format --write ."`.
4. Delete `eslint.config.*` / `.eslintrc*`.
5. Run `biome check --write .` once → single "style: adopt Biome" reformat commit,
   separate from logic commits.
6. Update CI workflow(s) to call `biome check`.
7. Update `CLAUDE.md`: the `rtk lint` RTK passthrough already covers Biome; adjust any
   ESLint-specific wording.

## Files touched

`package.json`, `package-lock.json`, new `biome.json`, deleted ESLint config, CI YAML
under `.github/`, `CLAUDE.md`, plus the mechanical reformat across `src/**`.

## Open questions (resolve during D planning)

- **Line width:** adopt vatlas's 100 verbatim, or keep presizion's current effective
  width to shrink the reformat diff? (Lean: adopt 100 for parity.)
- **Inline-disable migration:** existing `// eslint-disable-*` comments (e.g. the
  intentional ones in `ScenarioCard.tsx`) must be translated to `// biome-ignore`
  with reason strings. Enumerate and convert.
- **Rule strictness gaps:** confirm no presizion-only ESLint rule is silently lost
  (diff the recommended sets before deleting ESLint).

## Testing / verification

- `npm run lint` (Biome) passes clean post-reformat.
- `npm run build` + `npm run test` unchanged green.
- No behavior change — this is tooling only.

## Out of scope

Any code-behavior change; theme/UI (B); charts (C); i18n (E).
