# Requirements — v1.3 Scope, Persistence & Branding

*Defined: 2026-03-13*

## Branding (BRAND)

- **BRAND-01**: App displays a Presizion logo in the header (modern abstract, blue/slate palette)
- **BRAND-02**: App has a custom favicon.ico replacing the Vite default

## Theme (THEME)

- **THEME-01**: User can toggle between light and dark mode manually (Sun/Moon button in header)
- **THEME-02**: Manual theme choice persists across page reloads (stored in localStorage)
- **THEME-03**: Default falls back to OS preference when no manual override is stored

## Import Scope Filter (SCOPE)

- **SCOPE-01**: When imported file contains multiple distinct clusters or datacenters, app detects and surfaces them after parsing
- **SCOPE-02**: User can select which cluster(s)/datacenter(s) to include before Step 1 is populated (multi-select, defaults to all)
- **SCOPE-03**: After import, an active scope badge is shown in Step 1 header showing which cluster(s) are active
- **SCOPE-04**: User can change the scope filter at any time from Step 1 (re-aggregates data from the last import buffer)

## Persistence (PERS)

- **PERS-01**: App automatically restores the last-used cluster inputs and scenarios from localStorage on page load
- **PERS-02**: User can copy a shareable URL that encodes current cluster + scenarios as a base64 URL hash
- **PERS-03**: Opening a URL with a valid hash restores full session state (cluster + scenarios) on load

## Tech Debt (TD)

- **TD-04**: Step 2 RAM formula display shows utilization factor (× N%) when RAM utilization % is entered — mirrors TD-01 fix for CPU formula
  - **Bug**: `RamFormulaParams` interface in `src/lib/sizing/display.ts` is missing `ramUtilizationPercent` param; the calculation applies it but the display string ignores it
  - **Fix**: Add `ramUtilizationPercent?: number` to `RamFormulaParams`; update `ramFormulaString()` to conditionally include `× N%` factor; update `ScenarioResults.tsx` to pass the value from `currentCluster`
