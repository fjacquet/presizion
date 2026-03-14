# Pitfalls Research — v2.0 vSAN-Aware Sizing Engine

**Researched:** 2026-03-14
**Confidence:** HIGH

## Critical Pitfalls

### V-1: Wrong FTT Multipliers
- **Risk:** Using 1.5x for RAID-5 instead of 1.33x, or 2.0x for RAID-6 instead of 1.5x
- **Prevention:** Hardcode as constants in vsanConstants.ts, unit test each value
- **Phase:** 18 (formula engine)

### V-2: HA Reserve Double-Counting
- **Risk:** Adding HA reserve to BOTH compute AND storage, when compute HA (N+1 server) already includes that server's storage
- **Prevention:** Compute HA is on server count; storage HA is on raw capacity (1/N of cluster raw). These are different things — both are correct
- **Phase:** 18-19

### V-3: Compression Applied After FTT
- **Risk:** Applying dedup savings to raw (post-FTT) instead of usable (pre-FTT). This massively overstates savings
- **Prevention:** Pipeline: usable / compressionFactor THEN * fttMultiplier. Test with known values
- **Phase:** 18

### V-4: Missing Slack Space
- **Risk:** Forgetting the 25% slack, producing raw numbers that look right but leave no room for vSAN operations
- **Prevention:** Make slack a non-removable step in the pipeline (can be set to 0 but defaults to 25)
- **Phase:** 18

### V-5: Unit Confusion (TiB vs TB)
- **Risk:** 1 TiB = 1.0995 TB. Mixing them silently creates ~10% sizing errors
- **Decision needed:** Use GiB internally everywhere. Display with unit labels
- **Prevention:** Single unit convention decided BEFORE coding. Add ADR
- **Phase:** 18 (day 1 decision)

## Capacity Breakdown Pitfalls

### B-1: Required + Spare != Total
- **Risk:** Forgetting "Excess" row. Required + Spare + Excess = Total
- **Prevention:** Compute Excess as Total - Required - Spare. Add invariant test
- **Phase:** 19

### B-2: Max Utilization Reserve Applied to Total
- **Risk:** Computing reserved = total * (1 - maxUtil%) instead of reserved = required / maxUtil% * (1 - maxUtil%)
- **Prevention:** Reserve is based on REQUIRED demand, not total configured
- **Phase:** 19

## Growth Projection Pitfalls

### G-1: Compound vs Linear
- **Risk:** 20% growth for 3 years: compound = 1.728x, linear = 1.6x. Big difference
- **Prevention:** Use compound by default (1 + rate)^years. Document the formula
- **Phase:** 20

### G-2: Growth Applied After Overhead
- **Risk:** Growing the total (including vSAN overhead) instead of growing the demand, then recalculating overhead
- **Prevention:** Growth applied to demand inputs BEFORE overhead calculation
- **Phase:** 20

## PDF Export Pitfalls

### P-1: SVG Charts Blank in PDF
- **Risk:** Recharts SVG animations cause blank output when captured mid-render
- **Prevention:** Use existing downloadChartPng approach (SVG -> canvas -> PNG data URL), embed as image
- **Phase:** 22

### P-2: Large PDFs Crash Browser
- **Risk:** html2canvas max canvas size is 384 MB. Multiple full-page screenshots crash tabs
- **Prevention:** Use jsPDF programmatic tables (jspdf-autotable), NOT html2canvas for tables. Only use canvas for chart images
- **Phase:** 22

## State Management Pitfalls

### S-1: Store Proliferation
- **Risk:** Adding new stores for vSAN config breaks Reset, localStorage, URL hash
- **Prevention:** Extend Scenario with optional fields. No new stores. Reset already clears scenarios
- **Phase:** 19

### S-2: Breaking Derive-on-Read
- **Risk:** Caching VsanCapacityBreakdown in a store creates stale data
- **Prevention:** New useVsanBreakdowns() hook computes on every render, same as useScenariosResults
- **Phase:** 19

### S-3: New Fields Break Old localStorage
- **Risk:** v1.x localStorage has Scenario without vSAN fields. Zod parse fails, session lost
- **Prevention:** All new Scenario fields must be optional with defaults. Zod schema uses .optional() + .default()
- **Phase:** 19

## Testing Pitfalls

### T-1: Floating-Point Precision
- **Risk:** `expect(result).toBe(167.89)` fails due to floating-point
- **Prevention:** Use `toBeCloseTo(expected, precision)` for all storage/capacity assertions
- **Phase:** 18

### T-2: Edge Cases Missing
- **Risk:** Not testing FTT=0 (no protection), 0 VMs, 100% compression, 0% growth
- **Prevention:** Explicit edge case test suite for every formula
- **Phase:** 18

## Pre-Implementation Decision Checklist

- [ ] Unit convention: GiB internally, display with labels (ADR needed)
- [ ] vSAN mode: per-scenario (via optional Scenario fields) or global toggle?
- [ ] Growth model: compound (recommended) or linear?
- [ ] Swap overhead: default OFF (sparse swap assumed)
- [ ] PDF approach: jsPDF + jspdf-autotable (confirmed by stack research)
