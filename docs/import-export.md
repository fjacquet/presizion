# Import and Export Reference

This document describes the file formats, parsing logic, and data structures used by Presizion's import and export system. All import/export code is client-side only; no data leaves the browser.

---

## Supported Import Formats

Presizion accepts four input formats: RVTools XLSX, LiveOptics XLSX, LiveOptics CSV (including ZIP archives containing any of these), and Presizion's own JSON export format.

### RVTools XLSX

**Source file:** `src/lib/utils/import/rvtoolsParser.ts`

RVTools exports are identified by the presence of a **`vInfo`** sheet.

**Required columns** (at least one alias must match):

| Canonical field   | Accepted aliases              |
| ----------------- | ----------------------------- |
| `vm_name`         | `VM`, `VM Name`               |
| `num_cpus`        | `CPUs`, `Num CPUs`, `vCPUs`   |

**Optional columns:**

| Canonical field    | Accepted aliases                   |
| ------------------ | ---------------------------------- |
| `memory_mib`       | `Memory`, `Memory MB`, `Memory MiB` |
| `provisioned_mib`  | `Provisioned MB`, `Provisioned MiB` |
| `is_template`      | `Template`                         |

**Scope detection columns** (optional, applied to vInfo rows):

| Canonical field    | Accepted aliases                                               |
| ------------------ | -------------------------------------------------------------- |
| `cluster_name`     | `Cluster`, `cluster`, `ClusterName`, `cluster_name`, `Cluster Name` |
| `datacenter_name`  | `Datacenter`, `datacenter`, `DC`, `DataCenter`, `data_center`  |

**vHost sheet** (optional, best-effort): When a `vHost` sheet exists, the parser extracts CPU model and average CPU clock frequency from host rows.

| Canonical field    | Accepted aliases                        |
| ------------------ | --------------------------------------- |
| `host_name`        | `Host`, `Name`, `Host Name`             |
| `cpu_model`        | `CPU Model`                             |
| `cpu_speed_mhz`    | `Speed MHz`, `CPU Speed MHz`, `CPU Speed` |

Rows where `is_template` is truthy (`TRUE`, `true`, `1`, or boolean `true`) are excluded from aggregation.

### LiveOptics XLSX

**Source file:** `src/lib/utils/import/liveopticParser.ts`

LiveOptics XLSX files are identified by the presence of a **`VMs`** sheet.

**Required columns** (same constraint as RVTools -- `vm_name` and `num_cpus` must resolve):

| Canonical field    | Accepted aliases                                          |
| ------------------ | --------------------------------------------------------- |
| `vm_name`          | `VM Name`                                                 |
| `num_cpus`         | `Virtual CPU`, `vCPU`, `CPUs`                             |
| `memory_mib`       | `Provisioned Memory (MiB)`, `Memory (MiB)`, `Memory MB`  |
| `provisioned_mib`  | `Virtual Disk Size (MiB)`                                 |
| `is_template`      | `Template`                                                |

Cluster and datacenter scope detection uses the same alias tables as RVTools.

**ESX Hosts sheet** (optional): When present, extracts physical host information to populate `existingServerCount`, `totalPcores`, `socketsPerServer`, `coresPerSocket`, `ramPerServerGb`, `cpuModel`, and `cpuFrequencyGhz`.

| Canonical field   | Accepted aliases                                  |
| ----------------- | ------------------------------------------------- |
| `host_name`       | `Host Name`, `ESX Host`, `Host`                   |
| `cpu_sockets`     | `CPU Sockets`, `Sockets`                          |
| `cpu_cores`       | `CPU Cores`, `Cores`                               |
| `memory_kib`      | `Memory (KiB)`, `Memory KiB`, `Memory`            |
| `cpu_model`       | `CPU Model`, `Processor Model`, `Processor`        |
| `cpu_speed_mhz`   | `CPU Speed (MHz)`, `CPU Speed`, `CPU MHz`          |

**ESX Performance sheet** (optional): Extracts average CPU and RAM utilization across hosts.

| Canonical field | Accepted aliases                          |
| --------------- | ----------------------------------------- |
| `host_name`     | `Host Name`, `ESX Host`, `Host`           |
| `avg_cpu_pct`   | `Average CPU %`, `Avg CPU %`, `CPU %`     |
| `avg_mem_pct`   | `Average Memory %`, `Avg Memory %`, `Memory %` |

### LiveOptics CSV

LiveOptics CSV files are detected by checking whether the first line of the file contains `VM Name` or `VM OS`. The CSV is parsed with comma delimiters and uses the same `LIVEOPTICS_ALIASES` column alias table as the XLSX parser.

### LiveOptics ZIP

**Source file:** `src/lib/utils/import/formatDetector.ts`

ZIP archives are supported. The detector extracts all `.xlsx` files from the archive and ranks them by content:

| Priority | Score | Detection criterion         |
| -------- | ----- | --------------------------- |
| 1        | 3     | Contains `vInfo` sheet (RVTools) |
| 2        | 2     | Contains `ESX Hosts` sheet (LiveOptics VMWARE type) |
| 3        | 1     | Contains `VMs` sheet (LiveOptics GENERAL type) |
| 4        | 0     | No recognized sheet (AIR or unknown -- rejected) |

The highest-scoring `.xlsx` is selected and passed to the XLSX format detector. If no file scores above 0, an `ImportError` is thrown.

### Presizion JSON

**Source file:** `src/lib/utils/import/jsonParser.ts`

JSON files (`.json` extension) bypass the XLSX/CSV pipeline entirely. The parser expects a Presizion export with three top-level keys:

- `schemaVersion` -- string (currently `"1.1"`)
- `currentCluster` -- object conforming to `OldCluster`
- `scenarios` -- array of objects conforming to `Scenario`

Required numeric fields in `currentCluster`: `totalVcpus`, `totalPcores`, `totalVms`. All other cluster fields are optional. Each scenario must have the standard server configuration fields (`socketsPerServer`, `coresPerSocket`, etc.). Missing `id` fields are replaced with `crypto.randomUUID()`, missing `name` fields default to `"Scenario N"`.

The JSON import restores both the cluster and all scenarios, making it a full round-trip format.

---

## Column Resolution System

**Source file:** `src/lib/utils/import/columnResolver.ts`

The `resolveColumns()` function maps spreadsheet header names to canonical field names using alias tables.

**Algorithm:**

1. All actual headers are trimmed of leading/trailing whitespace.
2. For each canonical field, the function iterates its list of known aliases and returns the first exact match found in the trimmed headers.
3. If a canonical field is in the `required` set and no alias matches, the field name and its tried aliases are collected.
4. If any required fields are missing, an `ImportError` is thrown listing all unresolved fields.

The matching is **exact** (case-sensitive, after trimming). There is no fuzzy or substring matching -- the alias lists must contain every expected header variant.

The function returns a `Record<string, string | undefined>` mapping canonical names to the actual header string found (or `undefined` if not matched and not required).

---

## Scope Detection

Both parsers detect datacenter and cluster scopes from VM-level rows. The scope key is constructed as follows:

- If both datacenter and cluster columns are present and non-empty: `"datacenter||cluster"`
- If only cluster is present: `"cluster"`
- If neither is present: `"__all__"`

Scope labels are generated for display:

- `"__all__"` becomes `"All"`
- `"dc||cluster"` becomes `"cluster (dc)"`
- `"dc||__standalone__"` becomes `"Standalone (dc)"` -- used for VMs that have a datacenter but no cluster assignment
- Plain cluster name is used as-is

### Standalone scope routing for clusterless VMs

When a VM row has a datacenter value but no cluster value, both parsers route it to the scope key `"dc||__standalone__"` instead of `"__all__"`. This ensures clusterless VMs are attributed to their datacenter and can be selected or deselected independently during scope selection. The `buildScopeLabel` function renders these as `"Standalone (dc-name)"`.

Per-scope aggregates (`ScopeData`) are stored in a `Map<string, ScopeData>` on the import result, containing `totalVcpus`, `totalVms`, `totalDiskGb`, `avgRamPerVmGb`, `vmCount`, and `warnings` for each scope.

### Weighted average RAM in aggregation

When multiple scopes are selected and combined by `scopeAggregator.ts`, `avgRamPerVmGb` is computed as a **VM-count-weighted average** across the selected scopes (not a simple arithmetic mean). The formula is:

```
avgRamPerVmGb = sum(scope.avgRamPerVmGb * scope.vmCount) / sum(scope.vmCount)
```

Similarly, `cpuUtilizationPercent` and `ramUtilizationPercent` are aggregated as **host-count-weighted averages** using `existingServerCount` as the weight. `ramPerServerGb` is also host-count-weighted when heterogeneous RAM configurations are detected across clusters (a warning is emitted in that case).

---

## Import Flow

**Source file:** `src/lib/utils/import/index.ts`

The `importFile(file: File)` function orchestrates the full pipeline:

1. **Extension check** -- `.json` files are routed directly to the JSON parser; other extensions proceed to the XLSX/CSV pipeline.
2. **File validation** -- Rejects files not matching `.xlsx`, `.csv`, or `.zip`. For `.xlsx` and `.zip` files, verifies the ZIP magic bytes (`PK\x03\x04`).
3. **Format detection** -- Reads the file buffer and dispatches by extension:
   - `.zip` -- extracts and ranks `.xlsx` entries (see ZIP section above)
   - `.xlsx` -- checks sheet names for `vInfo` (RVTools) or `VMs` (LiveOptics)
   - `.csv` -- checks first line for LiveOptics headers
4. **Parsing** -- Delegates to `parseRvtools()` or `parseLiveoptics()` based on detected format.
5. **Result** -- Returns a `ClusterImportResult` (for XLSX/CSV) or `JsonImportResult` (for JSON).

The return type is `AnyImportResult = ClusterImportResult | JsonImportResult`. Callers distinguish by checking the `sourceFormat` field.

---

## Supported Export Formats

### CSV

**Source file:** `src/lib/utils/export.ts`

`buildCsvContent()` produces an RFC 4180-compliant CSV string with one header row and one data row per scenario.

**Columns (20 total):**

```
Name, Sockets/Server, Cores/Socket, RAM/Server (GB), Disk/Server (GB),
vCPU:pCore Ratio, RAM/VM (GB), Disk/VM (GB), Headroom (%), N+1 HA,
CPU-limited, RAM-limited, Disk-limited, Final Count, Limiting Resource,
Achieved vCPU:pCore, VMs/Server, CPU util (%), RAM util (%), Disk util (%)
```

Fields containing commas, double quotes, or newlines are escaped per RFC 4180 (double-quoted with internal quotes doubled). The CSV contains scenario configuration and computed results but does not include the current cluster data.

`downloadCsv()` triggers a browser file download via a temporary object URL.

### JSON

**Source file:** `src/lib/utils/export.ts`

`buildJsonContent()` produces a pretty-printed JSON string with the following structure:

```json
{
  "schemaVersion": "1.1",
  "generatedAt": "2026-03-14T12:00:00.000Z",
  "currentCluster": {
    "totalVcpus": 512,
    "totalPcores": 128,
    "totalVms": 200,
    "totalDiskGb": 10240,
    "socketsPerServer": null,
    "coresPerSocket": null,
    "ramPerServerGb": null,
    "existingServerCount": null,
    "specintPerServer": null,
    "cpuUtilizationPercent": null,
    "ramUtilizationPercent": null
  },
  "scenarios": [
    {
      "id": "...",
      "name": "Scenario A",
      "socketsPerServer": 2,
      "...": "...",
      "result": {
        "cpuLimitedCount": 4,
        "ramLimitedCount": 3,
        "diskLimitedCount": 2,
        "finalCount": 5,
        "limitingResource": "cpu",
        "..."
      }
    }
  ]
}
```

Key details:

- `schemaVersion` is `"1.1"`.
- Optional cluster fields that are absent are serialized as `null` (not omitted).
- Each scenario object includes its computed `result` inlined.
- This format can be re-imported via the JSON parser for full round-trip capability.

`downloadJson()` triggers a browser file download.

### PDF

**Source file:** `src/lib/utils/exportPdf.ts`

`exportPdf()` is an async function that lazy-loads `jsPDF` and `jspdf-autotable` via dynamic `import()` (PDF-03), captures chart images from the DOM via `chartRefToDataUrl()`, and generates a multi-page A4 portrait report.

**Report structure:**

1. **Title page** -- dark navy background with Presizion logo (canvas-rendered via `logoDataUrl.ts`), cluster summary KPIs, and date.
2. **Executive summary** -- KPI callout numbers (As-Is servers, target servers, CPU/RAM utilization) and a table with one row per scenario.
3. **As-Is vs To-Be comparison** -- metric rows comparing existing cluster with each scenario (servers, config, pCores, ratios, utilization, disk).
4. **Sizing assumptions** -- general parameters table, vSAN settings table (conditional), growth projections table (conditional).
5. **Per-scenario server configuration** -- sockets, cores, RAM, disk per server.
6. **Per-scenario capacity breakdown** -- table with CPU GHz / Memory GiB / Raw Storage TiB rows (required, spare, excess, total) followed by captured chart images (capacity stacked chart and min-nodes chart).

The function signature accepts parallel arrays: `(cluster, scenarios, results, breakdowns, chartRefs)`. The `chartRefs` record maps keys like `"capacity-{id}"` and `"minnodes-{id}"` to chart container elements.

Output filename: `presizion-sizing-report.pdf`.

### PPTX

**Source file:** `src/lib/utils/exportPptx.ts`

`exportPptx()` is an async function that lazy-loads `pptxgenjs` via dynamic `import()` (PPTX-03) and generates a wide-layout (13.33" x 7.5") PowerPoint presentation.

**Slide structure:**

1. **Title slide** -- dark navy background with logo, cluster summary, and date.
2. **Executive summary** -- KPI callout numbers and scenario comparison table.
3. **As-Is vs To-Be comparison** -- same metrics as the PDF comparison table.
4. **Sizing assumptions** -- general parameters, vSAN settings (conditional), growth projections (conditional, separate slide).
5. **Per-scenario server configuration** -- hardware specs per scenario.
6. **Per-scenario capacity breakdown** -- one slide with breakdown table per scenario, one slide with capacity chart image and data table, one slide with min-nodes chart and constraint table.
7. **Scenario comparison** -- final recap slide with all scenarios side by side.

The function signature mirrors `exportPdf`: `(cluster, scenarios, results, breakdowns, chartRefs)`.

Output filename: `presizion-sizing-report.pptx`.

### Clipboard (Plain Text Summary)

**Source file:** `src/lib/utils/clipboard.ts`

`buildSummaryText()` produces a multi-line plain text report for pasting into emails, slides, or tickets. Structure:

```
CLUSTER REFRESH SIZING REPORT
==============================
Current Cluster
  Total vCPUs:  512
  Total pCores: 128
  Total VMs:    200
  Total Disk:   10240 GB

Scenario: Scenario A
  Sockets/Server: 2 | Cores/Socket: 24 | RAM/Server: 512 GB | Disk/Server: 4000 GB
  vCPU:pCore Ratio: 4 | Headroom: 20% | HA Reserve: N+1

  Results:
    CPU-limited:  4 servers
    RAM-limited:  3 servers
    Disk-limited: 2 servers
    -> Required:   5 servers (cpu-limited)
    CPU util: 65.0% | RAM util: 45.2% | Disk util: 30.1%
```

`copyToClipboard()` writes the text to the system clipboard via `navigator.clipboard.writeText()`.

### URL Hash (Shareable Link)

**Source file:** `src/lib/utils/persistence.ts`

`encodeSessionToHash()` serializes a full `SessionData` object (cluster, scenarios, sizingMode, layoutMode) to a URL-safe base64 string:

1. JSON-stringify the session data.
2. Base64-encode via `btoa()`.
3. Apply base64url substitutions: `+` to `-`, `/` to `_`, strip `=` padding.

`decodeSessionFromHash()` reverses the process:

1. Strip leading `#` if present.
2. Restore standard base64 characters and padding.
3. Decode via `atob()`, parse JSON, validate against the session schema.
4. Return `SessionData` or `null` on failure.

The session schema validates with Zod, requiring a valid `cluster` (per `currentClusterSchema`), a `scenarios` array (per `scenarioSchema`), and optional `sizingMode` (default `"vcpu"`) and `layoutMode` (default `"hci"`).

---

## Data Structures

### ClusterImportResult (XLSX/CSV imports)

Returned by RVTools and LiveOptics parsers. Defined in `src/lib/utils/import/index.ts`.

| Field                    | Type                            | Notes                                     |
| ------------------------ | ------------------------------- | ----------------------------------------- |
| `totalVcpus`             | `number`                        | Sum of vCPU counts across all VMs         |
| `totalVms`               | `number`                        | Count of non-template VMs                 |
| `totalDiskGb`            | `number`                        | Total provisioned disk in GB              |
| `avgRamPerVmGb`          | `number`                        | Average RAM per VM in GB                  |
| `sourceFormat`           | `string`                        | `"rvtools"`, `"liveoptics-xlsx"`, or `"liveoptics-csv"` |
| `vmCount`                | `number`                        | Same as `totalVms`                        |
| `warnings`               | `string[]`                      | Non-fatal warnings                        |
| `totalPcores`            | `number` (optional)             | From ESX Hosts / vHost sheet              |
| `existingServerCount`    | `number` (optional)             | Number of physical hosts                  |
| `socketsPerServer`       | `number` (optional)             | CPU sockets per host                      |
| `coresPerSocket`         | `number` (optional)             | Derived: totalCores / sockets             |
| `ramPerServerGb`         | `number` (optional)             | RAM per host in GB                        |
| `cpuUtilizationPercent`  | `number` (optional)             | Average CPU utilization (ESX Performance) |
| `ramUtilizationPercent`  | `number` (optional)             | Average RAM utilization (ESX Performance) |
| `cpuFrequencyGhz`       | `number` (optional)             | Average CPU clock frequency               |
| `cpuModel`               | `string` (optional)             | CPU model string from first host          |
| `detectedScopes`         | `string[]` (optional)           | Scope keys found in data                  |
| `scopeLabels`            | `Record<string, string>` (optional) | Display labels for scope keys         |
| `rawByScope`             | `Map<string, ScopeData>` (optional) | Per-scope aggregate data              |

### JsonImportResult (JSON imports)

Returned by the Presizion JSON parser. Defined in `src/lib/utils/import/jsonParser.ts`.

| Field          | Type           | Notes                        |
| -------------- | -------------- | ---------------------------- |
| `sourceFormat` | `"presizion-json"` | Discriminator field      |
| `cluster`      | `OldCluster`   | Full cluster object          |
| `scenarios`    | `Scenario[]`   | Array of restored scenarios  |

### SessionData (URL hash / localStorage)

Used for persistence and shareable URLs. Defined in `src/lib/utils/persistence.ts`.

| Field        | Type         | Notes                                          |
| ------------ | ------------ | ---------------------------------------------- |
| `cluster`    | `OldCluster` | Current cluster metrics                        |
| `scenarios`  | `Scenario[]` | All defined scenarios                          |
| `sizingMode` | `string`     | `"vcpu"`, `"specint"`, `"aggressive"`, or `"ghz"` |
| `layoutMode` | `string`     | `"hci"` or `"disaggregated"`                   |

---

## Key Source Files

| File | Purpose |
| ---- | ------- |
| `src/lib/utils/import/index.ts` | Entry point, `importFile()`, type definitions |
| `src/lib/utils/import/formatDetector.ts` | Format detection (XLSX sheets, ZIP ranking, CSV headers) |
| `src/lib/utils/import/columnResolver.ts` | Column alias tables and resolution function |
| `src/lib/utils/import/rvtoolsParser.ts` | RVTools XLSX parser |
| `src/lib/utils/import/liveopticParser.ts` | LiveOptics XLSX and CSV parser |
| `src/lib/utils/import/jsonParser.ts` | Presizion JSON parser |
| `src/lib/utils/import/fileValidation.ts` | Extension check, magic byte verification |
| `src/lib/utils/export.ts` | CSV and JSON export builders, download helpers |
| `src/lib/utils/exportPdf.ts` | PDF report generator (lazy-loads jsPDF + jspdf-autotable) |
| `src/lib/utils/exportPptx.ts` | PPTX presentation generator (lazy-loads pptxgenjs) |
| `src/lib/utils/chartCapture.ts` | SVG-to-PNG chart capture utility for export |
| `src/lib/utils/logoDataUrl.ts` | Canvas-rendered Presizion logo for PDF/PPTX title pages |
| `src/lib/utils/clipboard.ts` | Plain text summary builder, clipboard copy |
| `src/lib/utils/persistence.ts` | localStorage and URL hash encode/decode |
| `src/types/cluster.ts` | `OldCluster` and `Scenario` interfaces |
| `src/types/results.ts` | `ScenarioResult` interface |
| `src/schemas/currentClusterSchema.ts` | Zod schema for cluster validation |
| `src/schemas/scenarioSchema.ts` | Zod schema for scenario validation |
| `src/lib/utils/import/exclusions.ts` | Pure exclusion engine (glob compile, `isExcluded`, `applyExclusions`) |
| `src/types/exclusions.ts` | `ExclusionRules` interface and `EMPTY_RULES` constant |

## VM Exclusions (v2.7)

### JSON export schema v2

```json
{
  "schemaVersion": "2",
  "generatedAt": "2026-04-18T10:00:00.000Z",
  "currentCluster": { ... },
  "scenarios": [ ... ],
  "exclusions": {
    "namePattern": "test-*",
    "exactNames": ["legacy-db-01"],
    "excludePoweredOff": true,
    "manuallyExcluded": [],
    "manuallyIncluded": []
  }
}
```

- `exclusions` is optional. V1 files (no `exclusions` block) load with `EMPTY_RULES` injected — fully backward-compatible.
- `schemaVersion` bumps from `"1.1"` to `"2"` whenever exclusions are emitted. Earlier `schemaVersion: "1.1"` examples in this document describe the legacy format and are kept for reference.
- `manuallyExcluded` / `manuallyIncluded` entries are stored as `${scopeKey}::${vmName}` composite keys so that duplicate VM names across scopes can be targeted individually.

### URL hash v2 with truncation

Hash payload is capped at ~8 KB (base64url budget). When the session exceeds the ceiling, the encoder runs a 4-attempt degradation ladder:

1. Full payload.
2. Drop `manuallyExcluded`.
3. Drop `manuallyExcluded` + `exactNames`.
4. Drop `exclusions` entirely.

When truncation occurs, the serialized payload is marked `truncated: true` so the decoder can surface a toast alerting the user that per-row overrides were dropped.

### Parser changes — `power_state` column

Both RVTools and LiveOptics parsers now emit `vmRowsByScope: Map<string, VmRow[]>` alongside the aggregate counters. The `power_state` column is resolved via aliases (`Powerstate`, `Power State`, `PowerState`, `power_state`) and normalized to `"poweredOn" | "poweredOff" | undefined`. When the column is absent, the `Exclude powered-off` toggle is disabled.
