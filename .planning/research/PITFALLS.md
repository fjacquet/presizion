# Pitfalls Research

**Domain:** Infrastructure sizing / capacity planning web application (React + TypeScript, client-side only)
**Researched:** 2026-03-12
**Confidence:** HIGH (formula/numeric pitfalls), MEDIUM (UX/export pitfalls)

---

## Critical Pitfalls

### Pitfall 1: Floating-Point Drift in Intermediate Sizing Calculations

**What goes wrong:**
JavaScript uses IEEE 754 double-precision floating point. Operations like `0.1 + 0.2` do not equal `0.3` — they equal `0.30000000000000004`. In a sizing tool, intermediate ratios (vCPU:pCore, utilization percentages, headroom factors) that are chained through several multiplications and divisions accumulate these errors silently. The final `Math.ceil()` server count can shift by ±1 because an intermediate result like `11.9999999999` gets treated as 12 rather than triggering the ceiling of 12 that the real number `12.0000...1` would produce.

**Why it happens:**
Developers treat JavaScript numbers as reliable decimal arithmetic. The IEEE 754 binary representation cannot exactly store many common decimal fractions. Each arithmetic step introduces a tiny error; when the final result sits right at an integer boundary (e.g., 12.0 exactly), accumulated drift pushes it just below or just above, and `Math.ceil` produces the wrong integer.

**How to avoid:**
Centralize all sizing formulas in `src/lib/sizing/` (per the project constitution). Inside these functions, carry all intermediate values to full precision, then apply a single rounding gate only at the final output stage. For display, use `Number.toFixed(2)` or similar, but never round intermediate values. For equality checks between formula outputs and reference values, use a tolerance band (e.g., `Math.abs(a - b) < 0.001`) rather than strict equality. Add a unit test fixture with at least three known input/output pairs verified against the reference spreadsheet.

**Warning signs:**

- Formula outputs differ from the reference spreadsheet by exactly 1 server on boundary-condition inputs.
- Tests pass for round numbers (4, 8, 16) but fail for fractional inputs (3.7 servers needed).
- Different browsers return marginally different final numbers.

**Phase to address:**
Formula/calculation engine phase (Phase 1 or foundation). Must be caught before any UI is built on top of the math.

---

### Pitfall 2: Hyperthreading Double-Counting in Physical Core Inputs

**What goes wrong:**
Users and the tool itself confuse logical processors (threads, vCPUs reported by the OS) with physical cores. If a user enters the server's logical thread count as "pCores", the vCPU:pCore ratio is halved and the server count calculation is dramatically understated — often by 2x. This is the most common error in vSphere cluster sizing. VMware's DRS uses physical cores, not hyperthreaded logical CPUs, for overcommit ratio enforcement.

**Why it happens:**
Operating system tools (`nproc`, Task Manager, vSphere host summary) all report logical CPU count by default. A server with 2 sockets × 16 cores × 2 threads reports as 64 logical CPUs. Presales engineers who copy this number directly into the tool will silently double the apparent physical core count.

**How to avoid:**
Label the input field explicitly as "Physical cores per server (NOT hyperthreaded logical CPUs)". Add inline help text: "If your server shows 64 logical CPUs with HT enabled, enter 32." Apply a defensive validation rule: if pCores > (sockets × 32), warn the user they may have entered logical threads instead of physical cores. In the formula-transparency panel, show the calculation `vCPU:pCore = total_vCPUs / total_pCores` and annotate which input was used.

**Warning signs:**

- A user inputs a pCore value that is exactly double a plausible core count (e.g., 48 "cores" on a 2-socket system — likely 24 physical + HT).
- Output server count seems suspiciously low compared to current environment size.
- The vCPU:pCore ratio output is less than 1:1 (impossible in any real cluster).

**Phase to address:**
Input form and validation phase. Input labels and help text must be defined before formula acceptance testing.

---

### Pitfall 3: The NaN Cascade from Empty Numeric Inputs

**What goes wrong:**
`<input type="number">` always returns a string from its `event.target.value`. When the field is empty, it returns `""`. `parseFloat("") === NaN`. If any formula receives `NaN` as a parameter, every downstream calculation also becomes `NaN`. The UI then displays `NaN` or `Infinity` in output fields and the export file contains corrupted data — without throwing any JavaScript error.

**Why it happens:**
This is a long-standing React issue (tracked since React issue #7779 and #1869 in Formik). Developers assume `type="number"` inputs yield numbers in event handlers. TypeScript's `valueAsNumber` property also returns `NaN` for empty or invalid entries, not `undefined`. Zod's `z.coerce.number()` silently converts empty strings to `0`, which produces wrong results for required non-zero fields.

**How to avoid:**
Store numeric input fields as `string | number` in React state during editing — only parse to number at the point of calculation. Write a dedicated `parseNumericInput(raw: string): number | null` helper that handles empty string, "0", negative input, and non-numeric characters explicitly. Use `z.preprocess` with explicit empty-string-to-undefined conversion before `z.number()`. Never pass a raw form value directly into a sizing formula function — always go through the parse helper first.

**Warning signs:**

- Any output field shows `NaN`, `Infinity`, or `undefined` when any input is cleared.
- Deleting a digit mid-edit (e.g., "12" → "1" → "") triggers visible corruption in the results panel.
- The export file contains `null` or `NaN` values for fields the user had previously filled.

**Phase to address:**
Input form phase, before wiring form state to calculation engine. Establish the parse helper in the same PR as the first numeric input field.

---

### Pitfall 4: HA Headroom Omission — Sizing for 100% Capacity, Not N-1

**What goes wrong:**
The sizing formula calculates how many servers are needed to host all current VMs, but does not account for a host failure. A cluster sized for exactly 8 servers at 90% utilization has zero capacity to absorb a failure. During the sales cycle, a customer buys the tool's recommendation — then discovers they need to add one or two additional hosts at deployment time. This erodes trust in the tool's accuracy and in the presales engineer who used it.

**Why it happens:**
The formula is conceptually simpler without the HA factor. Developers add the headroom percentage but forget that headroom serves two purposes: performance buffer AND fault tolerance. The two are conflated into a single "headroom %" input, and users do not realize that a 20% headroom alone does not guarantee N-1 survivability if the largest host holds the most VMs.

**How to avoid:**
Treat HA headroom as a separate, explicit input with a distinct default (1 host failure reserved). Compute `required_raw = Math.ceil(workload / per_host_capacity)`, then compute `required_with_ha = required_raw + ha_reserve_hosts`. Display both numbers in the results panel so the user can see the contribution of HA separately from the utilization headroom. Default `ha_reserve_hosts` to 1 and document why. In the formula transparency panel, show "N+1 HA reserve: +1 host".

**Warning signs:**

- Output server count in a scenario with 20% headroom equals exactly the mathematically minimum number — there is no HA buffer.
- Users can set headroom to 0% without a warning.
- The formula never references a fault-tolerance variable.

**Phase to address:**
Formula/calculation engine phase, simultaneously with initial formula implementation. HA reserve must be a first-class formula parameter, not an afterthought.

---

### Pitfall 5: Uncontrolled-to-Controlled Input Flip Causing Silent State Loss

**What goes wrong:**
React warns: "A component is changing an uncontrolled input to be controlled." This happens when an input's `value` prop starts as `undefined` (uncontrolled) and later receives a defined string or number (controlled). React does not recover gracefully — subsequent user edits may be silently ignored or reset to stale values. In a multi-scenario tool where scenarios can be added/duplicated dynamically, this is likely to occur if new scenario objects are initialized without all fields explicitly set to `""` or `0`.

**Why it happens:**
TypeScript optional object properties (`field?: number`) initialize to `undefined`. Developers spread or copy partial scenario objects when duplicating a scenario. The optional field is `undefined` in the copy, causing the bound input to be uncontrolled until the user edits it.

**How to avoid:**
Define a `createEmptyScenario()` factory function that returns a complete object with every field initialized to an explicit default (`""` for string inputs, `0` for number display, etc.). Use this factory everywhere a new scenario is created (initial state, duplication). Add a TypeScript `Required<ScenarioInput>` constraint on the factory return type so incomplete initialization fails at compile time.

**Warning signs:**

- React console warning "changing uncontrolled input to controlled" appears during testing.
- Duplicating a scenario and editing the copy causes the original to update (or vice versa).
- A field in a newly created scenario does not accept user input on the first keystroke.

**Phase to address:**
Input form phase, in the same sprint as the scenario duplication feature.

---

### Pitfall 6: Multi-Step Wizard Step Navigation Losing Cross-Step Validation Context

**What goes wrong:**
In a multi-step wizard, validation runs per-step. Step 1 accepts "Current Environment" data. Step 2 accepts "Target Scenario" configurations. If the user goes back to Step 1 and changes a value, the scenario fields in Step 2 that were valid with the old data may now be logically invalid (e.g., a RAM headroom of 110% that made sense with 512 GB is absurd with 128 GB). The wizard shows "no errors" because per-step validation only checks the current step's constraints.

**Why it happens:**
Per-step validation is the natural pattern. Cross-step dependencies require a global state validator that runs across all steps together, which is more complex and not the default behavior of react-hook-form or Zod schemas scoped to individual steps.

**How to avoid:**
Keep all form state in a single top-level store (Zustand or `useReducer`). Run the full sizing calculation on every state change, not just on the final step. Display derived warnings — not blocking errors — in a persistent summary panel visible at all steps. Do not gate the final "Calculate" action on per-step schemas alone; re-run a holistic Zod validation at submission time.

**Warning signs:**

- Editing Step 1 values does not update the real-time calculation panel until the user reaches Step 3.
- Users can reach the "results" view with logically inconsistent inputs that produce nonsensical server counts.
- Back-navigation triggers a "your data may be lost" confirmation (indicates state is not persisted correctly across steps).

**Phase to address:**
State management architecture phase (earliest phase). The global state shape must be defined before wizard steps are implemented.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Inline formulas in component files | Faster initial prototyping | Cannot unit-test math independently; copy-paste errors spread when new scenarios are added | Never — centralize in `src/lib/sizing/` from day one |
| `z.coerce.number()` for all numeric inputs | Fewer edge-case handlers to write | Empty fields silently become `0`, hiding required-field violations; NaN scenarios eliminated but replaced with wrong-value scenarios | Never for required non-zero fields |
| Storing parsed `number` in React state for numeric inputs | Simpler downstream code | Controlled/uncontrolled flips; user cannot type leading zeros or decimals mid-edit | Never — store string during editing |
| Single `headroom` percentage covering both utilization buffer and HA reserve | Simpler UI | Users cannot tune HA reserve independently; sizing output is ambiguous | Acceptable only if UI clearly labels the combined intent and defaults to ≥20% |
| Using `Math.round` instead of `Math.ceil` for server count | Produces lower (and sometimes more attractive) server counts | Under-provisions in the common case where workload does not divide evenly; fundamentally incorrect for discrete resource allocation | Never |
| Skipping formula transparency panel in MVP | Faster to ship | Users cannot verify outputs; presales engineers cannot explain recommendations to customers; stated as a hard requirement in PRD | Never — transparency is the acceptance criterion |

---

## Integration Gotchas

This is a client-side-only application with no external integrations. The relevant "integrations" are browser APIs.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `Blob` + anchor download (JSON/CSV export) | Creating the anchor with `document.createElement('a')` but not calling `URL.revokeObjectURL()`, leaking memory across repeated exports | Always call `URL.revokeObjectURL(url)` in a `finally` block or after a short timeout; wrap in a utility function used everywhere |
| Clipboard API (`navigator.clipboard.writeText`) | Calling it outside a user gesture (e.g., in a `useEffect` after state update) causes a silent permission error in Safari and Firefox | Invoke directly from a click handler; do not defer with `setTimeout` or `Promise.then` chains that outlive the click event |
| `vite.config.ts` `base` path for GitHub Pages | Omitting `base: '/cluster-sizer/'` causes all asset URLs to resolve from `/` instead of the repository subpath, resulting in a blank page on first deploy | Set `base` equal to the repository name; document this in a comment; test the production build locally with `vite preview` before first deploy |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Recalculating all scenarios on every keypress | Visible input lag, React DevTools shows 100+ ms renders for >3 scenarios | Memoize per-scenario calculation with `useMemo` keyed on that scenario's inputs; calculations are pure functions and cheap to memoize | At 5+ scenarios with 20+ inputs each, noticeable lag on older hardware |
| Storing both raw inputs and derived results in the same state slice | State updates trigger redundant re-renders; derived values go stale when inputs change | Treat inputs as the only source of truth in state; derive all outputs in render or via selectors | From the first implementation, if not caught in code review |
| Rendering all scenarios in a single large component tree | Editing one scenario re-renders all scenario cards | Use isolated `React.memo` wrappers per scenario card; pass only the relevant scenario's data as props | Not critical at 2-5 scenarios, but establishes bad patterns early |
| Debouncing input changes before calculating | Adds perceived latency for a tool where instant feedback is a core value proposition | Do NOT debounce — sizing calculations are synchronous and complete in <1ms; defer only if profiling reveals actual performance issues | Not applicable at this data scale |

---

## Security Mistakes

This tool processes no PII, has no authentication, and sends no data to a server. Classic web security concerns (XSS via user input, CSRF) apply but are low-risk.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exporting raw user input values into CSV without escaping | CSV injection: a user who pastes a formula string like `=CMD|' /C calc'!A0` into a server name field could inject an Excel macro into the exported file, which executes when the recipient opens it in Excel | Strip or quote-escape all field values in the CSV serializer; prefix suspicious strings starting with `=`, `+`, `-`, `@` with a single quote or escape them |
| Embedding unsanitized user-defined "scenario names" into HTML for display | Low-severity reflected XSS if React's JSX escaping is bypassed (e.g., `dangerouslySetInnerHTML`) | Never use `dangerouslySetInnerHTML` for user-supplied text; rely on React's default JSX escaping |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No visible progress indicator in multi-step wizard | Users cannot estimate how many steps remain; abandonment increases | Display a step counter ("Step 2 of 3") and a progress bar on every step |
| Blocking navigation to "next step" when current step has warnings (not hard errors) | Users with partially filled forms cannot explore downstream steps; frustration increases | Distinguish hard errors (block submission) from warnings (show but allow progression); let users proceed with a warning |
| Placing formula transparency in a modal or separate page | Users cannot see the formula while editing the input that drives it | Show formula inline, collapsed by default, expand on click, adjacent to the relevant output value |
| Side-by-side scenario comparison visible only after "calculate" button press | Feedback loop is too long; users want to see scenario differences update as they type | Update comparison table on every input change in real time |
| "Copy to clipboard" with no success/failure feedback | Users are unsure if the copy worked; they re-click, duplicating content in their slide | Show a brief "Copied" tooltip/toast on success; show "Copy failed — your browser blocked it" on API error |
| Allowing 0 or negative values to silently propagate through the form without field-level error | Calculation outputs show negative server counts or division-by-zero artifacts | Apply `min={1}` constraints and Zod `.positive()` validators to all CPU, RAM, and server-count fields; show error immediately on blur |

---

## "Looks Done But Isn't" Checklist

- [ ] **Formula transparency panel:** Each output value must show the formula string and the concrete parameter values used — verify that changing an input updates both the output AND the formula display.
- [ ] **Scenario duplication:** Verify that editing a duplicated scenario does not mutate the original (deep copy, not reference copy).
- [ ] **Export completeness:** Verify that the JSON/CSV export includes ALL inputs (not just the ones with non-default values) AND all computed outputs for every scenario.
- [ ] **Copy-to-clipboard fallback:** Verify behavior in Firefox and Safari, where `navigator.clipboard` requires explicit permission and may fail silently.
- [ ] **GitHub Pages asset loading:** Run `npm run build && npx serve dist` and verify all assets load from the correct subpath — do not rely solely on `vite dev` for deployment validation.
- [ ] **Empty-state handling:** Verify the comparison table, results panel, and export functions behave gracefully when zero scenarios are defined.
- [ ] **Boundary inputs:** Test with exactly 1 server result, with inputs that produce a fractional number just below an integer (e.g., 3.9999...), and with headroom set to 0%.
- [ ] **Default values reset:** Verify that "reset to defaults" for sizing assumptions restores ALL assumption fields, not just the ones the user visibly edited.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Floating-point drift discovered after users report wrong server counts | MEDIUM | Add reference spreadsheet test fixtures as unit tests; identify failing cases; fix intermediate rounding in the formula module only (centralized location makes this tractable) |
| Hyperthreading mis-labeling discovered post-launch | LOW | Update input field labels and add a warning validator; no formula changes needed |
| NaN cascade from empty inputs | MEDIUM | Add the `parseNumericInput` guard at all formula call sites; add integration tests for empty-then-fill input sequences |
| HA reserve omitted from formula | HIGH | Requires adding a new input field, updating the formula, re-validating against reference spreadsheet, and updating all existing test fixtures |
| Uncontrolled/controlled input flip | LOW | Replace partial object initialization with `createEmptyScenario()` factory; fix is isolated to state initialization code |
| CSV injection in export | LOW | Add string sanitizer to the CSV serialization utility; test with formula-injection input values |
| GitHub Pages blank page on deploy | LOW | Add `base` to `vite.config.ts`; redeploy |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|-----------------|--------------|
| Floating-point drift in sizing formulas | Phase 1: Formula engine | Unit tests with reference-spreadsheet fixture inputs/outputs within 0.001 tolerance |
| Hyperthreading double-counting | Phase 1: Input form + formula engine | Input label review; formula shows pCore definition; test with HT-inflated input values |
| NaN cascade from empty numeric inputs | Phase 1: Input form infrastructure | Integration test: clear each required field and verify no NaN appears in any output |
| HA headroom omission | Phase 1: Formula engine | Formula unit test explicitly checks N+1 scenario; HA reserve field present in UI |
| Uncontrolled-to-controlled input flip | Phase 1: State management setup | Console is clean (no React warnings) after scenario add, edit, duplicate, and delete |
| Multi-step cross-step validation | Phase 2: Wizard/navigation | Integration test: change Step 1 value and verify Step 2 outputs update immediately |
| CSV injection in export | Phase 2: Export feature | Test with `=HYPERLINK("http://evil.com")` as a field value; verify output is escaped |
| Debounce anti-pattern introduced | All phases | Performance budget: calculation must complete in <200ms; no debounce unless measured lag >200ms |
| GitHub Pages base path | Phase 3: Deployment | `npm run build` + `npx serve dist` locally before first push; verify asset URLs in built HTML |
| Blob URL memory leak in export | Phase 2: Export feature | Call `revokeObjectURL` in all export handlers; code review checklist item |

---

## Sources

- React `<input type="number">` controlled/uncontrolled issues: [React issue #7779](https://github.com/facebook/react/issues/7779), [React issue #1549](https://github.com/facebook/react/issues/1549)
- Zod `coerce.number()` empty-string-to-zero bug: [Zod discussion #2814](https://github.com/colinhacks/zod/discussions/2814), [Zod issue #2461](https://github.com/colinhacks/zod/issues/2461)
- React Hook Form numeric input pitfalls: [react-hook-form discussion #9376](https://github.com/orgs/react-hook-form/discussions/9376)
- JavaScript floating-point arithmetic: [Robin Wieruch — JavaScript Rounding Errors](https://www.robinwieruch.de/javascript-rounding-errors/), [JavaCodeGeeks — Handling Floating Point Precision](https://www.javacodegeeks.com/2024/11/handling-floating-point-precision-in-javascript.html)
- vSphere CPU overcommit hyperthreading mistake: [Broadcom Community — CPU overcommit ratio](https://community.broadcom.com/vmware-cloud-foundation/communities/community-home/digestviewer/viewthread?GroupId=5107&MessageKey=de14df8d-ddd4-41b4-8403-8fa4fd0c9fa1&CommunityKey=c24ac095-2065-4261-a4b5-6de9dade8734), [vSphere 6.5 CPU overcommit](https://virtuallyinvincible.wordpress.com/2019/03/05/vsphere-6-5-cpu-over-commitment-ratio/)
- vSphere HA failover capacity calculation: [VMware HA Admission Control Calculator](https://thinkingloudoncloud.com/calculator/vmware-ha-admission-control-calculator/), [Architecting vSphere Compute Platform](https://download3.vmware.com/vcat/vmw-vcloud-architecture-toolkit-spv1-webworks/Core%20Platform/Architecting%20a%20vSphere%20Compute%20Platform/Architecting%20a%20vSphere%20Compute%20Platform.1.061.html)
- React multi-step wizard UX and state patterns: [Doctolib — Smart Multi-Step Form](https://medium.com/doctolib/how-to-build-a-smart-multi-step-form-in-react-359469c32bbe), [Build with Matija — Zustand + Zod + RHF](https://www.buildwithmatija.com/blog/master-multi-step-forms-build-a-dynamic-react-form-in-6-simple-steps)
- Client-side Blob/CSV export: [The Road to Enterprise — CSV and JSON download](https://theroadtoenterprise.com/blog/how-to-download-csv-and-json-files-in-react)
- Vite + GitHub Pages base path: [Vite static deploy guide](https://vite.dev/guide/static-deploy), [Deploy Vite React with React Router to GitHub Pages](https://paulserban.eu/blog/post/deploy-vite-react-with-react-router-app-to-github-pages/)

---
*Pitfalls research for: Cluster Refresh Sizing Tool (React + TypeScript, client-side infrastructure sizing)*
*Researched: 2026-03-12*
