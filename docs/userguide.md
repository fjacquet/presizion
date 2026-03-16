# Presizion — User Guide

**Audience:** Presales engineers and solution architects sizing a VMware cluster refresh.

---

## What Presizion does

Presizion answers one question: **"How many new servers do we need for this cluster refresh?"**

You supply existing cluster metrics, define one or more target server configurations, and the tool instantly shows how many servers each configuration requires — broken down by CPU, RAM, and disk constraints — so you can compare options side-by-side.

Everything runs in the browser. No data is sent anywhere.

---

## Quick start (under 5 minutes)

### Step 1 — Enter your current cluster

You need at least these three numbers (from vCenter, RVTools, LiveOptics, or a customer spreadsheet):

| Field | Where to find it |
|-------|-----------------|
| **Total vCPUs** | vCenter Summary → cluster → total allocated vCPUs; or RVTools `vInfo` sheet sum |
| **Total pCores** | Spec sheet: sockets × cores/socket × number of servers; or LiveOptics ESX Hosts sheet |
| **Total VMs** | vCenter → powered-on VM count; or RVTools row count |

Optional but recommended:

- **Total Disk GB** — enables disk-constrained sizing
- **Existing server count + sockets + cores/socket** — enables SPECrate2017 mode and auto-derives pCores
- **CPU % / RAM % utilization** — enables right-sizing to actual consumption

Click **Next: Define Scenarios** when the required fields are filled.

> **Tip:** Import a RVTools, LiveOptics, or JSON file to auto-fill all fields. See [File Import](#file-import).

---

### Step 2 — Define target scenarios

Each scenario card represents one server model you're evaluating. Fill in:

**Target Server Config:**

- Sockets/Server and Cores/Socket — from the vendor spec sheet (use physical cores, not hyperthreaded)
- RAM/Server GB and Disk/Server GB — from the server configuration

**Sizing Assumptions:**

- **vCPU:pCore Ratio** — how many virtual CPUs per physical core. Start with 4:1 (VMware general-purpose default). Use 2:1 for CPU-intensive or database workloads.
- **RAM/VM GB** — average RAM per VM. Auto-filled from import if available; otherwise check vCenter → Monitor → Memory.
- **Disk/VM GB** — average provisioned disk per VM. Auto-filled when Total Disk and Total VMs are provided.
- **Headroom %** — growth and spike buffer. 20% is standard (cluster runs at ~80% utilization).
- **N+1 HA Reserve** — adds one extra server for host failure tolerance. Recommended for production.

Results appear immediately below each card. Add more scenarios with the **Add Scenario** button.

---

### Step 3 — Review and export

The comparison table shows all scenarios side-by-side with the existing cluster (As-Is) as a baseline:

| Column | What it shows |
|--------|---------------|
| **Servers Required** | Final server count for this scenario |
| **Server Config** | Sockets × cores (e.g., 2s × 16c) |
| **Total pCores** | Physical cores in the new cluster |
| **Limiting Resource** | Which constraint drove the server count |
| **vCPU:pCore Ratio** | Achieved ratio with this server count |
| **VMs/Server** | Average VM density |
| **Avg vCPU/VM** | Average vCPU count per VM |
| **Avg RAM/VM (GiB)** | Average RAM per VM (As-Is from import, To-Be from scenario assumption) |
| **Avg Disk/VM (GiB)** | Average disk per VM (As-Is from import, To-Be from scenario assumption) |
| **Headroom** | Configured headroom % |
| **CPU/RAM/Disk Util %** | Projected utilization (green < 70%, amber < 90%, red ≥ 90%) |

**Export options:**

- **Copy Summary** — Markdown text for email or presentation slides
- **Download CSV** — all inputs and outputs in a spreadsheet-compatible format
- **Download JSON** — complete session (can be re-imported later)
- **Export PDF** — professional multi-page report with title page, KPI callouts, As-Is/To-Be comparison, capacity breakdowns, and chart images
- **Export PPTX** — PowerPoint presentation with semantic slide masters, dark navy cover, per-scenario chart slides with legends and absolute values tables
- **Download PNG** — individual chart images with legends and data tables
- **Share** — encodes full session as base64url hash in the URL
- **Print** — browser Print dialog for paper output

**Capacity breakdown charts (v2.0+):**

- **Stacked Capacity Chart** — normalized to 100% width showing Required/Spare/Excess per resource (CPU GHz, Memory GiB, Raw Storage TiB, Usable Storage TiB)
- **Min Nodes per Constraint** — horizontal bar chart identifying the binding constraint (CPU, Memory, Storage, FT&HA, VMs)

**vSAN settings (v2.0+):**

Each scenario can optionally include vSAN-aware storage sizing via the collapsible "vSAN & Growth" section:
- **FTT Policy** — Mirror FTT=1/2/3, RAID-5 (3+1), RAID-6 (4+2)
- **Compression/Dedup** — None, Pessimistic (1.3:1), Conservative (1.5:1), Moderate (2:1), Optimistic (3:1)
- **Slack Space** — vSAN operations reserve (default 25%)
- **CPU/Memory Overhead** — vSAN system overhead deducted from available capacity
- **Growth Projections** — per-resource compound growth (CPU %, Memory %, Storage %)

**SPEC search (v2.2+):**

When a CPU model is detected from import, Presizion auto-fetches SPECrate2017 results from the spec-search API. Click a result to auto-fill the SPECint score. Also available for target CPU in Step 2 via a search field. In vCPU mode (v2.3+), selecting a SPEC result also auto-fills sockets/server and cores/socket.

**Average VM metrics in reports (v2.3+):**

The As-Is vs To-Be comparison table in PDF and PPTX exports now includes Avg vCPU/VM, Avg RAM/VM (GiB), and Avg Disk/VM (GiB) — matching the derived metrics shown in the Step 1 UI.

---

## File import

The **Import from file** button in Step 1 accepts four formats:

### RVTools xlsx

Export from RVTools → File → Export All to xlsx. Presizion reads the `vInfo` sheet for VM inventory (vCPUs, disk, VM count). Server configuration must be entered manually or derived from the existing server spec.

### LiveOptics xlsx (single file)

From a LiveOptics VMWARE export file. Presizion reads:

- **VMs sheet** — VM inventory (vCPUs, disk, count)
- **ESX Hosts sheet** — server count, sockets, cores/socket, RAM/server
- **ESX Performance sheet** — average CPU % and RAM % utilization across hosts

### LiveOptics ZIP

Upload the full LiveOptics ZIP export. Presizion selects the richest XLSX inside (the VMWARE file with ESX Hosts data, not the GENERAL or AIR files).

### Presizion JSON

Re-import a previously downloaded JSON file to restore a complete session: current cluster data and all scenario configurations.

> **After import:** An Import Preview modal shows the extracted data. Click **Apply** to populate Step 1. All existing scenario cards will automatically inherit the derived `RAM/VM GB` and `Disk/VM GB` values from the imported cluster.

---

## Sizing modes

### vCPU mode (default)

CPU constraint based on the vCPU:pCore oversubscription ratio:

```
CPU-limited servers = ceil((totalVcpus × headroomFactor) / vcpuToPcoreRatio / coresPerServer)
```

Use this for like-for-like refreshes or when you don't have SPECrate2017 scores.

**CPU lookup (v2.3+):** In Step 2, the "Look up target CPU" field lets you search for a CPU model in the spec-search database. Selecting a result auto-fills sockets/server and cores/socket from the benchmark data.

### SPECrate2017 mode

CPU constraint based on performance equivalence between old and new server generations:

```
CPU-limited servers = ceil(existingServers × oldSPECrate2017_int_base × headroomFactor / targetSPECrate2017_int_base)
```

Use this when migrating to a significantly different server generation where raw core counts are misleading (e.g., Xeon v4 → Xeon 6). A modern 32-core server may outperform an older 48-core server — SPECrate captures this.

**Finding SPECrate2017_int_base scores:**

1. Go to [spec.org/cpu2017/results/](https://www.spec.org/cpu2017/results/)
2. Filter by "Integer Rate" and search for your server model
3. Use the `SPECrate2017_int_base` column (not peak; not speed)

The default target score (337) corresponds to a Dell PowerEdge R660 with 2× Intel Xeon Gold 6526Y.

> **Important:** Both the existing server score and the target server score must be `SPECrate2017_int_base` — the same metric. Do not mix 2006 and 2017 scores.

---

## Right-sizing with utilization

If your existing cluster is running at, say, 65% CPU utilization, you're only using 65% of its compute capacity. Without utilization data, Presizion sizes for 100% replacement — which over-provisions by 35%.

To right-size, enter the current average utilization percentages in Step 1:

- **CPU Utilization %** — average CPU % across the cluster. From vCenter Performance → Cluster, or LiveOptics import.
- **RAM Utilization %** — average RAM % across the cluster.

When provided, the formulas scale demand accordingly:

```
CPU-limited servers = ceil(totalVcpus × cpuUtil% × headroomFactor / ratio / coresPerServer)
```

The formula string in Step 2 results shows the utilization factor so you can verify the math.

---

## Typical workflow example

**Situation:** A customer has a 20-server VMware cluster (Dell R640, 2× Xeon Gold 6230, 40 cores/server). They're running at 70% CPU and want to refresh to Dell R660 with 2× Xeon Gold 6526Y.

1. Import the LiveOptics ZIP → fills in: totalVcpus, totalPcores, totalVms, server count/config, CPU util 70%
2. Switch to **SPECrate2017 mode**
3. Enter existing SPECrate2017_int_base for R640/6230 (find on spec.org, e.g., ~220)
4. Step 2 auto-fills with default scenario: Dell R660, 2× Xeon Gold 6526Y, score 337
5. Results: `ceil(20 × 220 × 1.20 / 337) = ceil(15.7) = 16 servers`
6. Step 3 → compare against a second scenario with a larger server (e.g., R760) → export

---

## Formula reference

| Constraint | Formula |
|-----------|---------|
| CPU-limited (vCPU mode) | `ceil(totalVcpus × [utilPct%] × headroom% / vcpuToPcoreRatio / coresPerServer)` |
| CPU-limited (SPECrate mode) | `ceil(existingServers × oldScore × headroom% / targetScore)` |
| RAM-limited | `ceil(totalVms × ramPerVmGb × headroom% / ramPerServerGb)` |
| Disk-limited | `ceil(totalVms × diskPerVmGb × headroom% / diskPerServerGb)` |
| Final count | `max(CPU, RAM, Disk)` + 1 if N+1 HA enabled |
| headroom% | `1 + headroomPercent/100` (e.g., 20% → 1.20) |

---

## Common questions

**Why does the tool show more servers than expected?**

Check the limiting resource in Step 2. If it's RAM-limited, the RAM/VM GB or RAM/Server GB values are driving the count — verify that RAM/VM GB reflects your actual average VM RAM, not the maximum.

**My pCores field is showing 0 after import.**

LiveOptics GENERAL files (single-cluster exports without ESX Hosts sheet) don't contain server hardware data. Fill in `Sockets/Server` and `Cores/Socket` manually and Presizion will auto-derive `Total pCores` from `existingServerCount × socketsPerServer × coresPerSocket`.

**Can I compare more than two scenarios?**

Yes — click **Add Scenario** as many times as needed. All scenarios appear as tabs in Step 2 and columns in the Step 3 table.

**How do I save my work?**

Use **Download JSON** in Step 3. The JSON file contains all inputs and scenarios and can be re-imported later to restore the exact session.

**The SPECrate2017 mode is greyed out / not changing anything.**

SPECrate2017 mode requires three values: `Existing Server Count`, `SPECrate2017_int_base / Server (existing)` in Step 1, and `SPECrate2017_int_base / Server (target)` in the scenario card. If any of these are blank, the mode toggle is available but the formula falls back gracefully.
