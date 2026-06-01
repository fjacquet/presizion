# ADR-022: Stretch-Cluster Control Lives in the Global Header

**Date:** 2026-05-31
**Status:** Accepted
**Milestone:** v1.4 (sub-project E — i18n)

## Context

Presizion exposes three binary selections that influence sizing:

1. **Sizing mode** — `vcpu` | `performance` (a global sizing *method*, `useWizardStore`).
2. **Layout mode** — `hci` | `disaggregated` (a global sizing *method*, `useWizardStore`).
3. **Stretch cluster** — `isStretchCluster` boolean (a *fact about the existing
   cluster*, `useClusterStore.currentCluster`; auto-detected on RVTools/LiveOptics
   import, and it doubles the resulting server count rounded to an even number).

Historically the sizing/layout modes were rendered as **segmented two-button
toggles** in the wizard header, while Stretch cluster was an **on/off switch**
inside the Step 1 "Existing Server Config" form section. Two inconsistencies
surfaced during the i18n pass:

- **Control pattern:** segmented toggles vs. a switch for what are all binary choices.
- **Placement:** stretch sat in the Step 1 form while the modes sat in the header.

## Decision

1. **Unify the control pattern to switches.** The sizing and layout toggles became
   on/off switches (OFF=`vcpu`/`hci`, ON=`performance`/`disaggregated`), with both
   end-labels kept visible and the active side emphasized — matching the existing
   Stretch-cluster switch idiom.
2. **Relocate the Stretch-cluster control to the global header**, at the same level
   as the sizing/layout switches (rendered by `SizingModeToggle`). It is removed
   from the Step 1 `CurrentClusterForm`.

The control reads/writes `useClusterStore.currentCluster.isStretchCluster` directly
(`setCurrentCluster({ ...currentCluster, isStretchCluster })`). Import-time
auto-detection (`stretchClusterDetector`) is unchanged — it still writes the store
field; only the manual editing surface moved.

## Consequences

**Positive**
- One consistent selection pattern (switches) for all three binary controls.
- The three switches are visually grouped in the header, persistent across steps.
- Stretch can be toggled from any step, not only Step 1.

**Negative / trade-offs**
- Stretch cluster is conceptually *input data* about the existing environment, yet
  it now lives among global *sizing-method* controls rather than beside the other
  imported cluster facts (server count, sockets, RAM). This was an explicit UX
  choice favouring visual consistency over the input-vs-method separation.
- It is now editable from every step; there is no longer a single "data entry"
  locus for this field.

## Implementation notes

- i18n: the `stretchCluster` label/tooltip moved from the `step1` namespace
  (`currentClusterForm.fields/tooltips.stretchCluster`) to the `wizard` namespace
  (`stretch.label`, `stretch.tooltip`) across all four locales (en/fr/de/it); key
  parity is preserved.
- `isStretchCluster` was removed from the Step 1 form's `defaultValues`, change
  detection, and `form.reset` sync; the Zod schema field is retained (optional) and
  the store remains the source of truth.
- Tests: `SizingModeToggle.test.tsx` now asserts switch semantics for all three
  controls including stretch.

## Related

- ADR-004 (utilization as input scaler) — another input-vs-output modelling decision.
- Sub-project E i18n plan: `docs/superpowers/plans/2026-05-31-presizion-E-i18n.md`.
