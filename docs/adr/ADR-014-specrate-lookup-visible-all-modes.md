# ADR-014: SPECrate Lookup Visible in All Sizing Modes

**Date:** 2026-03-14
**Status:** Accepted
**Milestone:** v1.4

## Context

The original plan restricted the "Look up SPECrate" button to SPECrate sizing mode only (`sizingMode === 'specint' && currentCluster.cpuModel`). However, presales engineers need to look up the SPECrate benchmark value BEFORE switching to SPECrate mode — they need the value to enter as `specintPerServer` in Step 1. Restricting the button to specint-only created a chicken-and-egg problem.

## Decision

The "Look up SPECrate" button is visible whenever `currentCluster.cpuModel` is detected, regardless of the current sizing mode. The button:

1. Extracts a short model number from the CPU string (e.g., "6526Y" from "Intel(R) Xeon(R) Gold 6526Y CPU @ 2.40GHz") using regex
2. Copies the model number to clipboard with a toast message
3. Opens the SPEC advanced query form (`conf=rint2017;op=form`) in a new tab

## Rationale

The workflow is: import file -> see detected CPU model -> click lookup -> find SPECrate value on SPEC website -> enter value in Step 1 -> switch to SPECrate mode. This workflow requires the link to be available before switching modes.

## Consequences

- SPEC-LINK-03 requirement ("hidden when no CPU model detected") is still satisfied
- The button visibility is decoupled from sizing mode selection
- The SPEC form URL includes `op=form` to land directly on the searchable form, not the landing page
- Clipboard contains just the model number (not the full CPU description string) for easy paste into the Processor field
