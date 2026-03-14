# ADR-008: ZIP File Format Detection Priority

**Date:** 2026-03-14
**Status:** Accepted
**Milestone:** v1.2

## Context

Users upload data exports from RVTools and LiveOptics, which may arrive as standalone `.xlsx` files or bundled inside `.zip` archives. A single ZIP can contain multiple `.xlsx` files with different formats (e.g., a LiveOptics export may include both a VMWARE-type workbook with ESX host data and a GENERAL-type workbook with VM-only data).

When a ZIP contains multiple candidates, the importer must decide which file to parse. The choice affects the quality and completeness of the imported data.

## Decision

The format detector in `src/lib/utils/import/formatDetector.ts` scores each `.xlsx` inside a ZIP and selects the highest-scoring file. The ranking is:

| Score | Format | Detection criterion | Data richness |
|-------|--------|-------------------|---------------|
| 3 | RVTools | `vInfo` sheet present | VM + ESX host metrics (vHost sheet) |
| 2 | LiveOptics VMWARE | `ESX Hosts` sheet present | VM + ESX host + performance metrics |
| 1 | LiveOptics GENERAL | `VMs` sheet present | VM-only (no host data) |
| 0 | Unknown (AIR/other) | No recognized sheet | Rejected |

If no file scores above 0, the import is rejected with an error.

## Rationale

- **ESX-level data is richer**: RVTools and LiveOptics VMWARE exports include host-level metrics (server count, sockets, cores per socket, RAM per server, CPU model, clock frequency). These populate `OldCluster` fields that enable SPECint and GHz sizing modes. VM-only exports (LiveOptics GENERAL) lack this data entirely.
- **RVTools scores highest**: RVTools exports are the most common format in VMware presales workflows and provide the most complete data set (vInfo for VMs, vHost for ESX hosts, vCluster for cluster topology).
- **Deterministic selection**: A fixed scoring system avoids ambiguity when a ZIP contains multiple candidates. The first file with the highest score wins, ensuring reproducible results regardless of file ordering inside the ZIP.
- **Graceful degradation**: If only a GENERAL-type file is available (score 1), it is still imported -- the user gets VM-level sizing without host-level fields. The UI can prompt for manual entry of missing host data.

## Consequences

- Adding support for new formats (e.g., Nutanix Collector) requires assigning a score and detection criterion in `detectZip()`.
- The scoring system assumes that higher-scoring formats are strict supersets of lower-scoring ones in terms of data richness. If a future format provides unique data not available in RVTools, the simple numeric ranking may need to be revisited.
- The selected file is passed through `detectXlsx()` for final format confirmation before being routed to the appropriate parser (`parseRvtools` or `parseLiveoptics`).
