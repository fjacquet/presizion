# Requirements: Cluster Refresh Sizing Tool

**Defined:** 2026-03-12
**Core Value:** The sizing math must be correct — given the same inputs, the tool must produce server counts that match a reference spreadsheet, with transparent formulas behind every number.

## v1 Requirements

### Input (Current Cluster)

- [ ] **INPUT-01**: User can enter average VM configuration (vCPUs per VM, RAM GB per VM, disk GB per VM)
- [ ] **INPUT-02**: User can enter cluster totals (total vCPUs, total pCores, total VMs, total disk GB)
- [ ] **INPUT-03**: User can enter existing server configuration (sockets per server, cores per socket, RAM per server GB, optional server count)
- [ ] **INPUT-04**: App auto-calculates and displays derived metrics: vCPU:pCore ratio (user-overridable), total cores per server, VMs/server by CPU and by RAM
- [ ] **INPUT-05**: All numeric inputs validate non-negative values with inline error messages; user cannot advance without valid required fields

### Scenarios (Target Configuration)

- [ ] **SCEN-01**: User can define any number of target scenarios, each with a name, server configuration, and sizing assumptions
- [ ] **SCEN-02**: Each scenario's server config includes: sockets per server, cores per socket (auto-calculates total cores), RAM per server GB, usable disk per server GB
- [ ] **SCEN-03**: Each scenario's sizing assumptions include: target vCPU:pCore ratio, RAM per VM GB, disk per VM GB, growth headroom %, N+1 HA reserve toggle
- [ ] **SCEN-04**: All sizing assumptions pre-filled with editable industry defaults (4:1 vCPU:pCore, 20% headroom, N+1 off)
- [ ] **SCEN-05**: User can duplicate an existing scenario to quickly create a variant

### Sizing Calculations

- [ ] **CALC-01**: App calculates CPU-limited server count: `ceil((totalVcpus × headroom) / targetVcpuToPCoreRatio / coresPerServer)`
- [ ] **CALC-02**: App calculates RAM-limited server count: `ceil((totalVms × ramPerVmGb × headroom) / ramPerServerGb)`
- [ ] **CALC-03**: App calculates disk-limited server count: `ceil((totalVms × diskPerVmGb × headroom) / diskPerServerGb)`
- [ ] **CALC-04**: When N+1 HA reserve is enabled, app adds 1 to the final server count after constraint resolution
- [ ] **CALC-05**: App identifies the final server count (max of CPU/RAM/disk constraints) and clearly labels the limiting resource
- [ ] **CALC-06**: App computes achieved vCPU:pCore ratio, VMs per server, and estimated CPU/RAM/disk utilization percentages for each scenario
- [ ] **CALC-07**: Each key output value displays its formula and the specific input parameters used, inline in the UI

### Comparison

- [ ] **COMP-01**: App displays a side-by-side comparison table for all defined scenarios
- [ ] **COMP-02**: Comparison table includes: scenario name, final server count, limiting resource, vCPU:pCore ratio, VMs/server, headroom %, estimated CPU/RAM/disk utilization

### Export

- [ ] **EXPO-01**: User can copy a plain-text summary to clipboard — includes current cluster inputs, key assumptions, and results per scenario; suitable for pasting into email or slides
- [ ] **EXPO-02**: User can download a CSV file containing all input fields and output metrics for all scenarios

### UX & Wizard

- [ ] **UX-01**: App presents a 3-step wizard: Step 1 (Enter Current Cluster) → Step 2 (Define Scenarios) → Step 3 (Review & Export)
- [ ] **UX-02**: Navigation to the next step is blocked until required inputs on the current step are valid
- [ ] **UX-03**: Key fields display inline tooltips/info icons explaining the field's meaning and typical acceptable ranges
- [ ] **UX-04**: App provides color-coded visual indicators (green/amber/red) for utilization levels and highlights the bottleneck resource per scenario
- [ ] **UX-05**: App warns user before navigating away from the page with unsaved data (beforeunload event)

### Deployment

- [ ] **DEPLOY-01**: App builds as pure static assets (Vite) with correct `base` path configuration for GitHub Pages deployment

## v2 Requirements

### Persistence

- **PERS-01**: App saves last-used inputs to localStorage and restores them on next visit
- **PERS-02**: User can share a URL that encodes current session state (hash-based)

### Enhanced Export

- **EXPO-03**: User can download a JSON file containing all inputs and outputs (for future re-import)
- **EXPO-04**: App provides a print-optimized layout for producing a PDF hardcopy

### UI Enhancements

- **UI-01**: App supports light/dark mode toggle

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
| INPUT-01 | — | Pending |
| INPUT-02 | — | Pending |
| INPUT-03 | — | Pending |
| INPUT-04 | — | Pending |
| INPUT-05 | — | Pending |
| SCEN-01 | — | Pending |
| SCEN-02 | — | Pending |
| SCEN-03 | — | Pending |
| SCEN-04 | — | Pending |
| SCEN-05 | — | Pending |
| CALC-01 | — | Pending |
| CALC-02 | — | Pending |
| CALC-03 | — | Pending |
| CALC-04 | — | Pending |
| CALC-05 | — | Pending |
| CALC-06 | — | Pending |
| CALC-07 | — | Pending |
| COMP-01 | — | Pending |
| COMP-02 | — | Pending |
| EXPO-01 | — | Pending |
| EXPO-02 | — | Pending |
| UX-01 | — | Pending |
| UX-02 | — | Pending |
| UX-03 | — | Pending |
| UX-04 | — | Pending |
| UX-05 | — | Pending |
| DEPLOY-01 | — | Pending |

**Coverage:**
- v1 requirements: 27 total
- Mapped to phases: 0
- Unmapped: 27 ⚠️ (populated by roadmapper)

---
*Requirements defined: 2026-03-12*
*Last updated: 2026-03-12 after initial definition*
