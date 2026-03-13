# Requirements: Cluster Refresh Sizing Tool

**Defined:** 2026-03-12
**Core Value:** The sizing math must be correct — given the same inputs, the tool must produce server counts that match a reference spreadsheet, with transparent formulas behind every number.

## v1 Requirements

### Input (Current Cluster)

- [x] **INPUT-01**: User can enter average VM configuration (vCPUs per VM, RAM GB per VM, disk GB per VM)
- [x] **INPUT-02**: User can enter cluster totals (total vCPUs, total pCores, total VMs, total disk GB)
- [x] **INPUT-03**: User can enter existing server configuration (sockets per server, cores per socket, RAM per server GB, optional server count)
- [x] **INPUT-04**: App auto-calculates and displays derived metrics: vCPU:pCore ratio (user-overridable), total cores per server, VMs/server by CPU and by RAM
- [x] **INPUT-05**: All numeric inputs validate non-negative values with inline error messages; user cannot advance without valid required fields

### Scenarios (Target Configuration)

- [x] **SCEN-01**: User can define any number of target scenarios, each with a name, server configuration, and sizing assumptions
- [x] **SCEN-02**: Each scenario's server config includes: sockets per server, cores per socket (auto-calculates total cores), RAM per server GB, usable disk per server GB
- [x] **SCEN-03**: Each scenario's sizing assumptions include: target vCPU:pCore ratio, RAM per VM GB, disk per VM GB, growth headroom %, N+1 HA reserve toggle
- [x] **SCEN-04**: All sizing assumptions pre-filled with editable industry defaults (4:1 vCPU:pCore, 20% headroom, N+1 off)
- [x] **SCEN-05**: User can duplicate an existing scenario to quickly create a variant

### Sizing Calculations

- [x] **CALC-01**: App calculates CPU-limited server count: `ceil((totalVcpus × headroom) / targetVcpuToPCoreRatio / coresPerServer)`
- [x] **CALC-02**: App calculates RAM-limited server count: `ceil((totalVms × ramPerVmGb × headroom) / ramPerServerGb)`
- [x] **CALC-03**: App calculates disk-limited server count: `ceil((totalVms × diskPerVmGb × headroom) / diskPerServerGb)`
- [x] **CALC-04**: When N+1 HA reserve is enabled, app adds 1 to the final server count after constraint resolution
- [x] **CALC-05**: App identifies the final server count (max of CPU/RAM/disk constraints) and clearly labels the limiting resource
- [x] **CALC-06**: App computes achieved vCPU:pCore ratio, VMs per server, and estimated CPU/RAM/disk utilization percentages for each scenario
- [x] **CALC-07**: Each key output value displays its formula and the specific input parameters used, inline in the UI

### Comparison

- [x] **COMP-01**: App displays a side-by-side comparison table for all defined scenarios
- [x] **COMP-02**: Comparison table includes: scenario name, final server count, limiting resource, vCPU:pCore ratio, VMs/server, headroom %, estimated CPU/RAM/disk utilization

### Export

- [x] **EXPO-01**: User can copy a plain-text summary to clipboard — includes current cluster inputs, key assumptions, and results per scenario; suitable for pasting into email or slides
- [x] **EXPO-02**: User can download a CSV file containing all input fields and output metrics for all scenarios

### UX & Wizard

- [x] **UX-01**: App presents a 3-step wizard: Step 1 (Enter Current Cluster) → Step 2 (Define Scenarios) → Step 3 (Review & Export)
- [x] **UX-02**: Navigation to the next step is blocked until required inputs on the current step are valid
- [x] **UX-03**: Key fields display inline tooltips/info icons explaining the field's meaning and typical acceptable ranges
- [x] **UX-04**: App provides color-coded visual indicators (green/amber/red) for utilization levels and highlights the bottleneck resource per scenario
- [x] **UX-05**: App warns user before navigating away from the page with unsaved data (beforeunload event)

### Deployment

- [x] **DEPLOY-01**: App builds as pure static assets (Vite) with correct `base` path configuration for GitHub Pages deployment
- [x] **UX-06**: App respects the user's OS dark-mode preference (`prefers-color-scheme`); all text, backgrounds, borders, and utilization color indicators render correctly in both light and dark mode

## v1.1 Requirements

### Performance (SPECint Sizing Mode)

- [x] **PERF-01**: User can select a global sizing mode: vCPU-based (default) or SPECint-based (mutually exclusive toggle)
- [x] **PERF-02**: In SPECint mode, Step 1 shows an additional field: SPECint benchmark score for the existing server model
- [x] **PERF-03**: In SPECint mode, each scenario shows an additional field: SPECint benchmark score for the target server model
- [x] **PERF-04**: In SPECint mode the CPU constraint uses `ceil(existingServers × oldSPECint × headroom / targetSPECint)`; RAM and disk formulas are unchanged
- [x] **PERF-05**: The limiting resource label shows "SPECint" when SPECint mode is active and that constraint drives the final server count

### Utilization (Right-Sizing)

- [x] **UTIL-01**: User can enter observed current CPU utilization % (0–100) for the existing cluster in Step 1
- [x] **UTIL-02**: User can enter observed current RAM utilization % (0–100) for the existing cluster in Step 1
- [x] **UTIL-03**: When utilization % values are provided, the CPU and RAM sizing formulas multiply the effective demand by utilization% — sizing to actual consumption rather than installed capacity

### Enhanced Export

- [x] **EXPO-03**: User can download a JSON file containing all inputs and outputs for all scenarios
- [x] **EXPO-04**: App provides a print-optimized stylesheet; browser print / Save as PDF produces a clean layout of the Step 3 results

### Report Clarity

- [x] **REPT-01**: Step 3 comparison table includes an "As-Is" reference column showing current cluster: server count, sockets × cores per server, total pCores (derived or entered), and observed vCPU:pCore ratio — giving the report a clear before/after shape
- [x] **REPT-02**: `existingServerCount` appears in Step 1 "Existing Server Config" section unconditionally (not hidden behind SPECint mode); `totalPcores` becomes optional and is derived automatically when server count + sockets + cores/socket are all provided

## v2 Requirements

### Persistence

- **PERS-01**: App saves last-used inputs to localStorage and restores them on next visit
- **PERS-02**: User can share a URL that encodes current session state (hash-based)

### UI Enhancements

- **UI-01**: App supports an explicit light/dark mode toggle (manual override beyond OS preference)

### File Import (v1.2)

- [x] **IMPORT-01**: User can upload a LiveOptics zip file; app parses it and auto-fills Step 1 cluster inputs
- [x] **IMPORT-02**: User can upload an RVTools xlsx file; app parses it and auto-fills Step 1 cluster inputs

### Charts (v1.2)

- [x] **CHART-01**: Step 3 displays a bar chart comparing server counts (CPU/RAM/disk-limited) across all defined scenarios
- [x] **CHART-02**: Chart shows per-constraint breakdown (CPU/RAM/disk or SPECint-limited) per scenario; SPECint label shown when sizingMode is specint
- [x] **CHART-03**: User can download the chart as a PNG file for use in external reports

### Tech Debt Fixes (v1.2)

- [x] **TD-01**: Step 2 CPU formula display string shows utilization factor (× N%) when CPU utilization % is entered
- [x] **TD-02**: In SPECint mode, Step 2 results panel shows only the SPECint-limited row (no duplicate CPU-limited row)
- [x] **TD-03**: Dead code `src/lib/display/formulaStrings.ts` removed from codebase; canonical display module is `src/lib/sizing/display.ts`

## Out of Scope

| Feature | Reason |
|---------|--------|
| Pre-defined server SKU library | Avoids maintaining a hardware catalog; user-input only keeps the tool vendor-neutral |
| Backend, API, auth, or user accounts | Client-side only by design; no server infrastructure |
| TCO/ROI or pricing/BOM calculations | Capacity sizing only in v1 |
| Per-VM-level workload modeling | Aggregate-based calculations only |
| vCenter, CloudIQ, or external system integration | No backend to proxy requests |
| PWA / offline capability | Basic static hosting is sufficient |
| Localization / i18n | English only for v1 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INPUT-01 | Phase 2 | Complete |
| INPUT-02 | Phase 2 | Complete |
| INPUT-03 | Phase 2 | Complete |
| INPUT-04 | Phase 2 | Complete |
| INPUT-05 | Phase 2 | Complete |
| SCEN-01 | Phase 2 | Complete |
| SCEN-02 | Phase 2 | Complete |
| SCEN-03 | Phase 2 | Complete |
| SCEN-04 | Phase 2 | Complete |
| SCEN-05 | Phase 2 | Complete |
| CALC-01 | Phase 1 | Complete |
| CALC-02 | Phase 1 | Complete |
| CALC-03 | Phase 1 | Complete |
| CALC-04 | Phase 1 | Complete |
| CALC-05 | Phase 1 | Complete |
| CALC-06 | Phase 1 | Complete |
| CALC-07 | Phase 1 | Complete |
| COMP-01 | Phase 3 | Complete |
| COMP-02 | Phase 3 | Complete |
| EXPO-01 | Phase 3 | Complete |
| EXPO-02 | Phase 3 | Complete |
| UX-01 | Phase 2 | Complete |
| UX-02 | Phase 2 | Complete |
| UX-03 | Phase 2 | Complete |
| UX-04 | Phase 3 | Complete |
| UX-05 | Phase 3 | Complete |
| DEPLOY-01 | Phase 4 | Complete |
| UX-06 | Phase 4 | Complete |

**v1.0 Coverage:**

- v1 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0 ✓

**v1.1 Coverage:**

| Requirement | Phase | Status |
|-------------|-------|--------|
| PERF-01 | Phase 5 | Complete |
| PERF-02 | Phase 6 | Complete |
| PERF-03 | Phase 6 | Complete |
| PERF-04 | Phase 5 | Complete |
| PERF-05 | Phase 5 | Complete |
| UTIL-01 | Phase 5 | Complete |
| UTIL-02 | Phase 5 | Complete |
| UTIL-03 | Phase 5 | Complete |
| EXPO-03 | Phase 7 | Complete |
| EXPO-04 | Phase 7 | Complete |
| REPT-01 | Phase 7 | Complete |
| REPT-02 | Phase 7 | Complete |

- v1.1 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0 ✓

**v1.2 Coverage:**

| Requirement | Phase | Status |
|-------------|-------|--------|
| IMPORT-01 | Phase 10 | Complete |
| IMPORT-02 | Phase 10 | Complete |
| CHART-01 | Phase 9 | Complete |
| CHART-02 | Phase 9 | Complete |
| CHART-03 | Phase 9 | Complete |
| TD-01 | Phase 8 | Complete |
| TD-02 | Phase 8 | Complete |
| TD-03 | Phase 8 | Complete |

- v1.2 requirements: 8 total
- Mapped to phases: 8
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-12*
*Last updated: 2026-03-13 after v1.2 sprint — 8 requirements assigned to phases 8-10*
