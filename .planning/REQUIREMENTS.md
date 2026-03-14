# Requirements — v1.4 Bug Fixes, Chart Polish & UX

*Defined: 2026-03-14*

## Bug Fixes — Import Scoping (FIX-SCOPE)

- **FIX-SCOPE-01**: LiveOptics ESX host config (RAM/server, sockets, cores/socket, pCores, server count, CPU/RAM util) must be scoped per cluster, not read from first host row globally (GH #4)
- **FIX-SCOPE-02**: Per-scope ScopeData must include host config fields — switching cluster filter updates both VM aggregates AND host config (GH #4)
- **FIX-SCOPE-03**: "All" scope aggregates host config across all clusters (total pCores = sum, server count = total hosts, RAM/server = representative value with warning if heterogeneous) (GH #4)
- **FIX-SCOPE-04**: ESX Performance data (CPU/RAM utilization) must also be scoped per cluster (GH #4)
- **FIX-SCOPE-05**: Fallback when no cluster column on ESX Hosts — use global behavior with warning about potential inaccuracy (GH #4)
- **FIX-SCOPE-06**: Audit RVTools parser (vHost sheet) for the same scoping gap and fix if present (GH #4)

## Bug Fixes — VM Override (FIX-VM)

- **FIX-VM-01**: When targetVmCount overrides the VM count, RAM-limited formula must use the overridden count, not the original totalVms (GH #7)
- **FIX-VM-02**: When targetVmCount overrides the VM count, Disk-limited formula must use the overridden count, not the original totalVms (GH #7)

## Bug Fixes — As-Is Column (FIX-ASIS)

- **FIX-ASIS-01**: As-Is column in Step 3 shows VMs/Server computed as totalVms / existingServerCount (GH #9)
- **FIX-ASIS-02**: As-Is column shows CPU Util % and RAM Util % from imported ESX Performance data (GH #9)
- **FIX-ASIS-03**: As-Is column shows Total Disk Required from imported totalDiskGb (GH #9)
- **FIX-ASIS-04**: Metrics that don't apply to As-Is show "N/A" rather than "—" (GH #9)

## Chart Polish (CHART)

- **CHART-04**: All charts include a legend mapping scenario names to bar colors (GH #8)
- **CHART-05**: Data values displayed on top of each bar (server count, core count) (GH #8)
- **CHART-06**: CoreCountChart (Total Physical Cores) is downloadable as PNG (GH #8)
- **CHART-07**: Professional color palette replacing default Recharts colors (GH #8)

## SPECrate UX (SPEC)

- **SPEC-06**: In SPECrate mode, sockets/server and cores/socket are auto-derived from benchmark metadata when available (GH #6)
- **SPEC-07**: Auto-derived socket/core fields are read-only in SPECrate mode (GH #6)
- **SPEC-08**: Switching back to vCPU mode re-enables manual entry for socket/core fields (GH #6)
- **SPEC-09**: If benchmark metadata lacks socket/core info, fall back to manual entry with a warning (GH #6)

## SPECrate Lookup (SPEC-LINK)

- **SPEC-LINK-01**: Detected CPU model from import is displayed in Step 1 form (GH #5)
- **SPEC-LINK-02**: A "Look up SPECrate" link opens the SPEC results search page in a new tab, pre-populated with the detected CPU model (GH #5)
- **SPEC-LINK-03**: If no CPU model detected, the lookup link is hidden (GH #5)

## Reset (RESET)

- **RESET-01**: A Reset button is visible from any wizard step (GH #10)
- **RESET-02**: Clicking Reset shows a confirmation dialog before clearing data (GH #10)
- **RESET-03**: Reset clears all stores (cluster, scenarios, wizard, import) and localStorage session data (GH #10)
- **RESET-04**: After reset, user lands on Step 1 with a blank form (GH #10)

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FIX-SCOPE-01 | Phase 16 | Pending |
| FIX-SCOPE-02 | Phase 16 | Pending |
| FIX-SCOPE-03 | Phase 16 | Pending |
| FIX-SCOPE-04 | Phase 16 | Pending |
| FIX-SCOPE-05 | Phase 16 | Pending |
| FIX-SCOPE-06 | Phase 16 | Pending |
| FIX-VM-01 | Phase 16 | Pending |
| FIX-VM-02 | Phase 16 | Pending |
| FIX-ASIS-01 | Phase 16 | Pending |
| FIX-ASIS-02 | Phase 16 | Pending |
| FIX-ASIS-03 | Phase 16 | Pending |
| FIX-ASIS-04 | Phase 16 | Pending |
| CHART-04 | Phase 17 | Pending |
| CHART-05 | Phase 17 | Pending |
| CHART-06 | Phase 17 | Pending |
| CHART-07 | Phase 17 | Pending |
| SPEC-06 | Phase 17 | Pending |
| SPEC-07 | Phase 17 | Pending |
| SPEC-08 | Phase 17 | Pending |
| SPEC-09 | Phase 17 | Pending |
| SPEC-LINK-01 | Phase 17 | Pending |
| SPEC-LINK-02 | Phase 17 | Pending |
| SPEC-LINK-03 | Phase 17 | Pending |
| RESET-01 | Phase 17 | Pending |
| RESET-02 | Phase 17 | Pending |
| RESET-03 | Phase 17 | Pending |
| RESET-04 | Phase 17 | Pending |
