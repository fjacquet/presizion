# ADR-016: GiB Internal Units for Storage

**Date:** 2026-03-15
**Status:** Accepted
**Milestone:** v2.0

## Context

Storage values flow through the application from multiple sources: LiveOptics imports (which may report in GB or TB), RVTools imports (which use various units), manual entry, and sizing formulas. Mixing binary (GiB/TiB) and decimal (GB/TB) units introduces a ~7-10% error that compounds across calculations. VxRail hardware and VMware vSphere both use binary units (GiB/TiB) for capacity reporting.

Previous code had inconsistent unit handling: some paths assumed GiB, others assumed GB, and display labels did not always match the underlying value. This led to subtle sizing errors that were difficult to trace.

## Decision

All storage computations use GiB as the internal canonical unit. Values are converted to GiB at the import boundary. Display formatting converts to TiB when the value exceeds 1024 GiB, with the unit label shown explicitly. Export outputs include the unit suffix for clarity.

## Rationale

- **Single canonical unit eliminates conversion bugs**: Every formula operates in GiB; no per-function unit guessing.
- **VxRail alignment**: VxRail reports usable capacity in TiB/GiB (binary). Using the same base unit means import values match hardware specs without conversion.
- **Display threshold is intuitive**: Values below 1024 GiB display as GiB; values at or above display as TiB with two decimal places. This matches how presales engineers read VxRail capacity reports.
- **~10% error prevention**: 1 TB = 1,000 GB but 1 TiB = 1,024 GiB. Mixing the two silently inflates or deflates capacity by ~7.4% per conversion boundary.

## Consequences

- All import parsers must detect the source unit and convert to GiB before writing to the store
- A shared `formatStorage(gib: number): string` utility handles display formatting with automatic GiB/TiB switching
- Existing test fixtures must be audited to confirm they use GiB values consistently
- Manual entry fields show "GiB" labels; a future enhancement could accept user-typed units and convert on blur
