# Sub-project D — Biome Migration Implementation Plan

> **For agentic workers:** execute task-by-task; verify with `npm run build`, `npm run test`, and `biome check .` (no ESLint after this).

**Goal:** Replace ESLint with Biome for lint + format, matching vatlas's tooling, without changing runtime behavior.

**Resolved decisions:**
- **Formatter:** vatlas's `biome.json` but `semicolons: "always"` + `quoteStyle: "single"` (keep presizion's look — "Biome linter, keep semicolons"). Only ~20 files reformat.
- **Lint rules:** vatlas's `recommended` + overrides. `noNonNullAssertion` = warn (163, non-blocking). Resolve the ~36 errors via safe auto-fix + `biome-ignore` for intentional cases.
- **CI:** `deploy.yml` runs only `npm run build` (no lint gate exists) — no CI change needed.
- **Branch:** stacked on `feat/simplify-sizing-model` (A unmerged) as `chore/biome-migration`.

**Tech Stack:** Biome 2.4.16, presizion (React 19 + TS strict).

---

### Task 1: Tooling swap (config + scripts + deps)

- [ ] Add `biome.json` (already written: vatlas config, `semicolons: always`).
- [ ] `package.json` scripts: `"lint": "biome check ."`, `"lint:fix": "biome check --write ."`, `"format": "biome format --write ."`.
- [ ] Remove devDeps: `@eslint/js`, `eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `typescript-eslint`. Add `@biomejs/biome@^2.4.16`.
- [ ] Delete `eslint.config.js`.
- [ ] `npm install`.
- [ ] Verify `npx biome --version` and `npm run lint` runs.
- [ ] Commit: `chore(lint): replace ESLint with Biome`.

### Task 2: Reformat (one mechanical commit)

- [ ] `biome check --write .` (formats ~20 files + applies SAFE auto-fixes: organizeImports, useImportType, useLiteralKeys, useTemplate, etc.).
- [ ] `npm run build` + `npm run test` green (format/import changes must not alter behavior).
- [ ] Commit: `style: apply Biome formatting + safe autofixes`.

### Task 3: Resolve remaining lint errors

- [ ] Run `biome check .`; for each remaining ERROR:
  - Intentional (`react-hooks` exhaustive-deps in ScenarioCard, `noExplicitAny` zodResolver casts, unused-var destructure-to-omit, set-state-in-effect in useSpecLookup, array-index keys in throwaway lists) → add `// biome-ignore lint/<rule>: <reason>` (replacing the old `eslint-disable` comments).
  - Genuine → fix (e.g. `useIterableCallbackReturn`: add explicit `return`; `noGlobalIsNan`: `Number.isNaN`; `useNodejsImportProtocol`: `node:` prefix).
- [ ] Leave `noNonNullAssertion` warnings (matches vatlas; non-blocking).
- [ ] `biome check .` → 0 errors (warnings allowed). `npm run build` + `npm run test` green.
- [ ] Commit: `fix(lint): resolve Biome errors + migrate eslint-disable to biome-ignore`.

### Task 4: Verify + docs

- [ ] Update `CLAUDE.md` Tech Stack / commands: ESLint → Biome; `npm run lint` now runs Biome.
- [ ] Final: `npm run build`, `npm run test`, `biome check .` all green.
- [ ] Commit: `docs: note Biome in CLAUDE.md`.

## Out of scope
Visual restyle (B), ECharts (C), i18n (E), adding a CI lint/test gate.
