---
phase: 30-step-2-scenario-cards
verified: 2026-03-16T11:00:00Z
status: human_needed
score: 7/7 must-haves verified (automated)
human_verification:
  - test: "At 390px, scenario cards do not appear side-by-side (Tabs show one card at a time, full-width)"
    expected: "Only one scenario card is visible at a time; tabs are wrappable and do not cause horizontal scroll"
    why_human: "Tab layout overflow and card stacking cannot be verified by grep alone"
  - test: "At 390px, server config inputs (Sockets/Server, Cores/Socket, RAM/Server GB, Disk/Server GB) each take full width, stacked vertically"
    expected: "Four inputs stack in a single column — no two-column arrangement at 390px"
    why_human: "Visual grid behavior at specific viewport width requires browser rendering"
  - test: "At 390px, sizing assumptions inputs stack vertically at full width"
    expected: "Fields for vCPU:pCore Ratio, RAM/VM GB, Disk/VM GB, Headroom %, etc. render one per row"
    why_human: "Visual grid behavior at specific viewport width requires browser rendering"
  - test: "At 390px, vSAN & Growth section expanded — fields stack vertically"
    expected: "FTT Policy, Compression, Slack %, CPU Overhead, Memory/Host GB fields each occupy full row; growth projections also stack single-column"
    why_human: "Collapsed accordion + visual grid at specific width requires human interaction"
  - test: "At 390px, SPEC lookup (vcpu mode and specint mode) — search input is full-width, results table scrolls horizontally within the panel, no page-level horizontal scroll"
    expected: "SpecResultsPanel has overflow-x-auto; outer page has no horizontal scroll bar"
    why_human: "Overflow containment at nested element level requires browser verification"
  - test: "Duplicate and Remove card action buttons are easily tappable at 390px"
    expected: "Both buttons render at 36x36px (h-9 w-9); no precision tapping required"
    why_human: "Touch-target rendering and actual tap ease requires device or DevTools simulation"
  - test: "ScenarioResults breakdown (CPU/RAM/Disk formula rows) stacks vertically at 390px"
    expected: "Three formula rows appear stacked, no mono-text overflow or horizontal page scroll"
    why_human: "Mono-font formula string overflow at constrained width requires visual check"
---

# Phase 30: Step 2 Scenario Cards Verification Report

**Phase Goal:** A presales engineer on a phone can define and review sizing scenarios in Step 2 — scenario cards stack full-width, all configuration grids collapse to readable column counts, and the vSAN/SPEC lookup sections remain functional at 390px.

**Verified:** 2026-03-16T11:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | At 390px, Step 2 header (title + Add Scenario button) stacks vertically without clipping | VERIFIED | `Step2Scenarios.tsx:18` — `flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between` |
| 2 | At 390px, server config inputs display as single-column stack, each field full-width and readable | VERIFIED | `ScenarioCard.tsx:239` — `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4` |
| 3 | At 390px, sizing assumptions inputs display as single-column stack, each field full-width and readable | VERIFIED | `ScenarioCard.tsx:328` — `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4` |
| 4 | At 390px, vSAN settings fields display as single-column stack, readable and enterable | VERIFIED | `VsanGrowthSection.tsx:68` — `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4` |
| 5 | At 390px, Growth Projections fields display as single-column stack, readable and enterable | VERIFIED | `VsanGrowthSection.tsx:223` — `grid grid-cols-1 sm:grid-cols-3 gap-4` |
| 6 | At 390px, ScenarioResults breakdown (CPU/RAM/Disk) stacks vertically with formula strings readable | VERIFIED | `ScenarioResults.tsx:77` — `grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm` |
| 7 | At 390px, SPEC lookup search input and results panel are usable without horizontal page overflow | VERIFIED | `SpecResultsPanel.tsx:58` — `overflow-x-auto` on results container; SpecResultsPanel is rendered inside ScenarioCard without `overflow-x: hidden` on parent |

**Score:** 7/7 truths verified (automated class and wiring checks)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/step2/Step2Scenarios.tsx` | Mobile-first header layout; contains `flex-col` | VERIFIED | Line 18: `flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between`. TabsContent on line 56 renders ScenarioCard and ScenarioResults per scenario. |
| `src/components/step2/ScenarioCard.tsx` | Mobile-first server config and sizing assumption grids; touch-friendly card action buttons; contains `grid-cols-1` | VERIFIED | Line 239 server config grid; line 328 sizing assumptions grid; lines 210-229 Duplicate/Remove buttons `size="icon" className="h-9 w-9"` |
| `src/components/step2/ScenarioResults.tsx` | Mobile-first results breakdown grid; contains `grid-cols-1` | VERIFIED | Line 77: `grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm` |
| `src/components/step2/VsanGrowthSection.tsx` | Mobile-first vSAN and growth grids; contains `grid-cols-1` | VERIFIED | Line 68: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3`; Line 223: `grid-cols-1 sm:grid-cols-3` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `Step2Scenarios.tsx` | `ScenarioCard + ScenarioResults` | `TabsContent` renders one card at a time | WIRED | `TabsContent` import verified on line 3; usage on line 56 wraps `ScenarioCard` and `ScenarioResults` |
| `ScenarioCard.tsx` | `VsanGrowthSection` | Child component with responsive grids | WIRED | Import on line 33; usage on lines 582-588 with `form`, `scenarioId`, `layoutMode`, `open`, `onToggle` props |

---

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| CARD-01 | Scenario cards stack full-width on mobile (no side-by-side) | SATISFIED | Tabs pattern renders one card at a time. Header uses `flex-col` on mobile. Tabs list uses `flex-wrap h-auto` to prevent overflow. |
| CARD-02 | Server config grid (sockets/cores/RAM/disk) collapses to 2-column on mobile | SATISFIED (exceeded) | Implementation uses `grid-cols-1` at 390px (single-column, better than the specified 2-column). At sm (640px) it becomes 2-column, at md (768px+) 4-column. Single-column at 390px is strictly better for phone usability. |
| CARD-03 | Sizing assumptions grid collapses to 2-column on mobile | SATISFIED (exceeded) | Same pattern as CARD-02 — `grid-cols-1 sm:grid-cols-2 md:grid-cols-4`. Single-column at 390px. |
| CARD-04 | VsanGrowthSection internal grids are responsive at 390px | SATISFIED | vSAN grid `grid-cols-1 sm:grid-cols-2 md:grid-cols-3`; growth projections `grid-cols-1 sm:grid-cols-3`. Both single-column at 390px. |
| CARD-05 | SPEC lookup search input and results panel are usable on mobile | SATISFIED | Input renders full-width (no fixed width). `SpecResultsPanel` wraps table in `overflow-x-auto`. Available in both vcpu mode (lines 282-309) and specint mode (lines 450-503). |

Note on CARD-02 and CARD-03: REQUIREMENTS.md states "2-column on mobile." The PLAN overrides this to specify single-column at 390px with 2-column at sm. The implementation matches the PLAN (more conservative / better for phone UX). This is intentional — the PLAN was explicitly designed to be more granular than the high-level requirement.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `ScenarioCard.tsx` | 179 | `return null` | Info | Legitimate early-return guard when scenario is not found — not a stub |

No blockers or warnings found. The `placeholder` attributes on input elements are valid HTML input placeholders, not placeholder implementations.

---

### Commit Verification

| Commit | Status | Details |
|--------|--------|---------|
| `d0d90b3` | VERIFIED | Exists in git history. Commit message accurately describes all 6 class changes across 4 files. Diff confirms exactly the changes specified in the PLAN. |

---

### Test Suite

| Suite | Result |
|-------|--------|
| `src/components/step2/__tests__/` (47 tests) | PASS |
| Full suite (644 tests) | PASS |

---

### Human Verification Required

All automated class and wiring checks pass. Visual layout behavior at 390px viewport requires human confirmation in Chrome DevTools or physical device.

#### 1. Header Stacking (CARD-01)

**Test:** Open Step 2 at 390px width in Chrome DevTools (iPhone 14 preset).
**Expected:** "Step 2: Define Target Scenarios" title appears on its own line; "Add Scenario" button appears below it. Neither clips or causes a horizontal scrollbar.
**Why human:** Flex-col stacking at exact viewport width requires browser rendering.

#### 2. Server Config Grid — Single Column (CARD-02)

**Test:** At 390px, observe the Target Server Config section.
**Expected:** Sockets/Server, Cores/Socket, RAM/Server GB, and Disk/Server GB each appear as full-width fields stacked vertically — no two inputs side-by-side.
**Why human:** CSS grid layout at a specific pixel width requires browser rendering to confirm.

#### 3. Sizing Assumptions Grid — Single Column (CARD-03)

**Test:** At 390px, observe the Sizing Assumptions section.
**Expected:** vCPU:pCore Ratio, RAM/VM GB, Disk/VM GB, Headroom %, Target CPU Util %, Target RAM Util % each appear full-width and stacked — no two inputs side-by-side.
**Why human:** CSS grid layout at a specific pixel width requires browser rendering to confirm.

#### 4. vSAN and Growth Section — Single Column (CARD-04)

**Test:** At 390px, click "vSAN & Growth" to expand the section.
**Expected:** FTT Policy, Compression Factor, Slack %, CPU Overhead %, Memory/Host GB each appear full-width and stacked. Growth Projections (CPU, Memory, Storage) also stacked one per row.
**Why human:** Collapsed collapsible requires human interaction; grid layout at exact width requires browser.

#### 5. SPEC Lookup Usability (CARD-05)

**Test:** At 390px in vcpu mode, type a CPU model (e.g. "Xeon Gold") in the "Look up target CPU" field. Also verify in specint mode with the "Target CPU Model" field.
**Expected:** Input is full-width. Results table appears within an inner-scrollable container — no horizontal scrollbar at the page level.
**Why human:** Overflow containment behavior requires browser rendering with real content to verify the scroll is contained at the panel level.

#### 6. Touch-Target Sizes (CARD-01 / MOBILE-03)

**Test:** At 390px, try tapping the Duplicate (Copy) and Remove (Trash) buttons in the scenario card header.
**Expected:** Both buttons are comfortably tappable without precision; they render as square 36px targets.
**Why human:** Touch-target adequacy is a physical/experiential quality not verifiable by class inspection alone.

#### 7. ScenarioResults Formula Readability (CARD-01)

**Test:** After entering Step 1 data, return to Step 2. At 390px, observe the results panel below the card.
**Expected:** CPU-limited, RAM-limited, and Disk-limited rows appear stacked vertically. The mono-font formula strings under each count are readable and do not overflow the card boundary.
**Why human:** Mono-font text overflow at constrained width requires rendering with real formula string content.

---

### Summary

All 7 observable truths have been verified programmatically against the actual codebase:

- Every Tailwind class change specified in the PLAN is present in the corresponding file at the line described.
- All 4 artifacts exist, are substantive (not stubs), and are wired correctly.
- Both key links are confirmed: `TabsContent` wires `ScenarioCard`+`ScenarioResults` in `Step2Scenarios.tsx`; `VsanGrowthSection` is imported and rendered in `ScenarioCard.tsx` with the correct props.
- All 5 CARD requirements (CARD-01 through CARD-05) are satisfied. CARD-02 and CARD-03 are exceeded — the implementation delivers single-column at 390px rather than the specified 2-column, which is strictly better for the stated goal (phone usability).
- 644 tests pass with no failures.
- Commit `d0d90b3` is confirmed in git history and matches the plan exactly.

The only remaining verification gap is visual/interactive: whether the responsive classes produce the expected visual result at 390px in a real browser. This requires human confirmation via Chrome DevTools or a physical device.

---

_Verified: 2026-03-16T11:00:00Z_
_Verifier: Claude (gsd-verifier)_
