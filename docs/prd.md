
# Cluster Refresh Sizing Web Application – PRD

## 1. Overview

The **Cluster Refresh Sizing Web Application** is a **client-side-only** tool to help presales engineers and architects quickly size a **refreshed cluster** based on metrics from an **existing (“old”) cluster**.

The application consumes **actual environment metrics** (e.g., number of VMs, vCPUs, pCores, vRatio, memory, disk, server configuration) and uses configurable sizing rules to propose one or more **target cluster configurations** (server count, CPU, memory, disk, VM density, etc.).

The tool is intended to run entirely in the browser (no server, no API backend), making it easy to share as a static web app.

Figure 1 shows an example of the current data typically available to the user:

![example current cluster sizing spreadsheet](https://dell-aws-poc-2-be.glean.com/api/v1/downloadchatfile/2ccc055f31714e29ba1831acd6a7627a)
*Figure 1: Example input data for an existing cluster (“old”) including VM, total, server, and per-server statistics.*

## 2. Problem Statement

When planning a **cluster refresh** (e.g., moving to newer server generations or different configurations), engineers typically:

- Manually extract current environment data (VM counts, vCPUs, pCores, vRatio, memory, disk, etc.) from tools or spreadsheets.
- Perform sizing calculations by hand or in ad hoc spreadsheets.
- Iterate multiple times to test different consolidation ratios, server configurations, or growth assumptions.

This approach is:

- **Time-consuming** – repetitive manual calculations for each opportunity.
- **Error-prone** – copy/paste errors, formula mistakes, outdated spreadsheets.
- **Inconsistent** – different people use different formulas and assumptions.

We need a **consistent, repeatable, and fast** way to go from **“current cluster stats” → “proposed refreshed cluster”**, entirely in the browser, with transparent assumptions.

## 3. Goals & Non-Goals

### 3.1 Goals

1. **Fast sizing workflow**
   Allow an engineer to go from raw environment stats to an initial **target cluster proposal** in **under 5 minutes**.

2. **Client-side only**
   All calculations and logic run in the browser. The app can be deployed as static files (e.g., on an internal web server, GitHub Pages, etc.).

3. **Configurable sizing logic**
   - Support configurable **vCPU-to-pCore ratios**, **RAM per VM**, **disk per VM**, and **headroom/growth factors**.
   - Allow different **server configurations** (cores, sockets, RAM, disk) to be compared.

4. **Scenario comparison**
   Support at least **two side-by-side target scenarios** (e.g., “Standard configuration” vs. “High-density configuration”).

5. **Simple export**
   Allow users to **export results** (and key input assumptions) to:
   - Copy/paste friendly text/Markdown
   - Optional CSV or JSON (download from browser)

6. **Traceable assumptions**
   For every key output metric, show the **formula and input parameters** used, so users can validate and adjust.

7. **Performance-based sizing (v1.1)**
   - Support a **SPECrate2017_int_base-based sizing mode** as an alternative to vCPU-ratio sizing, enabling performance-equivalence calculations between server generations.

8. **Right-sizing from observed utilization (v1.1)**
   - Accept observed CPU % and RAM % utilization of the existing cluster to size to **actual consumption** rather than installed capacity.

### 3.2 Non-Goals (for v1 / v1.1)

- No integration with external systems (vCenter, CloudIQ, etc.) — planned for v1.2 (LiveOptics/RVTools file import).
- No authentication, user accounts, or persistent server-side storage.
- No formal TCO/ROI calculations (only capacity/sizing in v1).
- No per-VM-level modeling; calculations are **aggregate-based** (e.g., totals, averages).

## 4. Users & Personas

### Primary Persona – **Presales / Systems Engineer**

- Needs to answer “**How many new servers do we need for this cluster refresh?**” quickly.
- Comfortable with infrastructure concepts (vCPUs, pCores, vRatio, sockets, cores, memory, disk).
- Often works from **Excel extracts** or summary slides of the existing environment.

### Secondary Persona – **Solution Architect / Consultant**

- Validates or refines sizing assumptions.
- May use the tool to compare different standard server configurations.

### Tertiary Persona – **Sales Representative (Read-Only)**

- Uses the output summaries (not the full UI) to understand the proposed configuration and share with customers.

## 5. Scope

### 5.1 In Scope (v1)

- Data entry for **current (“old”) cluster**:
  - Average VM configuration (CPU/RAM/Disk) – e.g., CPU 6, RAM 24 GB, Disk 350 GB.
  - Aggregate totals:
    - Total vCPUs (e.g., 2410)
    - Total physical cores (pCores) (e.g., 1026)
    - Total VMs (e.g., 534)
    - Total disk (e.g., 186,900 GB)
    - Existing vCPU:pCore ratio (e.g., 2.35)
  - Existing server configuration:
    - Sockets per server (e.g., 2)
    - Cores per CPU (e.g., 16)
    - Total cores per server (e.g., 32)
    - Memory per server (e.g., 1024 GB)
    - Per-server densities (e.g., ~25 VMs per server on cores, ~43 VMs per server on RAM).

- Entry of **target server configuration(s)**:
  - Sockets, cores per CPU, total cores, RAM per server, disk capacity per server (or disk configuration).
  - Optional: different SKUs labeled “Config A”, “Config B”, …

- **Sizing calculations** for each scenario, including:
  - Number of servers required, based on:
    - CPU constraint (vCPU:pCore target ratio).
    - RAM constraint (RAM per VM and total required).
    - Disk constraint (disk per VM and total required).
    - Selected headroom for growth (e.g., +20%).
  - Per-server utilization and VM density:
    - VMs per server (by CPU, RAM, and disk).
    - Projected vCPU:pCore ratio.
  - Identification of the **limiting resource** (CPU, RAM, or disk).

- **Scenario comparison view**:
  - Table comparing key metrics (server count, utilization, headroom, limiting resource) for up to 2–3 scenarios.

- **Results export**:
  - Copyable summary for email / slide decks (e.g., Markdown or plain text).
  - Optional CSV/JSON download (generated on the client side).

### 5.2 Out of Scope (v1)

- Automated pricing or BOM generation.
- Automated mapping of workloads to specific servers.
- Detailed capacity planning beyond a multi-year headroom factor.

## 6. Key User Stories

1. **Input current cluster metrics**
   - *As a systems engineer, I want to input the key statistics of an existing cluster (VM counts, vCPUs, memory, disk, and server configuration) so that I can base the refresh sizing on real data.*

2. **Define target server configuration**
   - *As a systems engineer, I want to select or define a target server configuration (cores, RAM, disk per server) so that the tool can compute how many of these servers are required.*

3. **Adjust sizing assumptions**
   - *As a systems engineer, I want to adjust assumptions such as target vCPU:pCore ratio, RAM per VM, disk per VM, and growth headroom so that I can tailor the sizing to customer expectations and best practices.*

4. **Compare multiple scenarios**
   - *As a systems engineer, I want to compare at least two sizing scenarios side-by-side so that I can quickly show trade-offs between fewer/bigger servers vs. more/smaller servers.*

5. **Export and share results**
   - *As a systems engineer, I want to export a concise summary of the proposed refresh cluster so I can paste it into an email or presentation.*

6. **Understand how numbers are derived**
   - *As a solution architect, I want to see the formulas and assumptions behind each key output value so that I can validate and refine the sizing.*

## 7. Functional Requirements

### 7.1 Data Input

**FR-1 – Manual form input for “Old Cluster”**

- The app shall provide a form to manually input or edit the following fields for the **current cluster**:
  - **Average VM configuration:**
    - VM CPU (vCPUs per VM)
    - VM RAM (GB per VM)
    - VM Disk (GB per VM)
  - **Totals:**
    - Total vCPUs
    - Total pCores
    - Total VMs
    - Total disk (GB)
    - Calculated vCPU:pCore ratio (auto-calculated, but editable override).
  - **Existing server configuration:**
    - Sockets per server
    - Cores per CPU
    - Memory per server (GB)
    - Number of servers (optional but recommended)
  - **Derived metrics** (calculated and displayed):
    - Total cores per server
    - VMs per server based on cores
    - VMs per server based on RAM

**FR-2 – Observed utilization inputs (v1.1)**

- The app shall accept two optional fields in the current cluster form:
  - **CPU utilization %** (0–100): the observed average CPU utilization of the existing cluster.
  - **RAM utilization %** (0–100): the observed average RAM utilization of the existing cluster.
- When provided, the sizing formulas scale effective demand by these percentages, enabling right-sizing to actual consumption rather than installed capacity (see ADR-004).
- When not provided (blank), formulas default to 100% — backward-compatible with v1.0 behavior.

**FR-2b – Sizing mode selection (v1.1)**

- The app shall provide a global **sizing mode toggle**: vCPU-based (default) or SPECrate2017-based (mutually exclusive — see ADR-001, ADR-005).
- In **SPECrate2017 mode**:
  - Step 1 displays an additional field: `SPECrate2017_int_base` score for the existing server model.
  - Each scenario card displays an additional field: `SPECrate2017_int_base` score for the target server model.
  - The CPU constraint formula becomes: `ceil(existingServers × oldSPECrate2017_int_base × headroom / targetSPECrate2017_int_base)`.
  - The limiting resource label shows "SPECrate2017" when this constraint drives the final server count.
- In **vCPU mode**: SPECrate2017 fields are hidden; behavior is identical to v1.0.

**FR-2c – File import (v1.2, shipped)**

- The app accepts the following file formats to auto-populate Step 1 cluster inputs, eliminating manual data entry:
  - **RVTools xlsx** — reads VM inventory (vCPUs, disk) and ESX host sheet (server config).
  - **LiveOptics xlsx** — reads VMs sheet, ESX Hosts sheet (server count/config), and ESX Performance sheet (avg CPU/RAM utilization). Supports both single-file and ZIP exports.
  - **LiveOptics ZIP** — intelligently selects the richest xlsx within the archive (VMWARE file with ESX Hosts preferred over GENERAL file).
  - **Presizion JSON** — full session restore: re-imports a previously exported JSON file, restoring the current cluster data and all scenario configurations.

### 7.2 Target Cluster Scenarios

**FR-3 – Scenario definition**

- The app shall allow defining **at least two scenarios**:
  - Scenario name (e.g., “Standard”, “High-density”).
  - Server configuration per scenario:
    - Sockets
    - Cores per CPU
    - Total cores per server (auto-calculated)
    - RAM per server (GB)
    - Usable disk per server (GB)
  - Sizing assumptions per scenario:
    - Target vCPU:pCore ratio.
    - RAM per VM (GB).
    - Disk per VM (GB).
    - Growth headroom (percentage, e.g., 20%).
    - Optional overcommit or utilization targets (e.g., max 70% CPU, 80% RAM).

**FR-4 – Scenario duplication**

- The app shall support duplicating an existing scenario to quickly create a variant with minor changes.

### 7.3 Sizing Calculations

**FR-5 – Aggregate resource requirements**

For each scenario, the app shall compute:

- **Effective resource requirements**, factoring in headroom:
  - Required vCPUs (including growth).
  - Required RAM (GB) for all VMs + headroom.
  - Required disk (GB) for all VMs + headroom.

**FR-6 – Server count per constraint**

For each scenario, the app shall compute:

- Number of servers required for:
  - **CPU constraint:**
    - Convert required vCPUs to pCores using the target vCPU:pCore ratio.
    - Divide by cores per server, rounded up.
  - **RAM constraint:**
    - Divide required RAM by RAM per server, rounded up.
  - **Disk constraint:**
    - Divide required disk by usable disk per server, rounded up.

**FR-7 – Final server count & limiting resource**

- For each scenario, the app shall:
  - Determine the **final server count** as the **maximum** of the CPU-, RAM-, and disk-based server counts.
  - Identify and display the **limiting resource** (CPU, RAM, disk) that drove the final server count.

**FR-8 – Per-server utilization & VM density**

- For each scenario, the app shall compute and display:
  - VMs per server (based on the final server count).
  - vCPU:pCore ratio achieved with this server count.
  - Estimated CPU utilization vs. target (if utilization target is defined).
  - Estimated RAM utilization vs. target.
  - Estimated disk utilization vs. target.

**FR-9 – Visual indicators**

- The app shall provide simple visual cues (e.g., color coding, badges) to indicate:
  - Whether utilization is within acceptable ranges.
  - Which resource is the bottleneck.

### 7.4 Scenario Comparison

**FR-10 – Comparison view**

- The app shall have a **comparison view** where multiple scenarios (min. 2) can be displayed side-by-side in a table including:
  - Scenario name.
  - Final server count.
  - Limiting resource.
  - vCPU:pCore ratio.
  - VMs per server.
  - Headroom percentage.
  - Estimated CPU/RAM/disk utilization.

### 7.5 Export & Sharing

**FR-11 – Summary export**

- The app shall generate a **textual summary** of a selected scenario (or comparison of scenarios) suitable for:
  - Copy/paste into email.
  - Copy/paste into presentation slides.

- The summary should include:
  - Key input assumptions (old cluster metrics, growth factor, vCPU:pCore target).
  - Final recommended server configuration per scenario.
  - Rationale (limiting resource, headroom).

**FR-12 – Data download**

- The app shall allow the user to download a CSV file containing all input fields and output metrics (v1.0 — shipped).
- **FR-12b (v1.1)**: The app shall additionally allow downloading a **JSON file** containing all inputs, scenario configs, and outputs in pretty-printed format — suitable for archiving or future re-import.
- All generation happens client-side using browser APIs (no server interaction).

**FR-16b – Print / PDF layout (v1.1)**

- The app shall provide a **print-optimized stylesheet** (`@media print`) that:
  - Hides wizard chrome (step indicator, navigation buttons).
  - Renders the Step 3 comparison table in a clean single-column layout.
  - Fits A4/Letter paper width without horizontal overflow.
  - Preserves utilization color coding.
- Users can produce a PDF hardcopy via browser Print → Save as PDF.

### 7.6 UX & Interaction

**FR-13 – Step-based workflow**

- Provide a simple 3-step flow:
  1. **Enter Current Cluster** (inputs & validation).
  2. **Define Target Scenarios**.
  3. **Review & Export** (scenario comparison and summary).

**FR-14 – Inline help**

- Provide inline tooltips or info icons for key fields (e.g., vCPU:pCore ratio, headroom) explaining:
  - What the value means.
  - Recommended typical ranges (configurable / hard-coded).

**FR-15 – Client-side validation**

- Validate numerical fields:
  - Non-negative.
  - Optional upper bounds (e.g., headroom 0–100%).
- Show validation errors inline.

**FR-16 – Light/dark mode (optional)**

- Nice-to-have: basic support for light/dark themes consistent with modern UI expectations.

## 8. Non-Functional Requirements

### 8.1 Performance

- The app shall load and be ready for interaction within **2 seconds** on a typical corporate laptop with a reasonable network connection to the static host.
- All calculations should render results **instantly** (&lt;200 ms) after changing inputs.

### 8.2 Security & Privacy

- All logic runs client-side; no data is sent to any backend.
- No persistent storage is required; however:
  - Optionally use **localStorage** to remember the last used inputs on the same browser.
- Clearly communicate that data is processed only in the browser and is not uploaded.

### 8.3 Compatibility

- Support **modern browsers**:
  - Latest Chrome, Edge, and Firefox.
- Responsive design:
  - Optimized for **laptop/desktop**.
  - Readable (but not necessarily fully optimized) on tablets.

### 8.4 Reliability & Availability

- The app is static content; availability depends on hosting (e.g., simple static web server or CDN).
- No backend services needed, minimizing operational complexity.

### 8.5 Maintainability

- Implemented in a **modular**, well-documented codebase using a mainstream framework (e.g., React + TypeScript) or well-structured vanilla JavaScript.
- Sizing formulas and constants should be centralized in a single configuration/module, making it easy to adjust as best practices evolve.

## 9. Technical Design Constraints

- **Client-side only**:
  - No backend, no database, no server-side compute.
  - All state in memory (with optional localStorage).
- **Technology stack (proposed)**:
  - UI: HTML5, CSS (or lightweight CSS framework), JavaScript/TypeScript (optionally React).
  - Packaging: simple static build (e.g., Webpack, Vite, or similar) that outputs static assets.
- **No external tracking/analytics** by default (unless explicitly added in future scope).

## 10. Data Model (Conceptual)

### 10.1 Entities

1. **OldCluster**
   - `avgVmCpu`
   - `avgVmRamGb`
   - `avgVmDiskGb`
   - `totalVcpus`
   - `totalPcores`
   - `totalVms`
   - `totalDiskGb`
   - `vCpuToPCoreRatio` (derived or overridden)
   - `socketsPerServer`
   - `coresPerSocket`
   - `memoryPerServerGb`
   - `serverCount` (optional, required for SPECrate2017 mode)
   - `specintPerServer` (optional — v1.1, SPECrate2017 mode; stores `SPECrate2017_int_base` score)
   - `cpuUtilizationPercent` (optional — v1.1, right-sizing scaler)
   - `ramUtilizationPercent` (optional — v1.1, right-sizing scaler)
   - Derived:
     - `coresPerServer`
     - `vmsPerServerCoreBased`
     - `vmsPerServerRamBased`

2. **Scenario**
   - `name`
   - `socketsPerServer`
   - `coresPerSocket`
   - `memoryPerServerGb`
   - `diskPerServerGb`
   - `targetVcpuToPCoreRatio` (vCPU mode only)
   - `targetSpecint` (optional — v1.1, SPECrate2017 mode; stores `SPECrate2017_int_base` score for target server)
   - `ramPerVmGb`
   - `diskPerVmGb`
   - `growthHeadroomPercent`
   - `haReserveEnabled` (boolean)

3. **WizardState** (global)
   - `sizingMode: 'vcpu' | 'specint'` (v1.1; 'specint' mode uses `SPECrate2017_int_base` metric)

4. **ScenarioResult** (derived — never stored, see ADR-002)
   - `requiredVcpus`
   - `requiredRamGb`
   - `requiredDiskGb`
   - `serverCountCpuLimited` (or `serverCountSpecintLimited` in SPECrate2017 mode)
   - `serverCountRamLimited`
   - `serverCountDiskLimited`
   - `finalServerCount`
   - `limitingResource: 'CPU' | 'RAM' | 'Disk' | 'SPECrate2017'`
   - `vmsPerServer`
   - `achievedVcpuToPCoreRatio`
   - `cpuUtilizationPercent`
   - `ramUtilizationPercent`
   - `diskUtilizationPercent`

## 11. UX Sketch (Conceptual)

1. **Step 1: Current Cluster Input**
   - Panel with input fields grouped as:
     - “Average VM”
     - “Totals”
     - “Current Servers”
   - A read-only preview of derived metrics (e.g., “You currently have 534 VMs, vCPU:pCore 2.35, approx. 25 VMs/server on CPU, 43 VMs/server on RAM”).

2. **Step 2: Target Scenarios**
   - Tabbed or stacked cards, one per scenario.
   - Each card shows server config, assumptions, and immediate outputs (server counts, limiting resource).

3. **Step 3: Review & Export**
   - Side-by-side comparison table.
   - “Copy Summary” button.
   - “Download JSON/CSV” button.

Wireframes are not included here but can be added in a future UX deliverable.

## 12. Acceptance Criteria

1. **Correctness**
   - Given known input values and a reference spreadsheet, the app produces identical server counts (within rounding rules) for CPU-, RAM-, and disk-based constraints.
   - Limiting resource is correctly identified for each scenario.

2. **Usability**
   - A new user can complete a basic sizing (single scenario) starting from a blank page in **&lt;5 minutes** without documentation.
   - Form validation clearly highlights missing or invalid inputs.

3. **Performance**
   - All inputs and scenario changes re-calculate outputs with no perceptible lag.

4. **Client-side-only operation**
   - Network inspection shows no outbound calls other than loading static assets (no API calls once loaded).

5. **Export**
   - “Copy Summary” produces a self-contained text block with clear context, assumptions, and results.
   - JSON/CSV export contains all expected fields and can be re-imported to reproduce the same results (future enhancement).

## 13. Risks & Open Questions

- **Sizing formulas & best practices**:
  - Are there standardized, Dell-approved defaults for:
    - vCPU:pCore ratios for different workloads?
    - Typical growth/headroom percentages?
  - These should be validated with architecture / presales leadership.

- **Standard server configurations**:
  - Should the app ship with a library of pre-defined server configs (e.g., standard SKUs) or start empty and rely on user input?

- **Offline usage**:
  - Is offline availability (e.g., via PWA) required, or is basic online static hosting sufficient?

- **Localization**:
  - Are units or language localization required (e.g., GB vs. TB display preferences, translations)?

- **Governance**:
  - Who owns maintenance of sizing rules as hardware generations and best practices change?

## 14. Future Enhancements

### v1.1 (shipped)

- **SPECrate2017_int_base sizing mode** — performance-equivalence sizing using `SPECrate2017_int_base` delta between old and new server generations (PERF-01–05). Default server profile: Dell R660, 2× Xeon Gold 6526Y (score: 337).
- **Observed utilization inputs** — right-size to actual CPU/RAM consumption rather than installed capacity (UTIL-01–03).
- **JSON download** — export all inputs and outputs as JSON (EXPO-03).
- **Print / PDF layout** — clean browser-printable layout of Step 3 results (EXPO-04).
- **As-Is reference column** — Step 3 comparison table includes the existing cluster as a reference column (REPT-01).

### v1.2 (shipped)

- **LiveOptics zip/xlsx import** — parse LiveOptics data collection ZIP and single XLSX exports to auto-fill Step 1; reads ESX Hosts sheet (server count/config) and ESX Performance sheet (avg CPU/RAM utilization).
- **RVTools xlsx import** — parse RVTools Excel export (vInfo sheet) to auto-fill Step 1.
- **Presizion JSON import** — full session restore from a previously exported JSON file.
- **Lazy IT seeding** — after any file import, existing scenarios automatically inherit `avgRamPerVmGb` and `diskPerVmGb` from the imported cluster data.

### v2.7 (shipped)

- **Per-VM exclusions (issue #13)** — users may exclude individual VMs via glob name patterns (e.g. `test-*`), exact-name lists, power-state toggle (drop powered-off), or per-row overrides. Aggregates (total vCPUs/VMs/disk, avg RAM/VM) recompute live from the kept subset.
  - **User story**: *As a presales engineer, I want to drop decommissioned or lab VMs from the source file so the refresh sizing reflects the production workload we actually intend to migrate.*
  - **Persistence**: rules persist via localStorage, JSON export, and URL hash; raw VM rows stay session-only (see ADR-021).
  - **Entry points**: inline step 2 of the Import Preview modal; edit-in-place summary card at the top of Step 1.

### v2+ (backlog)

- **localStorage persistence** — restore last-used inputs on next visit (PERS-01).
- **Shareable URL** — hash-encoded state for sharing pre-filled scenarios (PERS-02).
- **Manual dark/light mode toggle** — override OS preference (UI-01).
- Integration with **price books** or BOM tools to estimate cost impact.
- Support for **different workload profiles** (compute-heavy vs. memory-heavy) with separate assumptions per profile.
- Advanced **what-if analysis** (e.g., “What if we target 50% CPU utilization instead of 70%?”).
- Improved **visualization**: bar charts comparing server counts and utilization across scenarios.
