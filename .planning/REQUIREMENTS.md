# Requirements — v2.0 vSAN-Aware Sizing Engine

*Defined: 2026-03-14*

## vSAN Storage Engine (VSAN)

- **VSAN-01**: User can select a Fault Tolerance policy per scenario: Mirror FTT=1 (2x), Mirror FTT=2 (3x), Mirror FTT=3 (4x), RAID-5 3+1 (1.33x), RAID-6 4+2 (1.5x), or None
- **VSAN-02**: Storage sizing computes Raw from Usable using the selected FTT multiplier: `raw = usable * fttMultiplier`
- **VSAN-03**: Storage pipeline includes vSAN metadata overhead (~2% of usable)
- **VSAN-04**: User can toggle VM swap overhead (default OFF/sparse swap; ON adds 100% of VM RAM to storage)
- **VSAN-05**: User can set vSAN slack space percentage (default 25%) for operations reserve (resyncs, policy changes)
- **VSAN-06**: vSAN CPU overhead (default 10%) is deducted from available CPU capacity per node
- **VSAN-07**: User can set vSAN memory overhead per host in GB (default 6 GB for ESA, configurable)
- **VSAN-08**: Compression/dedup factor is selectable per scenario: None (1.0), Pessimistic (1.3:1), Conservative (1.5:1), Moderate (2:1), Optimistic (3:1)
- **VSAN-09**: Compression is applied to usable demand BEFORE FTT multiplication (not after)
- **VSAN-10**: All storage computations use GiB internally; display converts to TiB for values > 1024 GiB
- **VSAN-11**: FTT policy enforces minimum node count (Mirror FTT=1: 3, FTT=2: 5, FTT=3: 7, RAID-5: 4, RAID-6: 6)
- **VSAN-12**: vSAN settings are per-scenario optional fields (no new store); absent fields use legacy sizing path

## Capacity Breakdown (CAP)

- **CAP-01**: CPU capacity breakdown table shows: VMs Required, vSAN Consumption, Total Required, Reserved (Max Util), HA Reserve, Spare, Excess, Total Configured — in GHz
- **CAP-02**: Memory capacity breakdown table shows: VMs Required, vSAN Consumption, Total Required, Reserved (Max Util), HA Reserve, Spare, Excess, Total Configured — in GiB
- **CAP-03**: Storage capacity breakdown table shows: VMs Usable, Swap, Metadata, FTT Overhead, Total Raw Required, Slack Space, HA Reserve, Spare, Excess, Total Configured — in TiB (Usable + Raw columns)
- **CAP-04**: HA Reserve for CPU/Memory = one host worth of capacity; for storage = 1/N of cluster raw capacity
- **CAP-05**: Max Utilization Reserve = Required / maxUtilPercent * (1 - maxUtilPercent), based on Required demand not Total
- **CAP-06**: Excess = Total Configured - Required - Spare (invariant: Required + Spare + Excess = Total)

## Charts (VIZ)

- **VIZ-01**: Stacked horizontal capacity bar chart shows Required / Spare / Excess with percentage labels for each resource (CPU GHz, Memory GiB, Raw Storage TiB, Usable Storage TiB)
- **VIZ-02**: Min Nodes per Constraint horizontal bar chart shows minimum node count for: CPU, Memory, Storage, FT&HA, VMs — identifying which constraint drives the configuration
- **VIZ-03**: Both new charts are downloadable as PNG
- **VIZ-04**: Charts use the existing CHART_COLORS professional palette

## Growth Projections (GROW)

- **GROW-01**: User can set per-resource growth percentages per scenario: CPU Growth %, Memory Growth %, Storage Growth %
- **GROW-02**: Growth is applied as compound factor to demand inputs BEFORE overhead calculation: `effectiveDemand = baseDemand * (1 + growthPercent / 100)`
- **GROW-03**: Growth fields default to 0% (no growth) and are optional
- **GROW-04**: Growth factors are visible in formula display strings when non-zero

## Scenario Form (FORM)

- **FORM-01**: ScenarioCard includes a collapsible "vSAN & Growth" section (collapsed by default)
- **FORM-02**: vSAN section contains: FTT policy dropdown, Compression factor dropdown, Slack space %, vSAN CPU overhead %, vSAN memory per host GB, VM swap toggle
- **FORM-03**: Growth section contains: CPU Growth %, Memory Growth %, Storage Growth %
- **FORM-04**: vSAN section only visible when layoutMode === 'hci' (hidden in disaggregated mode)

## PDF Report (PDF)

- **PDF-01**: User can export a professional PDF report from Step 3
- **PDF-02**: PDF includes: title page with project info, executive summary table, capacity breakdown tables (CPU/Memory/Storage), stacked capacity chart images, comparison table
- **PDF-03**: PDF is generated client-side using jsPDF + jspdf-autotable (lazy-loaded)
- **PDF-04**: Charts are embedded as PNG images (SVG -> canvas -> data URL)
- **PDF-05**: PDF export button appears alongside existing export buttons in Step 3

## Out of Scope

| Feature | Reason |
|---------|--------|
| IOPS performance modeling | Requires vendor-specific performance data curves we don't have |
| Hardware SKU catalog | Maintenance burden; users define server config manually |
| Disk group / cache tier configuration | Too VxRail-specific; Presizion is vendor-neutral |
| Per-VM workload definitions | Aggregate sizing only; per-VM detail is a different tool category |
| Pricing / BOM | Capacity sizing only |
| vSAN ESA vs OSA distinction | Both use 10% CPU overhead for planning; memory is configurable |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| VSAN-01 | Phase 18 | Pending |
| VSAN-02 | Phase 18 | Pending |
| VSAN-03 | Phase 18 | Pending |
| VSAN-04 | Phase 18 | Pending |
| VSAN-05 | Phase 18 | Pending |
| VSAN-06 | Phase 18 | Pending |
| VSAN-07 | Phase 18 | Pending |
| VSAN-08 | Phase 18 | Pending |
| VSAN-09 | Phase 18 | Pending |
| VSAN-10 | Phase 18 | Pending |
| VSAN-11 | Phase 18 | Pending |
| VSAN-12 | Phase 18 | Pending |
| CAP-01 | Phase 19 | Pending |
| CAP-02 | Phase 19 | Pending |
| CAP-03 | Phase 19 | Pending |
| CAP-04 | Phase 19 | Pending |
| CAP-05 | Phase 19 | Pending |
| CAP-06 | Phase 19 | Pending |
| GROW-01 | Phase 19 | Pending |
| GROW-02 | Phase 19 | Pending |
| GROW-03 | Phase 19 | Pending |
| GROW-04 | Phase 19 | Pending |
| FORM-01 | Phase 20 | Pending |
| FORM-02 | Phase 20 | Pending |
| FORM-03 | Phase 20 | Pending |
| FORM-04 | Phase 20 | Pending |
| VIZ-01 | Phase 21 | Pending |
| VIZ-02 | Phase 21 | Pending |
| VIZ-03 | Phase 21 | Pending |
| VIZ-04 | Phase 21 | Pending |
| PDF-01 | Phase 22 | Pending |
| PDF-02 | Phase 22 | Pending |
| PDF-03 | Phase 22 | Pending |
| PDF-04 | Phase 22 | Pending |
| PDF-05 | Phase 22 | Pending |

**Coverage:**
- v2.0 requirements: 35 total
- Mapped to phases: 35
- Unmapped: 0

---
*Requirements defined: 2026-03-14*
*Traceability updated: 2026-03-14*
