# Sub-project E — i18n (en/fr/de/it) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Verify with `npm run build`, `npx vitest run`, and `npx biome check .`.

**Goal:** Internationalize Presizion with i18next + react-i18next + language detector, shipping **en / fr / de / it** (Swiss market), externalizing all user-facing strings (UI + PPTX export) and routing number/unit formatting through locale-aware `Intl.NumberFormat`.

**Architecture:** A single `src/i18n/` module builds `resources` from per-namespace JSON under `locales/<lang>/`. English is authoritative; fr/de/it are machine-translated and flagged for human review. Components consume strings via `useTranslation(ns)` → `t('key')`. Number formatting goes through one helper keyed to the active language. A 4-language switcher lives in the wizard header, persisting to `presizion-lang`. Key-parity + smoke tests guard every locale.

**Tech Stack:** `i18next`, `react-i18next`, `i18next-browser-languagedetector`; React 19 + TS strict; Vite 8; Vitest.

**Resolved decisions (from E planning):**
- **Fallback language:** `en` (source strings are authored in English).
- **Translations:** machine-translate fr/de/it now, each locale dir carries a `_meta.json` `{ "status": "machine-translated", "reviewed": false }` flag so a human review pass is trackable.
- **Number/unit formatting:** `Intl.NumberFormat` keyed to active `lng`, mapped to Swiss locales (`en-CH`/`fr-CH`/`de-CH`/`it-CH`).
- **Namespaces:** single `wizard` namespace (no step1/2/3 split). Final set: `common`, `wizard`, `export`, `pptx`. `DEFAULT_NS = 'common'`.
- **Branch:** `feat/presizion-E-i18n` off `main`.

---

## File Structure

**New:**
- `src/i18n/index.ts` — i18next init (resources, detection, fallback, namespaces).
- `src/i18n/config.ts` — `SUPPORTED_LANGUAGES`, `NAMESPACES`, `LOCALE_MAP`, `LANGUAGE_LABELS` constants (importable without side effects, so tests/format don't trigger init).
- `src/i18n/format.ts` — `formatNumber` / `formatInt` helpers keyed to `i18n.language`.
- `src/i18n/react-i18next.d.ts` — TS module augmentation (`CustomTypeOptions`).
- `src/i18n/locales/{en,fr,de,it}/{common,wizard,export,pptx}.json` — translation resources.
- `src/i18n/locales/{fr,de,it}/_meta.json` — machine-translation review flags.
- `src/components/wizard/LanguageSwitcher.tsx` — 4-language switcher.
- `src/i18n/__tests__/keyParity.test.ts` — every key exists in all 4 locales.
- `src/i18n/__tests__/localeSmoke.test.ts` — app renders per language; switcher persists.
- `src/i18n/__tests__/format.test.ts` — locale-aware number formatting.

**Modified:**
- `src/main.tsx` — `import './i18n'` before React mount; localize the boot toast.
- `src/components/wizard/WizardShell.tsx` — mount `<LanguageSwitcher />`; externalize copy + reset-dialog strings.
- Every component in `src/components/{wizard,step1,step2,step3}/` with literal copy.
- `src/lib/utils/export.ts`, `exportPptx.ts`, `pptx/builder.ts`, `pptx/theme.ts`, `clipboard.ts` — externalize export strings to `export`/`pptx` namespaces.
- `src/lib/sizing/display.ts` and any component rendering numbers — route through `src/i18n/format.ts`.
- `package.json` — add deps.

---

## Phase 1 — Scaffold

### Task 1: Install dependencies

- [ ] **Step 1: Install**

```bash
npm install i18next react-i18next i18next-browser-languagedetector
```

- [ ] **Step 2: Verify versions resolved**

Run: `node -e "for (const p of ['i18next','react-i18next','i18next-browser-languagedetector']) console.log(p, require(p+'/package.json').version)"`
Expected: three version lines, no errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(i18n): add i18next, react-i18next, language detector"
```

### Task 2: Config constants

**Files:** Create `src/i18n/config.ts`

- [ ] **Step 1: Write config (no side effects — safe to import anywhere)**

```ts
// src/i18n/config.ts
// Pure constants for the i18n layer. NO i18next import here, so tests and the
// number-format helper can import these without triggering init().

export const SUPPORTED_LANGUAGES = ['en', 'fr', 'de', 'it'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const NAMESPACES = ['common', 'wizard', 'export', 'pptx'] as const;
export type Namespace = (typeof NAMESPACES)[number];

export const DEFAULT_NS: Namespace = 'common';
export const FALLBACK_LNG: AppLanguage = 'en';

export const LANGUAGE_STORAGE_KEY = 'presizion-lang';

/** App language → BCP-47 locale for Intl formatting (Swiss market). */
export const LOCALE_MAP: Record<AppLanguage, string> = {
  en: 'en-CH',
  fr: 'fr-CH',
  de: 'de-CH',
  it: 'it-CH',
};

/** Native labels for the language switcher. */
export const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
};
```

- [ ] **Step 2: Commit** — `git add src/i18n/config.ts && git commit -m "feat(i18n): add config constants"`

### Task 3: Seed English locale files

**Files:** Create `src/i18n/locales/en/{common,wizard,export,pptx}.json`

- [ ] **Step 1: Create the four English namespace files with a starter key each** (real keys are added during extraction in Phase 4; these establish the shape so init + parity tests are green from the start).

`src/i18n/locales/en/common.json`:
```json
{
  "appName": "Presizion",
  "appTagline": "Size your refreshed cluster based on existing metrics"
}
```

`src/i18n/locales/en/wizard.json`:
```json
{
  "step1": { "title": "Step 1: Enter Current Cluster" },
  "step2": { "title": "Step 2: Define Target Scenarios" },
  "step3": { "title": "Step 3: Review & Export" }
}
```

`src/i18n/locales/en/export.json`:
```json
{
  "csv": { "downloaded": "CSV downloaded" }
}
```

`src/i18n/locales/en/pptx.json`:
```json
{
  "deckTitle": "Cluster Refresh Sizing"
}
```

- [ ] **Step 2: Commit** — `git add src/i18n/locales/en && git commit -m "feat(i18n): seed English namespace files"`

### Task 4: Machine-translate to fr/de/it

**Files:** Create `src/i18n/locales/{fr,de,it}/{common,wizard,export,pptx}.json` + `_meta.json`

- [ ] **Step 1:** For each of fr, de, it, copy the en JSON structure and machine-translate every string value (keys unchanged). Keep `common.appName` = `"Presizion"` (proper noun, untranslated) in all locales.

- [ ] **Step 2:** Add `src/i18n/locales/<lang>/_meta.json` for each of fr/de/it:
```json
{ "status": "machine-translated", "reviewed": false, "note": "Human review pending — see plan E." }
```

- [ ] **Step 3: Commit** — `git add src/i18n/locales && git commit -m "feat(i18n): machine-translated fr/de/it seed locales (review pending)"`

### Task 5: i18next init

**Files:** Create `src/i18n/index.ts`

- [ ] **Step 1: Write init (mirrors vatlas architecture; uses documented i18next API)**

```ts
// src/i18n/index.ts
import LanguageDetector from 'i18next-browser-languagedetector';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import {
  DEFAULT_NS,
  FALLBACK_LNG,
  LANGUAGE_STORAGE_KEY,
  NAMESPACES,
  SUPPORTED_LANGUAGES,
} from './config';

import enCommon from './locales/en/common.json';
import enWizard from './locales/en/wizard.json';
import enExport from './locales/en/export.json';
import enPptx from './locales/en/pptx.json';
import frCommon from './locales/fr/common.json';
import frWizard from './locales/fr/wizard.json';
import frExport from './locales/fr/export.json';
import frPptx from './locales/fr/pptx.json';
import deCommon from './locales/de/common.json';
import deWizard from './locales/de/wizard.json';
import deExport from './locales/de/export.json';
import dePptx from './locales/de/pptx.json';
import itCommon from './locales/it/common.json';
import itWizard from './locales/it/wizard.json';
import itExport from './locales/it/export.json';
import itPptx from './locales/it/pptx.json';

export const resources = {
  en: { common: enCommon, wizard: enWizard, export: enExport, pptx: enPptx },
  fr: { common: frCommon, wizard: frWizard, export: frExport, pptx: frPptx },
  de: { common: deCommon, wizard: deWizard, export: deExport, pptx: dePptx },
  it: { common: itCommon, wizard: itWizard, export: itExport, pptx: itPptx },
} as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: FALLBACK_LNG,
    supportedLngs: SUPPORTED_LANGUAGES,
    ns: NAMESPACES,
    defaultNS: DEFAULT_NS,
    detection: {
      order: ['querystring', 'localStorage', 'navigator'],
      lookupQuerystring: 'lang',
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false }, // React already escapes
  });

export default i18n;
```

- [ ] **Step 2: Write TS augmentation** — `src/i18n/react-i18next.d.ts`:

```ts
import 'react-i18next';
import type { resources } from './index';
import type { DEFAULT_NS } from './config';

declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof DEFAULT_NS;
    resources: (typeof resources)['en'];
  }
}
```

- [ ] **Step 3: Wire into main.tsx** — add as the FIRST import in `src/main.tsx:1` so i18n initializes before any component renders:

```ts
import './i18n';
```

- [ ] **Step 4: Verify build** — Run: `npx tsc -b` → Expected: "No errors found". Then `npm run dev`, load app — Expected: app renders unchanged (strings not yet externalized).

- [ ] **Step 5: Commit** — `git add src/i18n/index.ts src/i18n/react-i18next.d.ts src/main.tsx && git commit -m "feat(i18n): initialize i18next with detection + 4 locales"`

### Task 6: Key-parity test

**Files:** Create `src/i18n/__tests__/keyParity.test.ts`

- [ ] **Step 1: Write the test** (flattens nested keys; asserts fr/de/it match en exactly for every namespace)

```ts
import { describe, expect, it } from 'vitest';
import { NAMESPACES, SUPPORTED_LANGUAGES } from '../config';
import { resources } from '../index';

function flatKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === 'object' && !Array.isArray(v)
      ? flatKeys(v as Record<string, unknown>, key)
      : [key];
  });
}

describe('i18n key parity', () => {
  for (const ns of NAMESPACES) {
    const enKeys = flatKeys(resources.en[ns]).sort();
    for (const lng of SUPPORTED_LANGUAGES) {
      if (lng === 'en') continue;
      it(`${lng}/${ns} has the same keys as en/${ns}`, () => {
        const lngKeys = flatKeys(resources[lng][ns]).sort();
        expect(lngKeys).toEqual(enKeys);
      });
    }
  }
});
```

- [ ] **Step 2: Run** — `npx vitest run src/i18n/__tests__/keyParity.test.ts` → Expected: PASS (9 cases: 3 langs × ... but iterates ns×lng).

- [ ] **Step 3: Commit** — `git add src/i18n/__tests__/keyParity.test.ts && git commit -m "test(i18n): key-parity across all locales"`

### Task 7: Locale smoke test

**Files:** Create `src/i18n/__tests__/localeSmoke.test.ts`

- [ ] **Step 1: Write the test** — changing language updates `t()` output and persists to `localStorage`.

```ts
import { describe, expect, it, beforeEach } from 'vitest';
import i18n from '../index';
import { LANGUAGE_STORAGE_KEY, SUPPORTED_LANGUAGES } from '../config';

describe('locale smoke', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('all supported languages resolve common:appTagline to a non-empty string', async () => {
    for (const lng of SUPPORTED_LANGUAGES) {
      await i18n.changeLanguage(lng);
      const value = i18n.t('common:appTagline');
      expect(value).toBeTruthy();
      expect(value).not.toBe('common:appTagline'); // no missing-key fallthrough
    }
  });

  it('changeLanguage persists to localStorage', async () => {
    await i18n.changeLanguage('fr');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('fr');
  });
});
```

- [ ] **Step 2: Run** — `npx vitest run src/i18n/__tests__/localeSmoke.test.ts` → Expected: PASS. (If localStorage cache write needs the detector, ensure jsdom env — vitest config already uses jsdom for component tests.)

- [ ] **Step 3: Commit** — `git add src/i18n/__tests__/localeSmoke.test.ts && git commit -m "test(i18n): locale smoke + persistence"`

---

## Phase 2 — Locale-aware number formatting

### Task 8: format.ts helper

**Files:** Create `src/i18n/format.ts`, `src/i18n/__tests__/format.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, expect, it } from 'vitest';
import i18n from '../index';
import { formatInt, formatNumber } from '../format';

describe('locale number formatting', () => {
  it('formats thousands with Swiss separators for de', async () => {
    await i18n.changeLanguage('de');
    // de-CH groups with apostrophe: 12'345
    expect(formatInt(12345)).toBe("12'345");
  });

  it('respects fraction digits', async () => {
    await i18n.changeLanguage('en');
    expect(formatNumber(3.14159, { maximumFractionDigits: 2 })).toBe('3.14');
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run src/i18n/__tests__/format.test.ts` → Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
// src/i18n/format.ts
import i18n from './index';
import { type AppLanguage, FALLBACK_LNG, LOCALE_MAP } from './config';

function activeLocale(): string {
  const lng = (i18n.language?.split('-')[0] ?? FALLBACK_LNG) as AppLanguage;
  return LOCALE_MAP[lng] ?? LOCALE_MAP[FALLBACK_LNG];
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(activeLocale(), options).format(value);
}

export function formatInt(value: number): string {
  return formatNumber(value, { maximumFractionDigits: 0 });
}
```

- [ ] **Step 4: Run to verify it passes** — `npx vitest run src/i18n/__tests__/format.test.ts` → Expected: PASS. (If the apostrophe assertion fails because the Node ICU build differs, adjust the expected string to match `new Intl.NumberFormat('de-CH').format(12345)` evaluated in this runtime — keep the test asserting locale-specific grouping, not a hard-coded glyph.)

- [ ] **Step 5: Commit** — `git add src/i18n/format.ts src/i18n/__tests__/format.test.ts && git commit -m "feat(i18n): locale-aware number formatting"`

---

## Phase 3 — Language switcher

### Task 9: LanguageSwitcher component

**Files:** Create `src/components/wizard/LanguageSwitcher.tsx`; modify `src/components/wizard/WizardShell.tsx`

- [ ] **Step 1: Write the component** (mirrors `ThemeToggle` placement/styling; uses the existing `Button` + a simple menu; `react-i18next` triggers re-render on change)

```tsx
// src/components/wizard/LanguageSwitcher.tsx
import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { type AppLanguage, LANGUAGE_LABELS, SUPPORTED_LANGUAGES } from '@/i18n/config';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation('common');
  const current = (i18n.language?.split('-')[0] ?? 'en') as AppLanguage;

  function cycle() {
    const idx = SUPPORTED_LANGUAGES.indexOf(current);
    const next = SUPPORTED_LANGUAGES[(idx + 1) % SUPPORTED_LANGUAGES.length];
    void i18n.changeLanguage(next);
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycle}
      aria-label={t('language.switch', { lang: LANGUAGE_LABELS[current] })}
      title={LANGUAGE_LABELS[current]}
    >
      <Languages className="h-4 w-4" />
    </Button>
  );
}
```

Add to `src/i18n/locales/en/common.json` (and machine-translate into fr/de/it, then re-run parity):
```json
"language": { "switch": "Language: {{lang}}. Click to switch." }
```

- [ ] **Step 2: Mount in WizardShell** — import `LanguageSwitcher` and render it next to `<ThemeToggle />` in the header.

- [ ] **Step 3: Verify in app** — `npm run dev`, click switcher → cycles en→fr→de→it→en; reload → language persists (localStorage `presizion-lang`).

- [ ] **Step 4: Run parity test** — `npx vitest run src/i18n/__tests__/keyParity.test.ts` → Expected: PASS.

- [ ] **Step 5: Commit** — `git add src/components/wizard/LanguageSwitcher.tsx src/components/wizard/WizardShell.tsx src/i18n/locales && git commit -m "feat(i18n): add 4-language switcher to wizard header"`

---

## Phase 4 — String extraction (UI)

**Procedure (apply to every file below — this is the repeatable pattern):**

1. Read the component; list every user-facing literal (visible text, `aria-label`, `title`, `placeholder`, toast messages, dialog copy). Skip non-UI strings (CSS classes, data keys, store keys, test ids).
2. Add a key per string under the `wizard` namespace in `src/i18n/locales/en/wizard.json` (nested by component, e.g. `wizard.currentClusterForm.totalVcpus`). Interpolate variables with `{{var}}`; use the i18next `count` plural form for pluralized counts.
3. In the component: `const { t } = useTranslation('wizard');` then replace each literal with `t('currentClusterForm.totalVcpus')`. Numbers that render to the user go through `formatInt`/`formatNumber` from `@/i18n/format`.
4. Mirror the new keys into fr/de/it (machine-translate the values).
5. Run `npx vitest run src/i18n/__tests__/keyParity.test.ts` (must pass) + any component test touching that file.
6. Commit per file or per small group: `git commit -m "i18n(wizard): externalize <Component> strings"`.

### Worked example — Task 10: ThemeToggle

**Files:** `src/components/wizard/ThemeToggle.tsx`; `src/i18n/locales/*/wizard.json`

- [ ] **Step 1:** Add to `en/wizard.json`:
```json
"theme": {
  "light": "Light",
  "dark": "Dark",
  "system": "System",
  "switch": "Theme: {{label}}. Click to switch.",
  "current": "Theme: {{label}}"
}
```
- [ ] **Step 2:** Edit `ThemeToggle.tsx` — replace the `LABELS` record with `t('theme.light'|'theme.dark'|'theme.system')` lookups and the `aria-label`/`title` with `t('theme.switch', { label })` / `t('theme.current', { label })`. Add `const { t } = useTranslation('wizard');`.
- [ ] **Step 3:** Mirror `theme.*` into fr/de/it.
- [ ] **Step 4:** Run `npx vitest run src/i18n/__tests__/keyParity.test.ts` → PASS.
- [ ] **Step 5:** Commit — `git commit -m "i18n(wizard): externalize ThemeToggle strings"`.

### Remaining UI extraction tasks (apply the Procedure to each)

- [ ] **Task 11 — wizard:** `WizardShell.tsx` (header copy, reset dialog: title/body/confirm/cancel, the storage-trim toast in `main.tsx`), `SizingModeToggle.tsx` (vCPU/Performance/HCI/Disaggregated labels + the Performance tooltip), `StepIndicator.tsx` (step names: Current Cluster / Define Scenarios / Review & Export).
- [ ] **Task 12 — step1:** `Step1CurrentCluster.tsx`, `CurrentClusterForm.tsx` (all field labels, section headers, info-tooltips, the "Most environments run well below 100%…" helper, validation text), `DerivedMetricsPanel.tsx` (metric labels + footnote), `FileImportButton.tsx`, `ImportPreviewModal.tsx` (modal copy, column headers, buttons), `ScopeBadge.tsx`.
- [ ] **Task 13 — step2:** `Step2Scenarios.tsx`, `ScenarioCard.tsx` (every field label, Advanced disclosure, HA reserve, min-server, growth/safety), `ScenarioResults.tsx`, `VsanSection.tsx`.
- [ ] **Task 14 — step3:** `Step3ReviewExport.tsx` (export buttons, section titles), `ComparisonTable.tsx`, `ClusterTotalRows.tsx`, `NodeSizingRows.tsx`, `UtilizationRows.tsx`, `UtilizationCell.tsx`, chart components (`SizingChart`, `CoreCountChart`, `CapacityStackedChart`, `MinNodesChart`) — axis/legend/series labels and titles. Numeric tick/label formatting via `@/i18n/format`.

Each task: follow the 6-step Procedure, parity test green before commit.

---

## Phase 5 — Export / PPTX strings

### Task 15: export + pptx namespaces

**Files:** `src/lib/utils/export.ts`, `exportPptx.ts`, `pptx/builder.ts`, `pptx/theme.ts`, `clipboard.ts`; `src/i18n/locales/*/{export,pptx}.json`

- [ ] **Step 1:** These are non-React modules. Import the i18n singleton and call `t` off it: `import i18n from '@/i18n';` then `i18n.t('export:csv.downloaded')` / `i18n.t('pptx:deckTitle')`. (The active language is already set globally by the switcher.)
- [ ] **Step 2:** Externalize CSV headers, JSON export labels, clipboard toast text → `export` namespace; PPTX slide titles, section headings, table headers, footer/disclaimer → `pptx` namespace.
- [ ] **Step 3:** Mirror keys into fr/de/it; route any numbers in exports through `@/i18n/format` so the deck matches the UI locale.
- [ ] **Step 4:** Run `npx vitest run` (full suite — export tests must still pass; update any test asserting a hard-coded English export string to call `i18n.t(...)` or set language to `en` first).
- [ ] **Step 5:** Commit — `git commit -m "i18n(export): externalize CSV/JSON/PPTX strings"`.

---

## Verification (Definition of Done)

- [ ] `npx vitest run` — all green (incl. keyParity, localeSmoke, format, and existing suites).
- [ ] `npx tsc -b` — no errors (typed `t` keys via `CustomTypeOptions`).
- [ ] `npx biome check .` — clean.
- [ ] `npm run build` — succeeds; locale JSON bundled.
- [ ] Manual: app renders in en/fr/de/it; switcher persists across reload; `?lang=fr` query param forces French; numbers show Swiss grouping; PPTX export renders localized strings + localized numbers.
- [ ] No user-facing literal left in `src/components/**` or the export modules (spot-check via grep for common English words in JSX text).
- [ ] fr/de/it `_meta.json` flags present (`reviewed: false`) so the human-review pass is tracked.

## Out of scope

Sizing logic (A), tooling (D), visual restyle (B), charts migration (C). Human translation review is a tracked follow-up, not part of this plan.

## Self-review notes

- **Spec coverage:** deps (T1) ✓; `src/i18n` init + detection/fallback (T2,T5) ✓; namespaces tailored to presizion = single `wizard` per decision (T2) ✓; switcher persisting to `presizion-lang` (T9) ✓; PPTX strings (T15) ✓; parity + smoke tests (T6,T7) ✓; number formatting decision (T8) ✓; machine-translate + review flag decision (T4) ✓.
- **Type consistency:** `formatInt`/`formatNumber` defined in T8 and referenced in T14/T15; `AppLanguage`/`SUPPORTED_LANGUAGES`/`LANGUAGE_LABELS`/`LOCALE_MAP` defined in T2 and used in T8/T9; `resources`/`DEFAULT_NS` from T5/T2 used in T5 augmentation and T6 test. Consistent.
