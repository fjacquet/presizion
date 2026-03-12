# Feature Research

**Domain:** Presales infrastructure sizing / cluster refresh capacity planning web app
**Researched:** 2026-03-12
**Confidence:** HIGH (core sizing features verified against multiple production tools; UX patterns from Nutanix Sizer, WintelGuy, vSphere Cluster Calculator, and Dell EIPT)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features a presales sizing tool must have or users will use a spreadsheet instead.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Current environment input form | Presales engineers start from existing metrics (vCPUs, pCores, VMs, RAM, disk) — this is the raw material for every sizing | LOW | Manual entry from Excel exports or RVTools; no integration needed in v1 |
| Derived-metric auto-calculation | Users expect the tool to compute vCPU:pCore ratio, RAM per VM, VMs/server automatically — doing this manually is why they stopped using a spreadsheet | LOW | Recalculate on every input change; target <200ms re-render |
| Target server configuration input | Every tool (WintelGuy, vSphere Calculator, Nutanix Sizer) accepts new server specs: cores per socket, sockets, RAM, disk; without this there is nothing to size against | LOW | Simple form fields: cores/socket, sockets, RAM (GB), disk (TB) per server |
| Server count output per constraint | Core output of any sizing tool: how many servers are needed to satisfy CPU, RAM, and disk independently — the limiting constraint wins | LOW | Show CPU-limited count, RAM-limited count, disk-limited count, and final (max) |
| Limiting-resource identification | Users need to know which constraint drives the server count — CPU-bound vs RAM-bound decisions are different conversations | LOW | Bold / highlight the binding constraint; one-liner callout |
| Per-server utilization output | Presales engineers validate the sizing by checking utilization — an 80% CPU utilization at N servers is the sanity check | LOW | Show projected CPU%, RAM%, disk% utilization per server at the calculated count |
| VM density output | VMs/server is a key metric for the customer slide — "you'll have 30 VMs per node" is immediately legible | LOW | Derived from final server count and total VM count |
| Configurable sizing assumptions | Every tool ships with editable defaults: vCPU:pCore overcommit ratio, RAM headroom %, N+1 HA reserve | MEDIUM | Industry defaults: 4:1 vCPU:pCore, 20% RAM headroom, N+1 HA; all editable per scenario |
| Inline formula display | Presales engineers must defend the numbers in a customer meeting; they cannot explain a black box | MEDIUM | Show formula and input values used for each key output field; tooltip or expandable row |
| Input validation with error messages | Negative values, zero cores, impossible ratios must be caught before producing nonsense output | LOW | Non-negative, range checks on all numeric fields; clear inline messages |
| Side-by-side scenario comparison | Every major sizing tool (Nutanix Sizer, vSphere Calculator) supports comparing multiple configurations; single-scenario tools feel limited | MEDIUM | At least 2 simultaneous scenarios; tabular comparison layout |
| Plain-text summary for copy-paste | Presales output lands in email or slide notes — exporting a formatted text block is the fastest path to a proposal | LOW | Structured text block: inputs, assumptions, outputs per scenario |
| JSON/CSV download | Auditable record of inputs and outputs; enables customers and managers to verify the calculation | LOW | Full export: all inputs, all derived values, all outputs |

### Differentiators (Competitive Advantage)

Features that improve the tool beyond what a spreadsheet or generic online calculator offers.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| N+1 HA-aware server count | Most simple calculators give raw count; HA-aware count (+1 for fault tolerance) is what presales actually quotes — this eliminates a manual adjustment step | LOW | Toggle: include N+1 HA overhead in final server count; show impact on utilization |
| Scenario duplication | "Start from Scenario A and tweak for Scenario B" is the real workflow; without this, engineers manually re-enter the same data | LOW | Clone a scenario with all its values; then edit the clone independently |
| Binding-constraint callout with explanation | Not just highlighting the constraint, but explaining in one sentence why this resource is the bottleneck (e.g., "RAM is limiting because average VM RAM demand exceeds CPU demand at this overcommit ratio") | MEDIUM | Per-scenario advisory text; derive from which constraint produced the highest count |
| Assumption-sensitivity callout | Show how much the server count changes if the vCPU ratio shifts from 4:1 to 6:1 — this supports the "what-if" conversation without requiring a new scenario | HIGH | Sensitivity delta table: for each assumption, show +/- 1 server count change per unit change; deferred to v1.x |
| Shareable URL (state in URL hash) | Presales engineers hand off to a colleague or revisit the calculation days later — no login required, state encoded in the URL | MEDIUM | Encode full app state as base64 JSON in URL fragment; no server needed |
| Printable / PDF-ready layout | Customer-facing output is often printed or attached as PDF; a clean single-page layout removes the screenshot-and-crop step | MEDIUM | @media print CSS; hide input form, show results only; proper page breaks |
| Growth buffer input | "Size for 18 months of growth" is a standard ask; a dedicated field for projected VM growth % makes this calculation explicit rather than ad-hoc | LOW | Percentage growth slider/field; apply to VM count before sizing math |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem valuable but create maintenance burden, scope creep, or design conflicts for this tool.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Pre-defined server SKU catalog | "Can I just pick a PowerEdge R760?" feels convenient | Hardware catalogs go stale within months; maintaining SKU data across vendors is a part-time job; also kills the "works for any vendor" positioning | Users enter specs manually; keep a "common configs" hint (e.g., "typical 2-socket: 32 cores, 512 GB RAM") as non-editable examples in the UI copy |
| TCO / pricing / BOM output | Customers always ask "how much does this cost?" | Price data changes constantly; regional pricing, contracts, and discounts make any published number wrong; TCO modeling is a different product category | Scope to capacity sizing only; note in UI "for pricing, use your vendor configurator (e.g., Dell Quote Tool)" |
| Per-VM-level workload modeling | "What if I separate VMs by tier?" sounds more accurate | Aggregate sizing with industry-standard headroom already accounts for mixed workloads; per-VM modeling requires data the presales engineer doesn't have and adds 10x complexity | Support aggregate inputs (averages and totals); document the assumption clearly |
| Backend user accounts / saved sessions | "I want to log in and find my old sizing" | Turns a static tool into a web app requiring auth, storage, GDPR compliance, infra costs, and session management — none of which are justified for a single-user presales workflow | Offer JSON download for persistence; implement localStorage in v1.1 as a no-auth alternative |
| Real-time vCenter / CloudIQ integration | "Pull data directly from the environment" sounds powerful | Integration requires API credentials, network access, CORS handling, and versioning across vCenter releases; the presales engineer usually doesn't have production vCenter access anyway | Accept manual input from RVTools CSV exports or slide summaries; document the copy-paste path |
| Multi-user collaboration | "Can my team see my sizing?" | Real-time collaboration requires WebSockets or a backend; conflicts with static deployment | Shareable URL (URL hash state) is sufficient for presales handoff without any backend |
| AI-generated sizing recommendations | "Can AI suggest the right server config?" | AI recommendations for infrastructure sizing require validated models, domain-specific training data, and explainability — hallucinated server counts in a customer proposal are high-stakes failures | Rule-based math with transparent formulas is safer and auditable; AI can be added later as an overlay, not a replacement |
| Localization / i18n | "Our team is in France" | Adds string management overhead and delays every content change; target audience is English-speaking presales engineers in English-language accounts | English only for v1; i18n framework can be scaffolded later without rework if the string extraction is clean |

---

## Feature Dependencies

```
[Current Env Input Form]
    └──requires──> [Derived Metric Auto-Calculation]
                       └──requires──> [Server Count Output per Constraint]
                                          └──requires──> [Limiting-Resource Identification]
                                          └──requires──> [Per-Server Utilization Output]
                                          └──requires──> [VM Density Output]

[Configurable Sizing Assumptions]
    └──feeds──> [Server Count Output per Constraint]
    └──feeds──> [Per-Server Utilization Output]

[Target Server Config Input]
    └──requires──> [Server Count Output per Constraint]

[Side-by-Side Scenario Comparison]
    └──requires──> [Target Server Config Input] (at least 2 instances)
    └──requires──> [Server Count Output per Constraint]
    └──enhances──> [Limiting-Resource Identification]

[Scenario Duplication]
    └──requires──> [Side-by-Side Scenario Comparison]

[Inline Formula Display]
    └──requires──> [Server Count Output per Constraint]
    └──enhances──> [Per-Server Utilization Output]

[Plain-Text Summary]
    └──requires──> [Server Count Output per Constraint]
    └──requires──> [Side-by-Side Scenario Comparison]

[JSON/CSV Download]
    └──requires──> [Current Env Input Form]
    └──requires──> [Server Count Output per Constraint]

[N+1 HA-Aware Server Count]
    └──requires──> [Server Count Output per Constraint]
    └──enhances──> [Configurable Sizing Assumptions]

[Growth Buffer Input]
    └──requires──> [Current Env Input Form]
    └──feeds──> [Derived Metric Auto-Calculation]

[Shareable URL]
    └──requires──> ALL input state (current env + all scenarios + assumptions)
    └──conflicts──> [Backend User Accounts] (URL hash replaces need for accounts)

[Printable Layout]
    └──requires──> [Side-by-Side Scenario Comparison]
    └──enhances──> [Plain-Text Summary]
```

### Dependency Notes

- **Server Count requires Sizing Assumptions:** The overcommit ratio and headroom % are parameters in every server-count formula; assumptions must exist before count can be calculated.
- **Side-by-Side Comparison requires at least 2 scenario instances:** The UI must support multiple independent instances of the Target Server Config + Assumptions form; this is an architectural choice made early.
- **Scenario Duplication enhances Side-by-Side Comparison:** Duplication is only useful if the tool supports multiple scenarios; it is a UI convenience on top of an already-working multi-scenario model.
- **Shareable URL conflicts with Backend User Accounts:** If URL hash encodes all state, there is no need for accounts; implementing both creates confusion about the canonical persistence model.
- **Growth Buffer feeds into Derived Metrics:** Growth % is applied to VM count before the sizing ratios run; it is a pre-processing step, not a post-processing adjustment.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — the tool must be able to replace the reference spreadsheet for a standard cluster refresh sizing.

- [x] Current environment input (VM count, avg vCPUs/VM, avg RAM/VM, disk total, existing server config) — without this, there is nothing to size
- [x] Configurable sizing assumptions (vCPU:pCore ratio, RAM headroom %, disk headroom %) with industry defaults — required for any calculation
- [x] Target server config input (cores/socket, sockets, RAM, disk) — required per scenario
- [x] Server count per constraint (CPU-limited, RAM-limited, disk-limited) with final max — core output
- [x] Limiting-resource identification (which constraint drives the count) — required for presales narrative
- [x] Per-server utilization and VM density at the final server count — sanity check output
- [x] Inline formula display for each key output — presales engineers must defend numbers
- [x] Input validation with inline error messages — prevents nonsense output
- [x] At least 2 simultaneous scenarios with side-by-side comparison — single-scenario sizing is a spreadsheet
- [x] Scenario duplication — reduces re-entry friction for "Scenario A variant"
- [x] Plain-text summary for copy-paste — gets output into a slide or email
- [x] JSON/CSV download — auditable record

### Add After Validation (v1.x)

Features to add once the core sizing math is validated with real presales engineers.

- [ ] N+1 HA-aware server count toggle — add when engineers report manually adding 1 to every result
- [ ] Growth buffer input (% VM growth over N months) — add when engineers report doing this arithmetic separately
- [ ] localStorage persistence — add when engineers report losing work between browser sessions
- [ ] Shareable URL (state in URL hash) — add when engineers report needing to hand off a sizing to a colleague
- [ ] Printable / PDF-ready layout — add when engineers report screenshotting results

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Assumption-sensitivity delta table — complex to build and explain; validate that presales engineers actually run what-if on assumptions before building
- [ ] More than 3 simultaneous scenarios — validate that 2-3 is sufficient before adding complexity
- [ ] Workload profile presets (VDI-heavy, DB-heavy, general) — would ship default assumption sets; validate use case frequency first
- [ ] Dark mode / theming — not a presales workflow problem

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Current environment input form | HIGH | LOW | P1 |
| Derived metric auto-calculation | HIGH | LOW | P1 |
| Target server config input | HIGH | LOW | P1 |
| Server count per constraint | HIGH | LOW | P1 |
| Limiting-resource identification | HIGH | LOW | P1 |
| Per-server utilization + VM density | HIGH | LOW | P1 |
| Configurable sizing assumptions with defaults | HIGH | MEDIUM | P1 |
| Inline formula display | HIGH | MEDIUM | P1 |
| Input validation + error messages | HIGH | LOW | P1 |
| Side-by-side scenario comparison | HIGH | MEDIUM | P1 |
| Scenario duplication | MEDIUM | LOW | P1 |
| Plain-text summary (copy-paste) | HIGH | LOW | P1 |
| JSON/CSV download | MEDIUM | LOW | P1 |
| N+1 HA-aware server count | HIGH | LOW | P2 |
| Growth buffer input | MEDIUM | LOW | P2 |
| localStorage persistence | MEDIUM | LOW | P2 |
| Shareable URL (hash state) | MEDIUM | MEDIUM | P2 |
| Printable / PDF-ready layout | MEDIUM | LOW | P2 |
| Assumption-sensitivity delta table | MEDIUM | HIGH | P3 |
| Workload profile presets | LOW | MEDIUM | P3 |

**Priority key:**

- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | Nutanix Sizer | WintelGuy vmcalc | vSphere Community Calculator | Our Approach |
|---------|---------------|-------------------|------------------------------|--------------|
| Manual input (no integration required) | Yes (plus Collector import) | Yes | Yes | Yes — manual only in v1 |
| Multiple simultaneous scenarios | Yes | No (single scenario) | No (single scenario) | Yes — core differentiator |
| Vendor hardware SKU catalog | Yes (full Nutanix catalog) | No | No | No — users enter specs manually |
| Formula / methodology transparency | Partial (utilization shown) | Partial (ratios shown) | Minimal | Full — formula + inputs shown for every output |
| Export to PDF | Yes | No | No | CSS print layout in v1.x |
| Export to CSV/JSON | No (XML) | No | No | Yes — JSON and CSV in v1 |
| Copy-paste text summary | No | No | No | Yes — differentiator |
| N+1 HA server count | Yes | Yes (N and N+1 both shown) | No | Yes — v1 or v1.x toggle |
| Configurable overcommit ratio | Limited | Yes | Yes | Yes — fully editable |
| Configurable headroom % | Yes | Yes | Yes | Yes — fully editable |
| Growth projection | Yes | No | No | v1.x |
| Scenario duplication | No | No | No | Yes — differentiator |
| Static / no login required | No (login required) | Yes | Yes | Yes — GitHub Pages, zero auth |
| Shareable URL | No | No | No | v1.x — differentiator |

**Key insight:** The primary gap in the competitive landscape is formula transparency (users trust the tool), multi-scenario comparison with cloning, and a copy-paste-ready text output. These three together serve the presales workflow better than any existing tool. Nutanix Sizer is the closest competitive reference but requires a Nutanix account, is locked to Nutanix hardware, and lacks the copy-paste workflow output.

---

## Sources

- Nutanix Sizer product page: <https://www.nutanix.com/products/sizer>
- Nutanix sizing and capacity planning blog: <https://www.nutanix.com/tech-center/blog/hybrid-cloud-sizing-and-capacity-planning>
- WintelGuy Virtualization Calculator (live tool analysis): <https://wintelguy.com/vmcalc.pl>
- VMware vCPU-to-pCPU ratio guidelines (2025): <https://blogs.vmware.com/cloud-foundation/2025/06/04/vcpu-to-pcpu-ratio-guidelines/>
- vSphere Cluster Calculator user guide: <https://vmusketeers.com/userguide-vsphere-cluster-calculator/>
- Dell Technologies Enterprise Infrastructure Planning Tool: <https://www.dell.com/calc>
- Generic cluster sizing calculator (formula analysis): <https://codingace.net/dev/cluster_sizing.html>
- Azure VMware Solution storage sizing formulas: <https://dinocloud.net/2025/02/06/sizing-azure-vmware-solution-cluster-storage-capacity/>
- ITRS Capacity Planner headroom and N+1 features: <https://docs.itrsgroup.com/docs/capacity-planner/latest/get-started/headroom/index.html>

---

*Feature research for: presales cluster refresh sizing web app*
*Researched: 2026-03-12*
