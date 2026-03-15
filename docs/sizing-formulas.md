# Sizing Formulas Reference

This document is the authoritative reference for every calculation performed by the
Cluster Refresh Sizing tool. All formulas live in `src/lib/sizing/` and are pure
TypeScript functions with no UI dependencies.

---

## Table of Contents

1. [Inputs](#1-inputs)
2. [Derived pre-calculation values](#2-derived-pre-calculation-values)
3. [CALC-01 — CPU-limited server count (vCPU mode)](#3-calc-01--cpu-limited-server-count-vcpu-mode)
4. [CALC-01b — CPU-limited server count (SPECint mode)](#4-calc-01b--cpu-limited-server-count-specint-mode)
5. [CALC-02 — RAM-limited server count](#5-calc-02--ram-limited-server-count)
6. [CALC-03 — Disk-limited server count](#6-calc-03--disk-limited-server-count)
7. [CALC-04 — N+1 HA reserve](#7-calc-04--n1-ha-reserve)
8. [CALC-05 — Final server count and limiting resource](#8-calc-05--final-server-count-and-limiting-resource)
9. [CALC-06 — Result utilization metrics](#9-calc-06--result-utilization-metrics)
10. [End-to-end worked example](#10-end-to-end-worked-example)
11. [Common mistakes](#11-common-mistakes)

---

## 1. Inputs

### Current cluster (Step 1)

| Field | Symbol | Unit | Notes |
|---|---|---|---|
| Total vCPUs | `V` | count | Sum of vCPU reservations across all powered-on VMs |
| Total pCores | `P` | count | Physical cores — spec-sheet cores, NOT hyperthreaded logical CPUs |
| Total VMs | `M` | count | Powered-on VMs only |
| Total Disk GB | `D` | GB | Total provisioned disk across all VMs (optional) |
| CPU Utilization % | `U_cpu` | % | Current average CPU utilization (0–100); absent → 100 |
| RAM Utilization % | `U_ram` | % | Current average RAM utilization (0–100); absent → 100 |

> **Important — vCPUs vs pCores:** `V` is the number of virtual CPUs *assigned* to VMs.
> `P` is the number of physical cores in the existing cluster. They are different quantities.
> A cluster with 36 × 2-socket 20-core servers has `P = 36 × 2 × 20 = 1440` pCores.
> The same cluster might have `V = 2000` vCPUs if VMs are oversubscribed.

### Target scenario (Step 2)

| Field | Symbol | Unit | Notes |
|---|---|---|---|
| Sockets per server | `s` | count | Physical CPU sockets per new server |
| Cores per socket | `c` | count | Spec-sheet cores per socket |
| RAM per server | `R_srv` | GB | Total RAM installed per new server |
| Disk per server | `D_srv` | GB | Total usable storage per new server |
| vCPU:pCore ratio target | `ratio` | — | Hard assignment-density cap (e.g. 4 means ≤ 4 vCPUs per pCore) |
| RAM per VM | `R_vm` | GB | Average RAM allocated per VM in current cluster |
| Disk per VM | `D_vm` | GB | Average provisioned disk per VM in current cluster |
| Headroom % | `H` | % | Growth buffer (e.g. 20 → size for 1.20× current demand) |
| N+1 HA Reserve | `ha` | bool | Add one extra server after sizing |
| Target RAM Util % | `T_ram` | % | Design target steady-state RAM utilization for new cluster (1–100); absent → 100 |
| Target CPU Util % | `T_cpu` | % | Display reference only — does not affect server count (see CALC-06) |
| SPECrate target | `S_new` | score | SPECrate2017_int_base for new server (SPECint mode only) |

---

## 2. Derived pre-calculation values

### Headroom factor

```
headroomFactor = 1 + H / 100
```

Example: `H = 20` → `headroomFactor = 1.20`

Interpretation: size the new cluster to handle 20% more demand than today, leaving
room for VM growth and workload spikes.

### Cores per server

```
coresPerServer = s × c
```

Example: 2 sockets × 32 cores/socket → `coresPerServer = 64`

---

## 3. CALC-01 — CPU-limited server count (vCPU mode)

**File:** `src/lib/sizing/formulas.ts` → `serverCountByCpu()`

```
cpuLimitedCount = ceil( V × headroomFactor / ratio / coresPerServer )
```

### Why `cpuUtilizationPercent` is excluded

The vCPU:pCore ratio is a **hard assignment-density cap**. Even if your CPUs are
currently at 10% utilization, you have still *assigned* `V` vCPUs to your VMs.
Those vCPUs must be provisioned on physical cores within the ratio limit.

Allowing `U_cpu` to reduce the server count would mean ending up with fewer physical
cores than `V / ratio` — violating the ratio constraint the moment all vCPUs become
active simultaneously (e.g. backup window, batch jobs, host failure).

`U_cpu` is recorded in Step 1 and used **only** in CALC-06 (the CPU Util % display
metric). It does not reduce the server count.

### Numeric example

| Input | Value |
|---|---|
| Total vCPUs (`V`) | 1 334 |
| Headroom (`H`) | 20% → factor = 1.20 |
| vCPU:pCore ratio (`ratio`) | 4 |
| Cores per server | 2s × 32c = 64 |

```
cpuLimitedCount = ceil( 1334 × 1.20 / 4 / 64 )
               = ceil( 1600.8 / 256 )
               = ceil( 6.25 )
               = 7 servers  →  7 × 64 = 448 pCores
```

Achieved ratio = 1334 / 448 = **2.98:1** — safely within the 4:1 cap.

If disk demanded only 4 servers (256 pCores), that would give ratio = 1334 / 256 =
5.2:1, **violating** the cap. The CPU constraint wins because it is higher (7 > 4).

---

## 4. CALC-01b — CPU-limited server count (SPECint mode)

**File:** `src/lib/sizing/formulas.ts` → `serverCountBySpecint()`

Used when the sizing mode is set to **SPECrate2017** instead of vCPU ratio.
Switch between modes with the toggle at the top of the wizard.

```
cpuLimitedCount = ceil( existingServers × S_old × headroomFactor / S_new )
```

| Symbol | Meaning |
|---|---|
| `existingServers` | Number of physical servers in the current cluster |
| `S_old` | SPECrate2017_int_base score per existing server |
| `S_new` | SPECrate2017_int_base score per new target server |

### Numeric example

| Input | Value |
|---|---|
| Existing servers | 36 |
| SPECint/server (old) | 250 |
| Headroom | 20% |
| SPECint/server (new) | 500 |

```
cpuLimitedCount = ceil( 36 × 250 × 1.20 / 500 )
               = ceil( 10800 / 500 )
               = ceil( 21.6 )
               = 22 servers
```

---

## 5. CALC-02 — RAM-limited server count

**File:** `src/lib/sizing/formulas.ts` → `serverCountByRam()`

```
ramLimitedCount = ceil( M × R_vm × (U_ram / 100) × headroomFactor
                        / (T_ram / 100)
                        / R_srv )
```

### Two utilization factors explained

**`U_ram` — current RAM utilization (right-sizing factor)**

VMs in most clusters do not consume all of their allocated RAM. If `U_ram = 70%`,
each VM only actively uses 70% of its allocation. RAM can be overcommitted by the
reciprocal: you can effectively serve more VM-RAM than the physical capacity if
utilization is below 100%.

When `U_ram = 100` (the default, "no right-sizing"), the formula sizes for the full
allocated demand with no overcommitment assumption.

**`T_ram` — target RAM utilization for the new cluster (design target)**

Sets the steady-state fill level you want the new cluster to operate at.
`T_ram = 80%` means "when at full headroom load, the cluster RAM should be 80% full".

Setting `T_ram < 100%` increases the server count because you are reserving slack.

When both are at their defaults (`U_ram = 100`, `T_ram = 100`), the formula reduces
to:

```
ramLimitedCount = ceil( M × R_vm × headroomFactor / R_srv )
```

### Numeric example

| Input | Value |
|---|---|
| Total VMs (`M`) | 450 |
| RAM per VM (`R_vm`) | 16 GB |
| RAM utilization (`U_ram`) | 80% |
| Headroom | 20% |
| Target RAM util (`T_ram`) | 100% (default) |
| RAM per server (`R_srv`) | 512 GB |

```
ramLimitedCount = ceil( 450 × 16 × 0.80 × 1.20 / 1.0 / 512 )
               = ceil( 6912 / 512 )
               = ceil( 13.5 )
               = 14 servers
```

---

## 6. CALC-03 — Disk-limited server count

**File:** `src/lib/sizing/formulas.ts` → `serverCountByDisk()`

```
diskLimitedCount = ceil( M × D_vm × headroomFactor / D_srv )
```

Disk has no utilization right-sizing factor. Provisioned disk is a hard allocation —
VMs reserve disk capacity regardless of how much of it is written. The headroom
factor still applies to account for VM growth and new disk-heavy VMs.

### Numeric example

| Input | Value |
|---|---|
| Total VMs (`M`) | 450 |
| Disk per VM (`D_vm`) | 200 GB |
| Headroom | 20% |
| Disk per server (`D_srv`) | 20 000 GB |

```
diskLimitedCount = ceil( 450 × 200 × 1.20 / 20000 )
               = ceil( 108000 / 20000 )
               = ceil( 5.4 )
               = 6 servers
```

---

## 7. CALC-04 — N+1 HA reserve

**File:** `src/lib/sizing/constraints.ts`

```
if ha:
    finalCount = rawCount + 1
else:
    finalCount = rawCount
```

The +1 is added **after** taking the maximum of all three constraints (CALC-05).
It is a flat additional server, not a percentage. The intent is to absorb a single
host failure without breaching the resource constraints of the remaining servers.

---

## 8. CALC-05 — Final server count and limiting resource

**File:** `src/lib/sizing/constraints.ts`

```
rawCount = max( cpuLimitedCount, ramLimitedCount, diskLimitedCount )
```

The cluster must satisfy **all three constraints simultaneously**. The constraint
that produces the highest server count is the binding (limiting) constraint.

### Tie-breaking

When two or more constraints produce the same count, the priority is:

```
CPU (or SPECint) > RAM > Disk
```

### Limiting resource labels

| Value | Display label | Meaning |
|---|---|---|
| `cpu` | CPU-limited | vCPU:pCore ratio cap drove the count |
| `ram` | RAM-limited | RAM capacity drove the count |
| `disk` | Disk-limited | Storage capacity drove the count |
| `specint` | SPECrate2017 | SPECint performance drove the count (SPECint mode) |

### When the limiting resource surprises you

**"Disk-limited but vCPU:pCore ratio looks high"** — If disk is limiting, the
CPU constraint was *not* the highest. This means the achieved vCPU:pCore ratio
(total vCPUs ÷ new pCores) may be lower than the cap, or the data in Step 1 is
lower than expected. Verify that `Total vCPUs` in Step 1 is correct; with correct
data the CPU constraint will produce a higher count when the ratio would be violated.

---

## 9. CALC-06 — Result utilization metrics

**File:** `src/lib/sizing/constraints.ts`

These metrics answer: *"If we deploy `finalCount` servers, how loaded will they be
with the current workload?"* They use `finalCount` as the denominator, not the
individual per-constraint counts.

### Achieved vCPU:pCore ratio

```
achievedVcpuToPCoreRatio = V / ( finalCount × coresPerServer )
```

This is the raw assignment density of the proposed cluster. It should be ≤ `ratio`.
A warning (⚠) appears in the comparison table when it exceeds the target.

### VMs per server

```
vmsPerServer = M / finalCount
```

### CPU Utilization %

```
cpuUtilizationPercent = V × (U_cpu / 100)
                        / ratio
                        / (finalCount × coresPerServer)
                        × 100
```

This answers: *"Given that VMs only use `U_cpu`% of their allocated vCPUs on
average, what fraction of the new cluster's physical cores will actually be busy?"*

**`U_cpu` enters here, not in CALC-01.** The CPU constraint enforces the hard
assignment cap regardless of load; this metric reflects the real-world load.

Example: 1334 vCPUs, `U_cpu = 15%`, ratio = 4, 7 servers × 64 cores = 448 pCores:

```
cpuUtilizationPercent = 1334 × 0.15 / 4 / 448 × 100
                      = 200.1 / 1792 × 100
                      ≈ 11.2%
```

The cluster is CPU-constrained by the ratio cap (7 servers), but the actual physical
CPU load is only 11%. There is substantial headroom for workload spikes.

### RAM Utilization %

```
ramUtilizationPercent = M × R_vm × (U_ram / 100)
                        / (finalCount × R_srv)
                        × 100
```

### Disk Utilization %

```
diskUtilizationPercent = M × D_vm
                         / (finalCount × D_srv)
                         × 100
```

Disk has no utilization input, so this is the raw provisioned fill percentage.

### Relationship between disk util % and headroom

When disk is the limiting constraint, `diskUtilizationPercent` ≈ `100 / headroomFactor`.
For 20% headroom: 100 / 1.20 ≈ **83%** (ceiling rounding may shift it slightly).
This is by design — the cluster is sized so that at current demand, disk is at ~83%,
leaving ~17% headroom before you need to add another server.

---

## 10. End-to-end worked example

### Inputs

| Field | Value |
|---|---|
| Total vCPUs (`V`) | 1 334 |
| Total VMs (`M`) | 450 |
| CPU util (`U_cpu`) | 15% |
| RAM util (`U_ram`) | 80% |
| Headroom (`H`) | 20% → factor 1.20 |
| N+1 HA | disabled |
| Target server | 2s × 32c = 64 cores, 512 GB RAM, 20 000 GB disk |
| vCPU:pCore ratio | 4:1 |
| RAM per VM (`R_vm`) | 16 GB |
| Disk per VM (`D_vm`) | 200 GB |
| Target RAM util (`T_ram`) | 100% |

### Step-by-step

**CALC-01 — CPU**

```
cpuLimitedCount = ceil( 1334 × 1.20 / 4 / 64 )
               = ceil( 6.25 ) = 7
```

**CALC-02 — RAM**

```
ramLimitedCount = ceil( 450 × 16 × 0.80 × 1.20 / 1.0 / 512 )
               = ceil( 6912 / 512 )
               = ceil( 13.5 ) = 14
```

**CALC-03 — Disk**

```
diskLimitedCount = ceil( 450 × 200 × 1.20 / 20000 )
               = ceil( 5.4 ) = 6
```

**CALC-05 — Final count**

```
rawCount = max( 7, 14, 6 ) = 14
finalCount = 14  (no HA)
limitingResource = RAM
```

**CALC-06 — Metrics**

```
achievedVcpuToPCoreRatio = 1334 / (14 × 64) = 1334 / 896 ≈ 1.49  ✓ (< 4)

cpuUtilizationPercent    = 1334 × 0.15 / 4 / 896 × 100 ≈ 5.6%
ramUtilizationPercent    = 450 × 16 × 0.80 / (14 × 512) × 100
                         = 5760 / 7168 × 100 ≈ 80.4%
diskUtilizationPercent   = 450 × 200 / (14 × 20000) × 100
                         = 90000 / 280000 × 100 ≈ 32.1%
```

**Summary table**

| Metric | Value |
|---|---|
| Servers required | 14 |
| Total pCores | 14 × 64 = 896 |
| Limiting resource | RAM |
| vCPU:pCore ratio | 1.49:1 |
| VMs/server | 450 / 14 = 32.1 |
| CPU Util % | 5.6% |
| RAM Util % | 80.4% |
| Disk Util % | 32.1% |

---

## 11. Common mistakes

### "The ratio looks too high despite setting 4:1"

**Cause:** The `Total vCPUs` field in Step 1 is smaller than your actual cluster's
vCPU count. Check Step 1 — the As-Is vCPU:pCore ratio in the comparison table is
`totalVcpus / totalPcores`. If it is below 1 (e.g. 0.3), fewer vCPUs are stored
than physical cores, which is unusual. Typical clusters have ratios of 1–10.

**Fix:** Re-enter or re-import the correct vCPU count (sum of vCPU reservations
across all powered-on VMs, from vCenter cluster summary or RVTools/LiveOptics export).

### "Disk-limited with very few servers, but ratio exceeds target"

**Cause:** With a very small `Total vCPUs` value, the CPU constraint (CALC-01) is
smaller than the disk constraint. Disk wins, and the few servers have more vCPUs
per core than intended.

**Fix:** Same as above — verify the vCPU count.

### "CPU Util % is very low despite being CPU-limited"

This is expected and correct. The cluster is **CPU-limited** because the ratio cap
requires that number of servers to stay within the assignment density.
**CPU Util %** shows the *actual workload load*, which may be well below 100%.
The ratio cap is a design constraint, not a load threshold.

Example: ratio cap requires 7 servers; actual workload only loads them to 12%.
The 88% spare capacity is intentional — it means the workload can grow 8× before
vCPUs need to be migrated or servers added.

### "Headroom ≠ the expected slack in utilization metrics"

Headroom is applied during **sizing** (CALC-01/02/03) to inflate the demand before
dividing by server capacity. The result utilization metrics (CALC-06) use the
*current* demand (no headroom), so they show a number that is approximately
`1 / headroomFactor` of 100%.

For 20% headroom: utilization ≈ `1 / 1.20 ≈ 83%` on the limiting resource.
The remaining ~17% is the reserved growth buffer.
