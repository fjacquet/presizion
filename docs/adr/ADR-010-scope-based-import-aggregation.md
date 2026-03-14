# ADR-010: Scope-Based Import Aggregation

**Date:** 2026-03-14
**Status:** Accepted
**Milestone:** v1.2

## Context

Enterprise environments often contain multiple datacenters, each with multiple clusters. A single RVTools or LiveOptics export may cover the entire vCenter -- thousands of VMs spread across distinct failure domains. Sizing the entire export as one flat cluster produces a single server count that does not reflect the physical topology or operational boundaries.

Presales engineers need per-site or per-cluster sizing to produce accurate BOM (Bill of Materials) proposals for multi-site deployments.

## Decision

Import parsers detect and group VM data by **scope keys** derived from datacenter and cluster metadata. The scope key format is:

- `datacenter||cluster` when both fields are present (e.g., `"Paris-DC1||Prod-Cluster-A"`)
- `cluster` alone when only the cluster field is present
- `__all__` as the fallback when neither field is available

Each parser (`rvtoolsParser.ts`, `liveopticParser.ts`) produces three scope-related fields in `ClusterImportResult`:

- `detectedScopes: string[]` -- the list of scope keys found in the data
- `scopeLabels: Record<string, string>` -- human-readable labels (e.g., `"Prod-Cluster-A (Paris-DC1)"`)
- `rawByScope: Map<string, ScopeData>` -- per-scope aggregated metrics (totalVcpus, totalVms, totalDiskGb, avgRamPerVmGb)

Scope detection uses the `CLUSTER_ALIASES` and `DATACENTER_ALIASES` column alias maps from `columnResolver.ts` to resolve column headers regardless of naming variations across export tools and versions.

## Rationale

- **Per-site sizing accuracy**: A 500-VM environment split across 3 clusters should produce 3 independent sizing results, not one oversized result. Each cluster may have different resource profiles and constraints.
- **Composable with the wizard**: The UI can present detected scopes as selectable options. The user picks which scope to size, and the corresponding `ScopeData` populates the `OldCluster` form fields. Multiple scopes can be sized as separate scenarios for side-by-side comparison.
- **No data loss**: The global (all-scope) aggregation is always computed alongside per-scope data. Users who want a single flat sizing can ignore the scope selector.
- **Format-agnostic**: Both RVTools and LiveOptics parsers use the same scope key construction logic and the same `ScopeAccum` accumulator pattern, ensuring consistent behavior across import formats.
- **Resilient to missing metadata**: When datacenter or cluster columns are absent (common in smaller environments or CSV exports), all VMs fall into the `__all__` scope. The feature degrades gracefully to flat aggregation.

## Consequences

- `ClusterImportResult` carries three additional optional fields (`detectedScopes`, `scopeLabels`, `rawByScope`). Consumers that do not need scope awareness can ignore them.
- The `rawByScope` map uses the composite `datacenter||cluster` string as its key. The `||` delimiter was chosen because it does not appear in typical VMware naming conventions.
- `ScopeData` is a type alias for `ClusterImportResult` without the scope-related and format fields, keeping the per-scope data shape consistent with the top-level aggregate.
- Adding scope support for new import formats requires implementing the same `ScopeAccum` pattern with `CLUSTER_ALIASES` and `DATACENTER_ALIASES` column resolution.
