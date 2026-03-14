# ADR-011: ESX Host-to-Cluster Scope Key Priority

**Date:** 2026-03-14
**Status:** Accepted
**Milestone:** v1.4

## Context

When importing LiveOptics files with multiple clusters, ESX host data (RAM/server, sockets, cores, pCores, utilization) must be assigned to the correct cluster scope. Two sources provide host-to-cluster mapping: (1) the `hostToCluster` map built during VM row parsing (always uses the `dc||cluster` composite key format), and (2) the Cluster column directly on the ESX Hosts sheet.

The original implementation checked the ESX Hosts Cluster column first. However, this sheet typically lacks a Datacenter column, producing plain cluster keys (e.g., `vxr-clu-win`) that don't match the composite keys used by VMs (e.g., `vxr-dc-win||vxr-clu-win`). This caused ESX data to never merge into the correct per-scope ScopeData, leaving RAM/server at 191 GB (from the global first-host fallback) instead of the correct ~1151 GB.

## Decision

`hostToCluster` map (from VMs sheet) takes priority over the ESX Hosts Cluster column for scope key resolution. The priority order is:

1. **hostToCluster** (from VMs) -- always has correct `dc||cluster` format
2. **ESX Hosts Cluster + Datacenter columns** -- fallback when host not found in VM data
3. **`__all__`** -- global fallback with warning

The same priority applies to ESX Performance sheet scoping.

## Rationale

The hostToCluster map is built from VM rows which always have both datacenter and cluster columns resolved. It produces the exact composite key format that rawByScope uses. The ESX Hosts sheet often has only a Cluster column without Datacenter, producing keys that don't match.

## Consequences

- RAM/server, sockets, cores, pCores, and utilization now correctly reflect the selected scope
- Hosts not referenced by any VM will fall through to Priority 2 or 3
- RVTools vHost parser keeps Cluster column as Priority 1 (different context -- vHost typically has reliable cluster data)
