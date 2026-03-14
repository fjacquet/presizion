# Feature Research — v2.0 vSAN-Aware Sizing Engine

**Researched:** 2026-03-14
**Confidence:** MEDIUM-HIGH

## vSAN Storage Formulas (Verified Constants)

### FTT Multipliers (raw = usable x multiplier)

| Policy | FTT | Multiplier | Min Nodes |
|--------|-----|-----------|-----------|
| Mirror (RAID-1) | 1 | 2.0x | 3 |
| Mirror (RAID-1) | 2 | 3.0x | 5 |
| Mirror (RAID-1) | 3 | 4.0x | 7 |
| RAID-5 (3+1) | 1 | 1.33x | 4 |
| RAID-6 (4+2) | 2 | 1.50x | 6 |

### Storage Pipeline (6 ordered steps)

```
rawRequired = usableRequired * fttMultiplier
rawRequired += vmSwapOverhead (optional, default OFF — sparse swap assumed)
rawRequired += vsanMetadata (2% of usable)
totalWithSlack = rawRequired / (1 - slackPercent/100)  // default 25%
totalWithHA = totalWithSlack + (totalWithSlack / nodeCount)  // 1 host worth
rawPerNode = totalWithHA / nodeCount
```

If compression/dedup enabled: `usableRequired = usableRequired / compressionFactor`

### Compression/Dedup Tiers

| Tier | Ratio | Savings | Note |
|------|-------|---------|------|
| None | 1.0:1 | 0% | Default |
| Pessimistic | 1.3:1 | 23% | Safe for unknown workloads |
| Conservative | 1.5:1 | 33% | Recommended planning default |
| Moderate | 2.0:1 | 50% | Known compressible data |
| Optimistic | 3.0:1 | 66% | High dedup (VDI, clones) |

### vSAN Overhead Constants

| Overhead | Value | Note |
|----------|-------|------|
| ESA CPU overhead | 10% | Universal planning constant |
| OSA CPU overhead | 10% | Same as ESA for planning |
| vSAN memory per host | 6-16 GB | Configurable (6 GB ESA default, 10 GB OSA, 16 GB ESA heavy) |
| Slack space | 25% | vSAN operations reserve (resyncs, policy changes) |
| VM metadata | ~2% | vSAN object metadata |
| VM swap | 0% default | Sparse swap assumed; toggle to add 100% of VM RAM |

## Capacity Breakdown Table (Standard Rows)

### CPU Breakdown
| Row | Formula |
|-----|---------|
| General Purpose VMs | sum(vCPU demand across all VMs) as GHz |
| vSAN Consumption | totalCoresConfigured * esaCpuOverhead% |
| **Required** | VMs + vSAN |
| Reserved (Max Util) | Required / maxUtilPercent * (1 - maxUtilPercent) |
| High Availability | 1 host worth of CPU capacity |
| **Spare** | Reserved + HA |
| Excess | Total - Required - Spare |
| **Total Configured** | nodes * coresPerNode * ghzPerCore |

### Memory Breakdown
| Row | Formula |
|-----|---------|
| General Purpose VMs | sum(VM memory) |
| vSAN Consumption | nodes * vsanMemoryPerHostGb |
| **Required** | VMs + vSAN |
| Reserved (Max Util) | Required / maxUtilPercent * (1 - maxUtilPercent) |
| High Availability | 1 host worth of memory |
| **Spare** | Reserved + HA |
| Excess | Total - Required - Spare |
| **Total Configured** | nodes * ramPerNodeGb |

### Storage Breakdown
| Row | Formula |
|-----|---------|
| General Purpose VMs | sum(VM usable storage) |
| Swap Space | optional: sum(VM RAM) if swap enabled |
| VM Overhead | ~2% metadata |
| Fault Tolerance (FTT) | usable * (fttMultiplier - 1) |
| **Required (Raw)** | VMs + swap + overhead + FTT |
| Slack Space | rawRequired * slackPercent / (1 - slackPercent) |
| High Availability | 1 host worth of raw storage |
| **Spare** | Slack + HA |
| Excess | Total - Required - Spare |
| **Total Configured** | nodes * rawStoragePerNode |

## Growth Projections

Per-resource growth factors applied to DEMAND (pre-computation, not post):
- `effectiveCpuGhz = baseCpuGhz * (1 + cpuGrowth/100)`
- `effectiveMemoryGb = baseMemoryGb * (1 + memGrowth/100)`
- `effectiveStorageTib = baseStorageTib * (1 + storageGrowth/100)`

Applied BEFORE overhead calculations, not after.

## Feature Priority

### Table Stakes (must have for v2.0)
- FTT policy selection with correct multipliers
- Raw vs Usable storage distinction
- Capacity breakdown tables (CPU, Memory, Storage)
- vSAN overhead deduction (CPU 10%, memory per-host)
- Slack space (25% default)
- Stacked capacity bar charts

### Differentiators
- Growth projections per resource
- Compression/dedup factor
- Min nodes per constraint chart
- Professional PDF report

### Anti-features (avoid)
- IOPS performance modeling (requires vendor-specific perf data we don't have)
- Hardware SKU catalog (maintenance burden, stays out of scope)
- Disk group / cache tier configuration (too VxRail-specific)

## Build Order Recommendation

1. vSAN formula engine (constants + storage pipeline) — math before UI
2. Wire into constraints.ts (replace/extend CALC-03)
3. Capacity breakdown computation + types
4. Scenario form extension (FTT, compression, slack, growth)
5. Capacity breakdown table UI
6. Stacked capacity charts + min-nodes chart
7. Growth projections
8. PDF report export
