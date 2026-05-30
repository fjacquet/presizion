# Sub-project E — i18n Scaffold (en/fr/de/it) — Design

**Date:** 2026-05-30
**Status:** Scoped; to be planned LAST
**Parent:** `2026-05-30-presizion-simplification-design.md`

## Goal

Add internationalization with **i18next** + `react-i18next` +
`i18next-browser-languagedetector`, shipping **en / fr / de / it** (Swiss market),
mirroring vatlas's locale architecture. Externalize all user-facing strings, including
PPTX export strings.

## Why last

Strings churn through every other sub-project: A deletes fields/labels, B replaces UI
components (new markup, new labels), C re-labels charts. Externalizing strings before
those settle would translate text that then gets deleted. E runs once the string surface
is stable.

## Approach (mirror vatlas)

1. Deps: `i18next`, `react-i18next`, `i18next-browser-languagedetector`.
2. `src/i18n/index.ts` like vatlas: `resources` built from per-namespace JSON under
   `locales/<lang>/`, `SUPPORTED_LANGUAGES = ['en','fr','de','it']`, typed `NAMESPACES`,
   `initReactI18next` + `LanguageDetector`, `interpolation.escapeValue: false`.
3. Detection: `order: ['querystring','localStorage','navigator']`,
   `lookupQuerystring: 'lang'`, `lookupLocalStorage: 'presizion-lang'`,
   `caches: ['localStorage']`.
4. **Namespaces tailored to presizion** (not vatlas's): e.g. `common`, `wizard`,
   `step1`, `step2`, `step3`, `export`, `pptx`. One file per concern so a translator
   hands back one file at a time. `DEFAULT_NS = 'common'`.
5. Externalize strings component-by-component to `t('ns:key')`; extract the PPTX strings
   into `pptx.json` (coordinate with B's rebuilt export).
6. Add a language switcher (4 langs) in the wizard shell / header, persisting to
   `presizion-lang`.
7. Parity + smoke tests like vatlas (`keyParity.test.ts`, `localeSmoke.test.ts`): every
   namespace key exists in all 4 locales.

## Files touched

New `src/i18n/**` (index + `locales/{en,fr,de,it}/*.json` + parity tests), every
component with literal copy (wizard, step1–3, export, scenario card), the PPTX module,
the wizard header (language switcher), `package.json`.

## Open questions (resolve during E planning)

- **Fallback language:** vatlas uses `fr`. For presizion, `en` or `fr`? (Swiss B2B
  presales — lean `en` fallback, but confirm.)
- **Translation source:** machine-translate de/it then human-review, or human from the
  start? Affects timeline; quality matters for a customer-facing deck.
- **Number/locale formatting:** Swiss formats (thousands separators, GB/GiB) — use
  `Intl.NumberFormat` keyed to active `lng`? Decide formatting policy.
- **Namespace granularity:** confirm the step1/step2/step3 split vs a single `wizard`
  namespace once B's components are final.

## Testing / verification

- Key-parity test passes for all 4 locales (no missing/extra keys).
- Smoke: app renders in each language; switcher persists across reload.
- PPTX export renders localized strings.
- `npm run build` / `test` green.

## Out of scope

Sizing logic (A); tooling (D); visual restyle (B); charts (C). E only externalizes and
translates the stabilized string surface.
