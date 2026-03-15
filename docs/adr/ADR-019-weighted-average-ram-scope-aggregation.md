# ADR-019: Weighted Average RAM in Scope Aggregation

**Date:** 2026-03-15
**Status:** Accepted
**Milestone:** v2.1

## Context

When multiple scopes (clusters) are selected for aggregated sizing, the application must determine a single RAM-per-server value to use in calculations. The previous implementation used a "first-scope-wins" approach: it took RAM/server from whichever scope appeared first (alphabetically by scope key).

This produced incorrect results when the first scope alphabetically was a small cluster with lower RAM per host. For example, in one customer import with three clusters, the alphabetically first cluster had 191 GB RAM/server while the other two had ~1151 GB. First-scope-wins reported 191 GB as the representative value, causing the sizing engine to dramatically overcount the number of servers needed for the RAM constraint.

## Decision

Multi-scope RAM/server uses a host-count-weighted average. For each selected scope, the RAM/server value is multiplied by the number of hosts in that scope. The sum is divided by the total host count across all selected scopes. The same weighted-average approach applies to any per-server metric that varies across scopes (sockets, cores per socket) when aggregating.

## Rationale

- **Proportional representation**: A cluster with 20 hosts contributes more to the average than a cluster with 2 hosts. This reflects the actual hardware footprint being refreshed.
- **Eliminates ordering sensitivity**: The result is deterministic regardless of scope key sort order, cluster naming conventions, or import parse order.
- **Correct sizing output**: Using the weighted average produces server counts that match what an engineer would calculate by hand when combining clusters with different hardware specs.

## Consequences

- The scope aggregation function computes weighted averages for RAM/server, sockets, and cores per socket
- Scopes with zero hosts are excluded from the weighted average to avoid division artifacts
- The UI displays the aggregated RAM/server value with a tooltip showing the per-scope breakdown so engineers can verify the blending
- If all selected scopes have identical RAM/server, the weighted average equals that value (no behavioral change for homogeneous environments)
