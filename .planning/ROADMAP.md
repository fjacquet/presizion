# Roadmap: Cluster Refresh Sizing Tool

## Milestones

- ✅ **v1.2 — Visualization, File Import & Tech Debt** — Phases 1-10 (shipped 2026-03-13)
- ✅ **v1.3 — Scope, Persistence & Branding** — Phases 11-15 (shipped 2026-03-14)
- 🔧 **v1.4 — Bug Fixes, Chart Polish & UX** — Phases 16-17 (in progress)

## Phases

<details>
<summary>✅ v1.2 — Visualization, File Import & Tech Debt (Phases 1-10) — SHIPPED 2026-03-13</summary>

Full details: `.planning/milestones/v1.2-ROADMAP.md`

- [x] Phase 1: Foundation (4/4 plans) — completed 2026-03-12
- [x] Phase 2: Input Forms (4/4 plans) — completed 2026-03-12
- [x] Phase 3: Comparison, Export, and Wizard Shell (3/3 plans) — completed 2026-03-12
- [x] Phase 4: Deployment and Polish (4/4 plans) — completed 2026-03-12
- [x] Phase 5: SPECint and Utilization Formula Engine (3/3 plans) — completed 2026-03-13
- [x] Phase 6: Conditional UI Wiring (2/2 plans) — completed 2026-03-13
- [x] Phase 7: Enhanced Export and As-Is/To-Be Report (3/3 plans) — completed 2026-03-13
- [x] Phase 8: v1.2 Planning Backfill (1/1 plan) — completed 2026-03-13
- [x] Phase 9: v1.2 Charts (2/2 plans) — completed 2026-03-13
- [x] Phase 10: v1.2 File Import (3/3 plans) — completed 2026-03-13

</details>

<details>
<summary>✅ v1.3 — Scope, Persistence & Branding (Phases 11-15) — SHIPPED 2026-03-14</summary>

Full details: `.planning/milestones/v1.3-ROADMAP.md`

- [x] Phase 11: Branding & Tech Debt (2/2 plans) — completed 2026-03-13
- [x] Phase 12: Dark Mode Toggle (2/2 plans) — completed 2026-03-13
- [x] Phase 13: Import Scope Filter (2/2 plans) — completed 2026-03-13
- [x] Phase 14: Persistent Scope Widget (2/2 plans) — completed 2026-03-13
- [x] Phase 15: Persistence (2/2 plans) — completed 2026-03-14

</details>

### v1.4 — Bug Fixes, Chart Polish & UX (Phases 16-17)

#### Phase 16: Bug Fixes — Import Scoping, VM Override & As-Is Column

**Goal:** Fix all data-integrity bugs that produce incorrect sizing results.

**Requirements:** FIX-SCOPE-01..06, FIX-VM-01..02, FIX-ASIS-01..04 (12 requirements)

**Plans:** 2/2 plans complete

Plans:
- [x] 16-01-PLAN.md — Import scope fixes: per-cluster ESX host config, performance scoping, aggregation fix
- [x] 16-02-PLAN.md — VM override test coverage and As-Is column rendering

**Plan 01 — Import Scope Fixes (FIX-SCOPE-01..06)**
- Refactor LiveOptics parser: scope ESX host config per cluster (join hosts to clusters via Cluster column or Host-to-Cluster mapping from VMs sheet)
- Per-scope ScopeData includes host config fields (ramPerServerGb, socketsPerServer, coresPerSocket, totalPcores, existingServerCount, cpuUtilizationPercent, ramUtilizationPercent)
- "All" scope aggregation: sum pCores, total hosts, representative RAM/server with heterogeneity warning
- ESX Performance data (CPU/RAM util) scoped per cluster
- Fallback when no cluster column: global behavior + warning
- Audit + fix RVTools vHost parser for same scoping gap
- Tests: per-scope host config, "All" aggregation, heterogeneous RAM warning, fallback

**Plan 02 — VM Override & As-Is Column (FIX-VM-01..02, FIX-ASIS-01..04)**
- Fix constraints.ts: when targetVmCount overrides VM count, pass overridden count to RAM-limited and Disk-limited formulas (not just CPU)
- Complete As-Is column in ComparisonTable: VMs/Server, CPU Util %, RAM Util %, Total Disk Required
- Metrics not applicable to As-Is show "N/A" instead of "---"
- Tests: VM override propagation to all 3 formulas, As-Is column rendering

---

#### Phase 17: Chart Polish, SPECrate UX & Reset Button

**Goal:** Polish charts for presentation quality, improve SPECrate workflow, add reset capability.

**Requirements:** CHART-04..07, SPEC-06..09, SPEC-LINK-01..03, RESET-01..04 (14 requirements)

**Plans:** 3/3 plans complete

Plans:
- [ ] 17-01-PLAN.md — Chart polish: legends, data labels, professional colors, CoreCountChart PNG download
- [ ] 17-02-PLAN.md — SPECrate UX: read-only socket/core fields in specint mode, lookup link
- [ ] 17-03-PLAN.md — Reset button with confirmation dialog

**Plan 01 — Chart Polish (CHART-04..07)**
- Add legends to SizingChart and CoreCountChart (scenario name + color)
- Display data values on top of each bar
- Fix CoreCountChart PNG download (same SVG-to-canvas approach as SizingChart)
- Professional color palette replacing default Recharts colors
- Tests: legend rendered, data labels present, download trigger

**Plan 02 — SPECrate UX & Lookup Link (SPEC-06..09, SPEC-LINK-01..03)**
- In SPECrate mode: auto-derive sockets/server and cores/socket from benchmark metadata
- Make socket/core fields read-only when benchmark provides them; re-enable on mode switch back
- Fallback to manual entry with warning when benchmark metadata incomplete
- Display detected CPU model in Step 1; add "Look up SPECrate" link to SPEC results page (new tab)
- Hide lookup link when no CPU model detected
- Tests: auto-derive behavior, read-only toggle, link rendering, fallback

**Plan 03 — Reset Button (RESET-01..04)**
- Add Reset button to WizardShell header (visible from all steps)
- Confirmation dialog ("Are you sure? All data will be lost.")
- Reset clears all stores (cluster, scenarios, wizard, import, theme preference preserved) and localStorage session
- After reset: navigate to Step 1 with blank form
- Tests: button visibility, confirmation dialog, store clearing, navigation

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 4/4 | Complete | 2026-03-12 |
| 2. Input Forms | v1.0 | 4/4 | Complete | 2026-03-12 |
| 3. Comparison, Export, and Wizard Shell | v1.0 | 3/3 | Complete | 2026-03-12 |
| 4. Deployment and Polish | v1.0 | 4/4 | Complete | 2026-03-12 |
| 5. SPECint and Utilization Formula Engine | v1.1 | 3/3 | Complete | 2026-03-13 |
| 6. Conditional UI Wiring | v1.1 | 2/2 | Complete | 2026-03-13 |
| 7. Enhanced Export and As-Is/To-Be Report | v1.1 | 3/3 | Complete | 2026-03-13 |
| 8. v1.2 Planning Backfill | v1.2 | 1/1 | Complete | 2026-03-13 |
| 9. v1.2 Charts | v1.2 | 2/2 | Complete | 2026-03-13 |
| 10. v1.2 File Import | v1.2 | 3/3 | Complete | 2026-03-13 |
| 11. Branding & Tech Debt | v1.3 | 2/2 | Complete | 2026-03-13 |
| 12. Dark Mode Toggle | v1.3 | 2/2 | Complete | 2026-03-13 |
| 13. Import Scope Filter | v1.3 | 2/2 | Complete | 2026-03-13 |
| 14. Persistent Scope Widget | v1.3 | 2/2 | Complete | 2026-03-13 |
| 15. Persistence | v1.3 | 2/2 | Complete | 2026-03-14 |
| 16. Bug Fixes — Import Scoping, VM Override & As-Is | v1.4 | 2/2 | Complete | 2026-03-14 |
| 17. Chart Polish, SPECrate UX & Reset | 3/3 | Complete    | 2026-03-14 | — |
