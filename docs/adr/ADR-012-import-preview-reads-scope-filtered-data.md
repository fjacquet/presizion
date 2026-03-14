# ADR-012: ImportPreviewModal Reads Scope-Filtered Data

**Date:** 2026-03-14
**Status:** Accepted
**Milestone:** v1.4

## Context

`ImportPreviewModal.handleApply()` constructs an `OldCluster` object from import results and pushes it to `useClusterStore`. The modal computes a `previewCluster` by calling `aggregateScopes(result.rawByScope, selectedScopes)` which correctly produces scope-filtered values. However, ESX host config fields (ramPerServerGb, socketsPerServer, coresPerSocket, existingServerCount, utilization, cpuModel, cpuFrequencyGhz) were read from the global `result` object instead of `previewCluster`.

The global `result` contains ESX values from the first host across ALL clusters, not the selected scope. This produced incorrect values (e.g., 191 GB RAM/server from a different cluster instead of 1151 GB from the selected cluster).

## Decision

All fields in `handleApply()` read from `previewCluster` (the scope-filtered aggregation), not from `result` (global first-host values). This includes totalPcores, existingServerCount, socketsPerServer, coresPerSocket, ramPerServerGb, cpuUtilizationPercent, ramUtilizationPercent, cpuModel, and cpuFrequencyGhz.

## Rationale

The `previewCluster` object is computed from the user's scope selection via `aggregateScopes`. Using the global `result` bypassed the entire scope filtering system. The scope aggregator already handles additive fields (pCores, server count), representative fields (sockets, cores, CPU model), and weighted averages (utilization).

## Consequences

- All ESX fields in Step 1 correctly reflect the selected scope on initial import
- `useImportStore.setActiveScope()` already used `previewCluster`-equivalent logic -- behavior is now consistent between initial import and scope switching
- cpuModel and cpuFrequencyGhz are now available immediately after import (were previously lost)
