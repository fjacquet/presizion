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

## v2 Requirements

### Persistence

- **PERS-01**: App saves last-used inputs to localStorage and restores them on next visit
- **PERS-02**: User can share a URL that encodes current session state (hash-based)

### Enhanced Export

- **EXPO-03**: User can download a JSON file containing all inputs and outputs (for future re-import)
- **EXPO-04**: App provides a print-optimized layout for producing a PDF hardcopy

### UI Enhancements

- **UI-01**: App supports an explicit light/dark mode toggle (manual override beyond OS preference)

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

**Coverage:**

- v1 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0

---
*Requirements defined: 2026-03-12*
*Last updated: 2026-03-12 after roadmap creation — all 27 requirements mapped*
