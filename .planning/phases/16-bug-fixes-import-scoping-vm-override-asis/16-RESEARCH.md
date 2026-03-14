# Phase 16: Bug Fixes — Import Scoping, VM Override & As-Is Column - Research

**Researched:** 2026-03-14
**Domain:** TypeScript / React — data-integrity bugs in import parsers, sizing formulas, and comparison table rendering
**Confidence:** HIGH

---

## Summary

Phase 16 fixes three independent categories of bugs that each produce incorrect sizing results
or incomplete data presentation. All affected code is well-isolated in the existing codebase,
making fixes surgical rather than architectural.

**Bug 1 — Import Scoping (FIX-SCOPE-01..06):** The LiveOptics XLSX parser reads ESX host
config fields (sockets, cores, RAM, utilization) only from the *first host row globally*, then
stores them at the top-level result rather than in each per-scope `ScopeData` entry. When a
user selects a specific cluster scope, `aggregateScopes()` tries to copy ESX fields from the
first selected scope that has them — but none of the per-scope entries carry those fields
because the parser never scoped them. The fix requires extracting ESX Hosts data per cluster
and storing it in each `rawByScope` entry. The RVTools parser has the same gap for its
`vHost` sheet (currently reads only CPU model and frequency, not sockets/cores/RAM, and those
fields are not scoped either).

**Bug 2 — VM Override (FIX-VM-01..02):** In `constraints.ts`, `effectiveVmCount` is already
computed correctly from `scenario.targetVmCount ?? cluster.totalVms`. Inspection of the
current code shows that `effectiveVmCount` IS already passed to both `serverCountByRam` and
`serverCountByDisk`. Reading the code carefully, the bug is more subtle: the comment in the
roadmap says "pass overridden count to RAM-limited and Disk-limited formulas (not just CPU)",
which suggests the current behavior may NOT be using `effectiveVmCount` consistently.
Re-reading `constraints.ts` line 131: `serverCountByRam(effectiveVmCount, ...)` and line
144: `serverCountByDisk(effectiveVmCount, ...)`. So `effectiveVmCount` IS passed to all
three formulas. The actual bug is that `effectiveVcpus` (line 83) uses `cluster.totalVcpus`
as the base but scales by `targetVmCount / totalVms`, yet `effectiveVmCount` (line 82) uses
`scenario.targetVmCount ?? cluster.totalVms`. The tests for this requirement do not yet exist.
The plan calls for adding tests that verify RAM and Disk counts use the overridden VM count —
investigation shows the code is already correct but **lacks tests**, so FIX-VM-01/02 is
primarily a test-coverage task with potential for edge-case verification.

**Bug 3 — As-Is Column (FIX-ASIS-01..04):** The `ComparisonTable` currently shows `—` in
the As-Is column for VMs/Server (Row 6), CPU Util %, RAM Util %, and the disk row. The
`currentCluster` store already carries `cpuUtilizationPercent`, `ramUtilizationPercent`,
`totalDiskGb`, `existingServerCount`, and `totalVms` — all data is available, just not
rendered in the As-Is cells.

**Primary recommendation:** Fix each bug category in the files it directly touches — no
cross-cutting architectural changes required. The import scoping fix is the largest; the
VM-override fix may be primarily test-writing; the As-Is column fix is purely presentational.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FIX-SCOPE-01 | LiveOptics ESX host config must be scoped per cluster | ESX Hosts sheet has cluster-joinable data via host→cluster mapping from VMs sheet; `parseXlsx()` must build per-cluster host maps |
| FIX-SCOPE-02 | Per-scope ScopeData must include host config fields | `ScopeData` type (= `Omit<ClusterImportResult, ...>`) already supports all ESX fields as optional; parser must populate them per scope |
| FIX-SCOPE-03 | "All" scope aggregates host config (totalPcores=sum, count=total hosts, RAM/server=representative+warning) | `aggregateScopes()` currently copies from first scope; needs summing for pCores/count and heterogeneity-warning logic for RAM |
| FIX-SCOPE-04 | ESX Performance (CPU/RAM util) also scoped per cluster | `ESX Performance` sheet has a host_name column; hosts join to clusters via ESX Hosts → cluster mapping |
| FIX-SCOPE-05 | Fallback when no cluster column on ESX Hosts: global behavior + warning | The VMs sheet cluster column is the join key; if absent, fallback to single `__all__` scope with warning |
| FIX-SCOPE-06 | Audit + fix RVTools vHost parser for same scoping gap | `parseRvtools()` reads vHost for CPU model/frequency only; needs sockets/cores/RAM extraction and per-cluster scoping |
| FIX-VM-01 | RAM-limited formula uses targetVmCount override, not original totalVms | `constraints.ts` already passes `effectiveVmCount` to `serverCountByRam`; need tests confirming this and fixing any edge case |
| FIX-VM-02 | Disk-limited formula uses targetVmCount override | Same as above for `serverCountByDisk` |
| FIX-ASIS-01 | As-Is column shows VMs/Server = totalVms / existingServerCount | Data available in `useClusterStore`; Row 6 currently shows `—` for As-Is |
| FIX-ASIS-02 | As-Is column shows CPU Util % and RAM Util % from imported ESX Performance data | `currentCluster.cpuUtilizationPercent` and `ramUtilizationPercent` are available but not rendered in As-Is cells |
| FIX-ASIS-03 | As-Is column shows Total Disk Required from imported totalDiskGb | `currentCluster.totalDiskGb` exists on `OldCluster`; not rendered in disk row As-Is cell |
| FIX-ASIS-04 | Metrics that don't apply to As-Is show "N/A" rather than "—" | Row 4 (Limiting Resource) and Row 7 (Headroom) should show "N/A" |
</phase_requirements>

---

## Standard Stack

### Core (already in project — no new installations)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@e965/xlsx` | existing | XLSX/CSV parsing | Already used in both parsers |
| `vitest` | existing | Unit testing | Project-standard test runner |
| React + TypeScript | existing | UI rendering | Project baseline |

No new dependencies are required for Phase 16.

## Architecture Patterns

### Relevant Project Structure
```
src/
  lib/
    sizing/
      constraints.ts        # VM override fix lives here
      formulas.ts           # Pure formula functions (no changes expected)
    utils/
      import/
        liveopticParser.ts  # Primary scoping fix target
        rvtoolsParser.ts    # Secondary scoping fix target
        scopeAggregator.ts  # "All" aggregation fix
        columnResolver.ts   # May need RVTOOLS_VHOST_ALIASES extension
        index.ts            # ScopeData type definition
  components/
    step3/
      ComparisonTable.tsx   # As-Is column fix target
```

### Pattern 1: Per-Cluster Host Config Join in LiveOptics

**What:** The ESX Hosts sheet does not have a Cluster column. The join must be inferred from
the VMs sheet by building a host→cluster mapping (hostname → cluster key), then grouping
ESX Hosts rows by that map.

**Key insight from LiveOptics structure:**
- VMs sheet has a `Cluster` column per VM and (optionally) a host assignment column or the
  host→cluster relationship can be inferred if the ESX Hosts sheet has a matching host name.
- The LiveOptics VMs sheet may include a column like "Host" or "ESX Host" that maps each VM
  to a host. If present, build `Map<hostName, clusterKey>` during VM aggregation, then use it
  to group ESX Hosts rows.
- If no host→cluster mapping exists (no host column in VMs sheet), fall back to reading all
  ESX Hosts globally and storing under `__all__` with a warning.

**Current gap:** `parseXlsx()` reads the ESX Hosts sheet after `aggregate(rows)` has already
computed scoped VM data. The ESX fields are then attached only to the top-level `base` result,
never to any `rawByScope` entry.

**Fix shape:**
```typescript
// In parseXlsx():
// 1. During aggregate(), if a 'host' column exists on VMs, collect:
//    hostToCluster: Map<string, string>  (hostname → scopeKey)
//
// 2. After reading ESX Hosts rows, group by scopeKey via hostToCluster:
//    hostsByScopeKey: Map<string, VmRow[]>
//
// 3. For each cluster scope key in rawByScope, compute ESX fields from
//    hostsByScopeKey.get(key) and merge into rawByScope.get(key)
//
// 4. Fallback: if no host column, attach global ESX data to __all__ scope
//    with warning "Host-to-cluster mapping unavailable; ESX host config
//    assigned to global scope."
```

**"All" aggregation fix for scopeAggregator.ts:**
```typescript
// Current: copies ESX fields from first scope that has them
// Needed:
//   totalPcores:        sum across all selected scopes (additive)
//   existingServerCount: sum across all selected scopes (additive)
//   socketsPerServer:   representative value (first scope); no heterogeneity warning needed
//   coresPerSocket:     representative value (first scope)
//   ramPerServerGb:     if all scopes have same value → use it;
//                       if different → use first and push warning
//   cpuUtilizationPercent: weighted average by existingServerCount
//   ramUtilizationPercent: weighted average by existingServerCount
```

### Pattern 2: RVTools vHost Scoping

**What:** The RVTools vHost sheet has a host_name column. The vInfo sheet (VMs) has a Cluster
column. The join is the same host→cluster pattern as LiveOptics.

**Current gap:** `parseRvtools()` reads vHost only for `cpuModel` and `cpuFrequencyGhz` and
stores them globally. The RVTOOLS_VHOST_ALIASES in `columnResolver.ts` only defines
`host_name`, `cpu_model`, `cpu_speed_mhz` — it lacks `cpu_sockets`, `cpu_cores`,
`memory_mb` (or equivalent).

**RVTools vHost column names (typical):**
- `# CPU` or `CPUs` or `Num CPU` — physical CPU sockets
- `CPU` or `# Cores` — total cores (not cores/socket — needs derivation)
- `Memory Size` or `Memory` — host RAM in MB or GB

**RVTOOLS_VHOST_ALIASES needs extension:**
```typescript
export const RVTOOLS_VHOST_ALIASES: ColumnAliasMap = {
  host_name:      ['Host', 'Name', 'Host Name'],
  cpu_model:      ['CPU Model'],
  cpu_speed_mhz:  ['Speed MHz', 'CPU Speed MHz', 'CPU Speed'],
  // Add:
  cpu_sockets:    ['# CPU', 'CPUs', 'Num CPU', 'Sockets'],
  cpu_cores_total: ['# Cores', 'CPU Cores', 'Cores'],   // total cores (derive coresPerSocket = total/sockets)
  memory_mb:      ['Memory Size', 'Memory MB', 'Memory'],
}
```

### Pattern 3: VM Override Test Pattern

**What:** `constraints.ts` computes `effectiveVmCount = scenario.targetVmCount ?? cluster.totalVms`
and passes it to both `serverCountByRam` and `serverCountByDisk`. The code appears correct.
The required fix is adding explicit tests that:
1. Confirm RAM-limited count uses `targetVmCount` (not `cluster.totalVms`) when override is set
2. Confirm Disk-limited count uses `targetVmCount` when override is set
3. Confirm both counts scale correctly (e.g., 2× VM count → proportionally more servers)

**Test file location:** `src/lib/sizing/__tests__/constraints.test.ts` (does not yet exist,
will be a new file).

### Pattern 4: As-Is Column Rendering

**Current state of As-Is cells:**
- Row 6 (VMs/Server): `<TableCell className="text-center bg-muted/30">—</TableCell>`
- Row 7 (Headroom): `<TableCell className="text-center bg-muted/30">—</TableCell>` — should be `N/A`
- Row 8 (CPU Util %): `<TableCell className="text-center bg-muted/30">—</TableCell>` — should be real value
- Row 9 (RAM Util %): `<TableCell className="text-center bg-muted/30">—</TableCell>` — should be real value
- Row 10 (Disk Util %): `<TableCell className="text-center bg-muted/30">—</TableCell>` — should be real value
- Row 4 (Limiting Resource): `<TableCell className="text-center bg-muted/30">—</TableCell>` — should be `N/A`

**Fix shapes:**
```tsx
// Row 6 (VMs/Server)
const asisVmsPerServer =
  currentCluster.existingServerCount && currentCluster.existingServerCount > 0
    ? (currentCluster.totalVms / currentCluster.existingServerCount).toFixed(1)
    : '—'

// Row 8 (CPU Util %) — conditional on availability
{currentCluster.cpuUtilizationPercent !== undefined
  ? `${currentCluster.cpuUtilizationPercent.toFixed(1)}%`
  : '—'}

// Row 9 (RAM Util %)
{currentCluster.ramUtilizationPercent !== undefined
  ? `${currentCluster.ramUtilizationPercent.toFixed(1)}%`
  : '—'}

// Row 10 (Disk)
{layoutMode === 'disaggregated'
  ? currentCluster.totalDiskGb
    ? `${currentCluster.totalDiskGb.toLocaleString()} GB`
    : '—'
  : '—'}   // HCI disk util doesn't apply to As-Is

// Row 4 (Limiting Resource) and Row 7 (Headroom): replace '—' with 'N/A'
```

### Anti-Patterns to Avoid

- **Don't change the `ScopeData` type shape** — it is `Omit<ClusterImportResult, ...>`, which
  already includes all optional ESX fields. Adding fields would break the type alias logic.
- **Don't re-architect `aggregateScopes()`** — only change the ESX field merging from
  "copy from first" to "sum where additive, representative+warning otherwise".
- **Don't mutate `rawByScope` entries after creation** — build new scope objects with ESX
  fields rather than patching existing ones.
- **Don't add new imports to ComparisonTable** — all needed data is already in `useClusterStore`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Host→cluster join | Custom join framework | Simple `Map<string, string>` built during VM row loop | No complexity needed beyond a lookup table |
| Heterogeneity detection | Complex comparison engine | `new Set(scopes.map(s => s.ramPerServerGb)).size > 1` | One line, no library needed |
| Weighted average util | Stats library | Manual sum/count division | Two arithmetic operations |

## Common Pitfalls

### Pitfall 1: Missing Host→Cluster Column in LiveOptics VMs Sheet

**What goes wrong:** Not all LiveOptics exports include a host assignment column on the VMs
sheet. Attempting to build a `hostToCluster` map from a column that doesn't exist silently
produces an empty map, so all hosts land in no cluster and ESX fields are lost.

**Why it happens:** LiveOptics export templates vary by version. Some exports omit the host
column entirely.

**How to avoid:** After building `hostToCluster`, if it is empty despite cluster columns
being present, fall back to global ESX data with the warning specified in FIX-SCOPE-05.
Log: "Host-to-cluster mapping unavailable on VMs sheet; ESX host config applied globally."

**Warning signs:** All per-scope `ScopeData` entries lack ESX fields after scoping fix is
applied.

### Pitfall 2: ESX Hosts Cluster Column (Alternative Join Path)

**What goes wrong:** Some LiveOptics exports DO include a `Cluster` column directly on the
ESX Hosts sheet. Using only the host→VM→cluster join misses this simpler path.

**Why it happens:** LiveOptics added a Cluster column to ESX Hosts in some export versions.

**How to avoid:** Check for a Cluster column on ESX Hosts first. If present, use it directly
to scope hosts. Only fall back to the host→cluster join from VMs if absent.

**Add alias:** `LIVEOPTICS_ESX_HOSTS_ALIASES` should include:
```typescript
cluster_name: ['Cluster', 'cluster', 'Cluster Name'],
```

### Pitfall 3: RVTools vHost Memory Column Units

**What goes wrong:** RVTools vHost memory columns vary — some exports use MB, others GB.
Assuming MB and encountering GB values produces wildly incorrect `ramPerServerGb` figures.

**Why it happens:** RVTools column headers say "Memory Size" with different units across
versions. The actual numeric value must be interpreted in context.

**How to avoid:** Detect units from the column header (MB vs GB suffix). Default to MB if
ambiguous (historical behavior). Values above ~4096 without GB suffix are almost certainly MB.

### Pitfall 4: Forgetting "All" Scope in scopeAggregator

**What goes wrong:** The `__all__` synthetic scope used when no cluster column exists is
stored as a single scope entry, not as an aggregation of other scopes. Fixing "All" aggregation
logic should not break the single-entry `__all__` case.

**Why it happens:** `__all__` is created during `aggregate()` when no cluster column exists —
it contains global totals already. It must not be double-aggregated.

**How to avoid:** The aggregation fix in `scopeAggregator.ts` applies when *multiple* selected
scopes are merged. When only `__all__` is selected (single entry), existing copy logic is
sufficient.

### Pitfall 5: As-Is CPU Util % Row Visibility

**What goes wrong:** The CPU Util % row has conditional visibility (`showCpuUtilRow`). Filling
in the As-Is cell must not accidentally show the row when it should be hidden.

**Why it happens:** The As-Is cell is rendered inside the `{showCpuUtilRow && (...)}` block,
so it is already protected. No special handling needed.

**How to avoid:** No action needed — existing conditional rendering covers this.

### Pitfall 6: Disk As-Is in HCI vs. Disaggregated

**What goes wrong:** Row 10 shows "Disk Util %" in HCI mode and "Total Disk Required" in
disaggregated mode. The As-Is cell content for this row differs by layout mode.

**How to avoid:**
- HCI mode: As-Is disk util % is not computable without per-server disk capacity data in
  `OldCluster`. Show `—` (not `N/A` — data simply not available from import).
- Disaggregated mode: As-Is total disk = `currentCluster.totalDiskGb` — show if available.

## Code Examples

### Scoping ESX Hosts by Cluster (LiveOptics)

```typescript
// Source: inferred from existing parseXlsx() pattern in liveopticParser.ts

// Step A: During aggregate(), collect host→cluster mapping from VMs sheet
// (if a 'host' or 'ESX Host' column exists on VMs)
const HOST_ALIASES: ColumnAliasMap = { host_name: ['Host', 'ESX Host', 'Host Name'] }
const colMapHost = resolveColumns(headers, HOST_ALIASES, new Set())
const hostToCluster = new Map<string, string>()
for (const row of rows) {
  const hostName = str(row, colMapHost['host_name'])
  const scopeKey = /* computed as before */
  if (hostName) hostToCluster.set(hostName, scopeKey)
}

// Step B: Group ESX Hosts rows by cluster
const hostsByScopeKey = new Map<string, VmRow[]>()
for (const hostRow of hostRows) {
  const hostName = str(hostRow, cols['host_name'])
  // First check if ESX Hosts sheet has a Cluster column
  const directCluster = str(hostRow, cols['cluster_name'])
  const scopeKey = directCluster || hostToCluster.get(hostName) || '__all__'
  const existing = hostsByScopeKey.get(scopeKey) ?? []
  hostsByScopeKey.set(scopeKey, [...existing, hostRow])
}

// Step C: Compute ESX fields per scope and merge into rawByScope
for (const [key, scopeHostRows] of hostsByScopeKey.entries()) {
  const scopeData = rawByScope.get(key)
  if (!scopeData) continue
  const firstHost = scopeHostRows[0]
  const sockets = num(firstHost, cols['cpu_sockets'])
  const coresFirst = num(firstHost, cols['cpu_cores'])
  const derivedCores = sockets > 0 ? Math.round(coresFirst / sockets) : 0
  const ramGb = Math.round(num(firstHost, cols['memory_kib']) / 1024 / 1024)
  rawByScope.set(key, {
    ...scopeData,
    existingServerCount: scopeHostRows.length,
    totalPcores: scopeHostRows.reduce((s, h) => s + num(h, cols['cpu_cores']), 0),
    socketsPerServer: sockets || undefined,
    coresPerSocket: derivedCores || undefined,
    ramPerServerGb: ramGb || undefined,
  })
}
```

### Aggregation Fix in scopeAggregator.ts

```typescript
// Source: existing scopeAggregator.ts pattern — extend ESX field merging

// Replace current "copy from first" ESX fields block with:
let totalPcores = 0
let existingServerCount = 0
const ramPerServerValues: number[] = []

for (const scope of selected) {
  // ... existing totalVcpus/totalVms/totalDiskGb accumulation ...
  if (scope.totalPcores !== undefined) totalPcores += scope.totalPcores
  if (scope.existingServerCount !== undefined) existingServerCount += scope.existingServerCount
  if (scope.ramPerServerGb !== undefined) ramPerServerValues.push(scope.ramPerServerGb)
}

// Representative RAM/server with heterogeneity warning
const uniqueRam = new Set(ramPerServerValues)
if (uniqueRam.size > 1) {
  allWarnings.push('Heterogeneous RAM/server detected across clusters — using first cluster as representative.')
}
const ramPerServerGb = ramPerServerValues[0]  // representative (first selected)

// Emit summed/representative values
if (totalPcores > 0) esxFields.totalPcores = totalPcores
if (existingServerCount > 0) esxFields.existingServerCount = existingServerCount
if (ramPerServerGb) esxFields.ramPerServerGb = ramPerServerGb
// socketsPerServer/coresPerSocket: copy from first scope as before (unchanged)
// cpuUtilizationPercent/ramUtilizationPercent: weighted average by existingServerCount
```

### VM Override Tests in constraints.test.ts

```typescript
// Source: constraints.ts logic (effectiveVmCount already used)

describe('targetVmCount override', () => {
  it('RAM-limited count uses targetVmCount, not cluster.totalVms', () => {
    const cluster = { totalVcpus: 1000, totalPcores: 200, totalVms: 100, totalDiskGb: 0 }
    const scenario = {
      ...defaultScenario,
      targetVmCount: 200,  // 2x override
      ramPerVmGb: 16,
      ramPerServerGb: 512,
      headroomPercent: 0,
    }
    const withOverride = computeScenarioResult(cluster, scenario)
    const withoutOverride = computeScenarioResult(cluster, { ...scenario, targetVmCount: undefined })
    // 200 VMs * 16 GB / 512 GB = ceil(6.25) = 7
    expect(withOverride.ramLimitedCount).toBe(7)
    // 100 VMs * 16 GB / 512 GB = ceil(3.125) = 4
    expect(withoutOverride.ramLimitedCount).toBe(4)
  })

  it('Disk-limited count uses targetVmCount, not cluster.totalVms', () => {
    const cluster = { totalVcpus: 1000, totalPcores: 200, totalVms: 100, totalDiskGb: 0 }
    const scenario = {
      ...defaultScenario,
      targetVmCount: 200,
      diskPerVmGb: 100,
      diskPerServerGb: 5000,
      headroomPercent: 0,
    }
    const withOverride = computeScenarioResult(cluster, scenario)
    expect(withOverride.diskLimitedCount).toBe(4)  // ceil(200 * 100 / 5000) = 4
  })
})
```

### As-Is Column Rendering (ComparisonTable.tsx)

```tsx
// Source: ComparisonTable.tsx existing pattern — fill in '—' cells

// Row 6: VMs/Server
const asisVmsPerServer =
  currentCluster.existingServerCount && currentCluster.existingServerCount > 0
    ? (currentCluster.totalVms / currentCluster.existingServerCount).toFixed(1)
    : '—'
// Cell: <TableCell className="text-center bg-muted/30">{asisVmsPerServer}</TableCell>

// Row 4: Limiting Resource — replace '—' with 'N/A'
// Row 7: Headroom — replace '—' with 'N/A'

// Row 8: CPU Util % As-Is
// <TableCell className="text-center bg-muted/30">
//   {currentCluster.cpuUtilizationPercent !== undefined
//     ? `${currentCluster.cpuUtilizationPercent.toFixed(1)}%`
//     : '—'}
// </TableCell>

// Row 9: RAM Util % As-Is
// {currentCluster.ramUtilizationPercent !== undefined
//   ? `${currentCluster.ramUtilizationPercent.toFixed(1)}%`
//   : '—'}

// Row 10: Disk As-Is (disaggregated mode only)
// {layoutMode === 'disaggregated'
//   ? currentCluster.totalDiskGb
//     ? `${Math.round(currentCluster.totalDiskGb).toLocaleString()} GB`
//     : '—'
//   : '—'}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Global ESX host read | Need: per-cluster ESX host read | Phase 16 (this work) | Scoping a cluster filter now returns correct server config |
| "Copy from first scope" ESX aggregation | Need: sum additive fields, representative+warning for others | Phase 16 | "All" scope shows accurate total pCores and server count |
| `—` in As-Is cells | Need: real computed/imported values + `N/A` for non-applicable | Phase 16 | As-Is column becomes a meaningful comparison baseline |

## Open Questions

1. **Does the LiveOptics VMs sheet include a host assignment column?**
   - What we know: LiveOptics definitely has a Cluster column on VMs. A host column may or may
     not exist depending on export template version.
   - What's unclear: The exact column alias for "host per VM" in LiveOptics exports.
   - Recommendation: Add aliases such as `['ESX Host', 'Host Name', 'Host']` to
     `LIVEOPTICS_ALIASES`. If absent, fall back to checking whether ESX Hosts sheet itself
     has a Cluster column (the simpler join path). If neither path is available, use the global
     fallback with FIX-SCOPE-05 warning.

2. **Do RVTools vHost columns for sockets/cores use MB or GB for memory?**
   - What we know: RVTools vHost "Memory Size" is historically in MB.
   - What's unclear: Whether recent RVTools versions changed units.
   - Recommendation: Parse as MB by default (consistent with historical RVTools behavior);
     add a comment explaining the unit assumption.

3. **Is FIX-VM-01/02 a code bug or a test-coverage gap?**
   - What we know: Reading `constraints.ts`, `effectiveVmCount` IS passed to both
     `serverCountByRam` and `serverCountByDisk`. The code appears correct.
   - What's unclear: Whether there is an edge case the GH issue describes that is not visible
     from reading the code alone.
   - Recommendation: Write the tests first. If tests pass without code changes, the "fix" is
     the test coverage itself. If tests fail, the code has a subtle bug that the tests expose.

## Sources

### Primary (HIGH confidence)
- Direct code inspection of `/src/lib/utils/import/liveopticParser.ts` — current ESX Hosts
  parsing behavior verified (global read, not per-scope)
- Direct code inspection of `/src/lib/utils/import/rvtoolsParser.ts` — vHost parsing
  behavior verified (model + frequency only, no sockets/cores/RAM)
- Direct code inspection of `/src/lib/utils/import/scopeAggregator.ts` — "copy from first"
  ESX field merging verified
- Direct code inspection of `/src/lib/sizing/constraints.ts` — `effectiveVmCount` usage
  in RAM and disk formulas verified
- Direct code inspection of `/src/components/step3/ComparisonTable.tsx` — `—` in As-Is cells
  confirmed; data sources available in `currentCluster` confirmed
- Direct code inspection of `/src/lib/utils/import/index.ts` — `ScopeData` type verified to
  already include all optional ESX fields

### Secondary (MEDIUM confidence)
- LiveOptics XLSX format knowledge from existing aliases and test fixtures — column names
  (e.g., `Cluster`, `Host Name`, `CPU Sockets`) inferred from `LIVEOPTICS_ESX_HOSTS_ALIASES`
- RVTools vHost format knowledge from `RVTOOLS_VHOST_ALIASES` and `RVTOOLS_ALIASES` patterns

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — no new dependencies; existing project stack
- Architecture: HIGH — all affected files identified, patterns extracted from existing code
- VM Override fix: HIGH (code); MEDIUM (whether it's a code bug or test gap — needs test execution)
- Import Scoping fix: HIGH — gap clearly identified; join strategy depends on LiveOptics column availability
- As-Is Column fix: HIGH — purely presentational; all data already in store
- RVTools scoping: MEDIUM — vHost column aliases for sockets/cores need verification against real export samples

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable internal codebase)
