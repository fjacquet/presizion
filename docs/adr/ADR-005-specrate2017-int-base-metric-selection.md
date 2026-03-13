# ADR-005: SPECrate2017_int_base as the Performance Sizing Metric

**Date:** 2026-03-13
**Status:** Accepted
**Milestone:** v1.1

## Context

ADR-001 decided that a performance-based sizing mode should exist as an alternative to vCPU-ratio sizing. It referred to this mode as "SPECint" without specifying which exact SPEC CPU metric to use.

SPEC CPU 2017 (the current benchmark suite) publishes four distinct metrics:

| Metric | Type | What it measures |
|--------|------|-----------------|
| `SPECspeed2017_int_base` | Speed | Single-threaded integer performance (1 copy) |
| `SPECspeed2017_fp_base` | Speed | Single-threaded floating-point performance (1 copy) |
| `SPECrate2017_int_base` | Rate | Throughput integer performance (N simultaneous copies) |
| `SPECrate2017_fp_base` | Rate | Throughput floating-point performance (N simultaneous copies) |

The legacy label "SPECint" refers to the **retired SPEC CPU 2006** suite (`SPECint2006`). Scores from 2006 and 2017 are not comparable — a server might score 50 on SPECint2006 and 330 on SPECrate2017_int_base. Using the legacy label causes users who search "SPECint" to find 2006 scores, producing 4× sizing errors.

The question was: which SPEC CPU 2017 metric should the tool use, and how should it be labelled?

## Decision

Use **`SPECrate2017_int_base`** as the sizing metric. Label it `SPECrate2017_int_base` in tooltips and `SPECrate2017` in short UI labels.

The default target server is **Dell PowerEdge R660 with 2× Intel Xeon Gold 6526Y** (2 sockets × 16 cores = 32 pCores), with a `SPECrate2017_int_base` score of **337** (measured result from spec.org/cpu2017/results/, res2024q1/cpu2017-20240112-40552).

## Rationale

**Why Rate, not Speed?**

- A cluster hosts many concurrent VMs. The sizing question is "can the new server handle the same aggregate compute throughput as the old servers?" — this is a **throughput** question, not a single-thread latency question.
- `SPECrate` runs N simultaneous benchmark copies (one per core/thread), directly modeling multi-VM workloads.
- `SPECspeed` measures one sequential run; it does not scale with core count and would understate the capacity of modern many-core servers.

**Why Integer, not Floating-Point?**

- Typical VM workloads (web servers, databases, middleware, business applications) are predominantly integer-bound.
- `SPECfp` rates apply to HPC, scientific computing, and simulation — not general virtualization sizing.
- `SPECrate2017_int_base` is the SPEC CPU 2017 equivalent of the old "SPECint" general-purpose metric.

**Why Base, not Peak?**

- `_base` scores use compiler flags that are conservative and comparable across vendors.
- `_peak` scores allow aggressive per-benchmark compiler tuning; they are less reproducible and harder to compare across system generations.
- All vendors must submit `_base`; `_peak` is optional. Using `_base` ensures data is always available for any server model.

**Why not use a different benchmark (PassMark, Geekbench, etc.)?**

- SPEC CPU 2017 is the industry-standard benchmark used by Dell, HPE, Lenovo, and all major server OEMs for server comparisons in the data centre/presales context.
- Results for nearly every server SKU are published at `spec.org/cpu2017/results/`.
- The benchmark methodology is transparent and reproducible.

**Why Dell R660 + Xeon Gold 6526Y as default?**

- This is the current standard 2-socket 1U server in the Dell PowerEdge portfolio (as of 2024–2025).
- 16 cores/socket × 2 sockets = 32 pCores — a representative entry-level 2S configuration.
- The measured score of 337 is an authoritative, verifiable value from spec.org.

## Consequences

- All user-visible "SPECint" labels are renamed to `SPECrate2017_int_base` (tooltips/data model descriptions) or `SPECrate2017` (short UI labels, badges, toggle button).
- Internal code symbols (`specintPerServer`, `targetSpecint`, `sizingMode: 'specint'`) are **not renamed** — renaming touches tests, stores, types, schemas, and JSON export format with no user-facing benefit.
- `DEFAULT_TARGET_SPECINT` in `src/lib/sizing/defaults.ts` is set to **337** (verified from spec.org).
- `createDefaultScenario()` sets `coresPerSocket: 16` (Xeon Gold 6526Y has 16 cores/socket) and `targetSpecint: 337`.
- Tooltips include a reference to `spec.org/cpu2017/results/` so users can look up scores for other server models.
- Existing JSON exports that stored numeric `targetSpecint`/`specintPerServer` values remain valid — only the label changed, not the field names or semantics.
