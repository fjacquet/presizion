# Presizion -- Troubleshooting Guide

This guide covers common issues, their causes, and solutions for the Presizion cluster sizing application.

---

## 1. File Import Issues

### "Unsupported file type" error

**Cause:** The file extension is not `.xlsx`, `.csv`, `.zip`, or `.json`. Presizion validates the extension before reading the file contents.

**Solution:**

- Rename the file if it has an incorrect extension (e.g., `.xls` renamed to `.xlsx` will not work -- the file must actually be in xlsx format).
- If you have an `.xls` file (legacy Excel), open it in Excel or LibreOffice and re-save as `.xlsx`.

### "Wrong file signature" error

**Cause:** The file has an `.xlsx` or `.zip` extension but does not contain valid ZIP magic bytes (`PK\x03\x04`). This happens when a file is renamed without being converted, or when a download was corrupted.

**Solution:**

- Re-download the file from the source application (RVTools, LiveOptics).
- Open the file in Excel to verify it is not corrupted, then re-save.

### "Unrecognised xlsx format" -- expected vInfo or VMs sheet

**Cause:** The xlsx file does not contain a sheet named `vInfo` (RVTools) or `VMs` (LiveOptics). Presizion identifies the source format by looking for these specific sheet names.

**Solution:**

- For RVTools: ensure you exported using **File > Export All to xlsx**. A partial export may not include the `vInfo` sheet.
- For LiveOptics: ensure you are uploading the VMWARE export file, not the GENERAL or AIR file. The VMWARE file contains the `VMs` sheet.
- Open the file in Excel and check the sheet tab names at the bottom. The exact names `vInfo` and `VMs` are required (case-sensitive).

### "Missing required columns" error

**Cause:** The parser found the correct sheet but could not locate required columns. For both RVTools and LiveOptics, the required columns are `vm_name` and `num_cpus`. The parser tries multiple alias names for each column (e.g., `CPUs`, `Num CPUs`, `vCPUs` for the CPU count column) but none matched.

**Details of column aliases tried:**

| Canonical field | RVTools aliases | LiveOptics aliases |
|---|---|---|
| vm_name | VM, VM Name | VM Name |
| num_cpus | CPUs, Num CPUs, vCPUs | Virtual CPU, vCPU, CPUs |

**Solution:**

- Check that the spreadsheet headers have not been renamed or translated. Presizion trims whitespace from headers but requires exact name matches (case-sensitive).
- If headers were customized, rename them back to standard names before importing.

### "Unrecognised CSV format" error

**Cause:** The CSV file's first line does not contain `VM Name` or `VM OS`, which are the markers Presizion uses to identify a LiveOptics CSV export.

**Solution:**

- Presizion only supports LiveOptics CSV format. RVTools exports should be in xlsx format.
- Verify the CSV was exported directly from LiveOptics without manual editing of the header row.

### Multi-cluster data handling

**Behavior:** When an import file contains VMs from multiple clusters or datacenters, Presizion detects them automatically. For RVTools, it reads the `Cluster` and `Datacenter` columns. For LiveOptics, it reads equivalent columns. A scope selector appears in the Import Preview modal so you can choose a specific cluster.

**Common issues:**

- If the `Cluster` column is missing or empty, all VMs are grouped under a single scope labeled "All". This is normal for single-cluster exports.
- Scope labels follow the format `ClusterName (DatacenterName)` when both fields are present.

### No .xlsx file found inside ZIP

**Cause:** The uploaded ZIP archive does not contain any `.xlsx` files.

**Solution:**

- Ensure you are uploading the original LiveOptics ZIP export, not a re-packaged archive.
- Extract the ZIP manually and check its contents. Upload the `.xlsx` file directly instead.

### ZIP selects the wrong file

**Cause:** When a ZIP contains multiple xlsx files, Presizion scores them by richness: RVTools `vInfo` sheet (score 3) > LiveOptics `ESX Hosts` sheet (score 2) > LiveOptics `VMs` sheet only (score 1) > unknown (score 0). It picks the highest-scoring file.

**Solution:**

- If the wrong file is selected, extract the ZIP and upload the correct xlsx file directly.

### Large file performance

**Cause:** xlsx parsing runs entirely in the browser using the `@e965/xlsx` library. Files with tens of thousands of rows may take several seconds to parse.

**Recommendations:**

- Files under 10,000 VMs typically parse in under 2 seconds.
- For very large environments, consider exporting only the relevant cluster from RVTools rather than the entire vCenter.
- Close other browser tabs to free memory during import.

### "No non-template VMs found" warning

**Cause:** All rows in the vInfo/VMs sheet have the Template column set to TRUE. Presizion excludes template VMs from the count.

**Solution:**

- Verify the export contains powered-on VMs, not just templates.
- If you intentionally want to include templates, ensure the Template column is set to FALSE for those rows.

---

## 2. Calculation Issues

### pCores field shows 0 or is empty after import

**Cause:** The Total pCores field is derived from host-level data. RVTools does not populate this from the `vInfo` sheet alone -- it requires the `vHost` sheet. LiveOptics populates it from the `ESX Hosts` sheet, but GENERAL-type exports lack this sheet.

**Solution:**

- Enter the existing server configuration manually: **Existing Server Count**, **Sockets/Server**, and **Cores/Socket**. Presizion auto-derives Total pCores as `existingServerCount x socketsPerServer x coresPerSocket`.
- For LiveOptics, use the VMWARE export file which includes the ESX Hosts sheet.

### SPECint fields are missing or greyed out

**Cause:** SPECrate2017 mode requires three values to produce a meaningful CPU-limited count:

1. `Existing Server Count` (Step 1)
2. `SPECrate2017_int_base / Server (existing)` (Step 1)
3. `SPECrate2017_int_base / Server (target)` (scenario card in Step 2)

If any of these are zero or blank, `serverCountBySpecint` returns 0 and the CPU constraint effectively becomes inactive (RAM or disk will drive the count).

**Solution:**

- Fill in all three SPECint-related fields.
- Find scores at [spec.org/cpu2017/results/](https://www.spec.org/cpu2017/results/) -- filter by "Integer Rate" and search for your server model. Use the `SPECrate2017_int_base` column.
- Do not mix SPECrate2006 and SPECrate2017 scores.

### Unexpected server count (too high)

**Common causes:**

1. **RAM is the limiting resource.** Check the "Limiting Resource" indicator in Step 2 results. If it says "ram", the RAM/VM GB value or RAM/Server GB value is driving the count. Verify that RAM/VM GB reflects your actual average, not the maximum provisioned RAM.

2. **Headroom is compounding.** A 30% headroom means the formula multiplies demand by 1.30. Combined with conservative ratios, this can push server counts up significantly.

3. **Disk constraint is active (HCI mode).** In HCI layout mode, disk is included as a sizing constraint. If your VMs have large provisioned disks, switch to **Disaggregated** layout mode if storage is external (SAN/NAS).

4. **N+1 HA reserve is enabled.** This adds 1 (or more) server(s) after the constraint maximum. Disable it if you are sizing a non-production cluster.

### Unexpected server count (too low)

**Common causes:**

1. **Utilization right-sizing is active.** If CPU or RAM utilization percentages are entered in Step 1, the formulas scale demand down accordingly. A 50% CPU utilization means only half the vCPUs are counted as real demand.

2. **Aggressive mode is active.** This mode bypasses the vCPU:pCore ratio cap entirely and uses observed CPU utilization to drive density. It can produce significantly fewer servers but carries overcommit risk.

3. **Target VM Count override.** If a scenario has `targetVmCount` set, RAM and disk formulas use that count instead of the cluster's total VMs, and vCPUs are scaled proportionally.

### Zero or NaN results

**Cause:** Division by zero in the formula. This occurs when:

- `coresPerServer` is 0 (Sockets/Server or Cores/Socket is 0)
- `ramPerServerGb` is 0
- `diskPerServerGb` is 0
- `targetVcpuToPCoreRatio` is 0
- In GHz mode: either CPU frequency is 0

**Solution:**

- Ensure all scenario card fields have positive non-zero values.
- The formula functions guard against `targetSPECint <= 0` and frequency `<= 0` by returning 0, but other fields are expected to be positive by design.

### Disk constraint shows 0 servers

**Cause:** Layout mode is set to **Disaggregated**. In this mode, disk is excluded from sizing because storage is assumed to be external (SAN/NAS). The disk-limited count is hardcoded to 0.

**Solution:**

- If your servers have local storage (HCI/vSAN), switch the layout mode back to **HCI** using the toggle in the header.

---

## 3. Export and Sharing Issues

### Clipboard "Copy Summary" not working

**Cause:** The Clipboard API (`navigator.clipboard.writeText`) requires a secure context. It will fail silently or throw an error in these situations:

- The page is served over HTTP (not HTTPS)
- The page is embedded in an iframe without the `clipboard-write` permission
- The browser has denied clipboard access (user rejected the permission prompt)

**Solution:**

- Access Presizion over HTTPS. When running locally via `npm run dev`, Vite serves on `http://localhost` which most browsers treat as a secure context.
- If using a corporate proxy or reverse proxy, ensure HTTPS is configured.
- Check browser permissions: in Chrome, click the lock/tune icon in the address bar and verify Clipboard is set to "Allow".
- As a workaround, use **Download JSON** or **Download CSV** instead of clipboard copy.

### CSV encoding issues

**Behavior:** The CSV export uses RFC 4180 format with UTF-8 encoding. Fields containing commas, double quotes, or newlines are escaped with double-quote wrapping and internal quote doubling.

**Common issues:**

- **Excel shows garbled characters for non-ASCII text:** Excel may not auto-detect UTF-8 encoding. Open Excel, use File > Import > CSV, and select UTF-8 as the encoding.
- **Numbers treated as text in Excel:** This is an Excel behavior, not a Presizion issue. The CSV contains plain numeric values without formatting.
- **Semicolon-separated locales:** Some European Excel installations expect semicolons. The CSV always uses commas. Change Excel's list separator in system regional settings, or import manually.

### URL hash too long

**Cause:** The Share button encodes the entire session (cluster data + all scenarios) as a base64url string in the URL hash fragment. With many scenarios or long scenario names, the URL can exceed browser limits (typically 2,000-8,000 characters depending on the browser).

**Symptoms:**

- The URL is truncated when pasted into email clients or chat applications
- The shared link fails to restore the session (decoding returns null)

**Solution:**

- Reduce the number of scenarios before sharing.
- Use **Download JSON** and send the file instead of a URL.
- The URL hash uses base64url encoding (no padding, `+` replaced with `-`, `/` replaced with `_`). There is no compression applied, so the URL length is approximately 1.37x the JSON size.

### JSON re-import validation failures

**Cause:** The JSON parser validates the structure strictly. It requires:

- A top-level `schemaVersion` field
- A `currentCluster` object with valid numeric fields (`totalVcpus`, `totalPcores`, `totalVms`)
- A `scenarios` array where each entry has valid numeric fields

**Common failures:**

- `"JSON file is not a Presizion export"` -- the file is missing `schemaVersion`, `currentCluster`, or `scenarios` at the top level.
- `"JSON field "X" is not a valid number"` -- a numeric field contains a non-finite value (e.g., null, undefined, or a string that cannot be parsed as a number). The JSON export writes `null` for missing optional fields, but required fields must be valid numbers.
- Manually edited JSON with typos in field names will cause fields to be silently ignored (the parser only reads known fields).

**Solution:**

- Do not manually edit exported JSON files unless you understand the schema.
- Re-export from Presizion if the file is corrupted.
- Verify the JSON structure matches schema version 1.1 (the current format).

---

## 4. UI and Display Issues

### Dark mode flash on page load

**Behavior:** A brief flash of light background before dark mode applies.

**How it is prevented:** Presizion includes an inline script in `index.html` that runs before React loads. It reads the `presizion-theme` key from localStorage and adds the `dark` class to `<html>` immediately if the stored theme is `dark` or if no preference is stored and the OS prefers dark mode (`prefers-color-scheme: dark` media query).

**If a flash still occurs:**

- The anti-flash script may have been removed or modified during a custom build. Verify that the inline `<script>` block exists in the `<head>` of `index.html`.
- Content Security Policy (CSP) headers that block inline scripts will prevent the anti-flash script from running. Add a nonce or hash exception for this script.

### Theme not persisting across sessions

**Cause:** The theme is stored in localStorage under the key `presizion-theme`. If localStorage is unavailable or cleared, the theme reverts to `system` (follows OS preference).

**Solution:**

- Verify localStorage is available (see Section 5).
- Some browsers clear localStorage in private/incognito mode when the window is closed.
- Browser extensions that auto-clear site data may remove the stored preference.

### "Leave site?" warning dialog

**Behavior:** When you are on Step 2 or Step 3 and try to close the tab, refresh the page, or navigate away, the browser shows a "Leave site?" or "Changes you made may not be saved" dialog.

**Cause:** This is intentional. The `useBeforeUnload` hook registers a `beforeunload` event listener when `currentStep > 1` to prevent accidental data loss.

**To avoid the warning:**

- Download your session as JSON before leaving the page.
- Navigate back to Step 1 -- the warning is only active on Steps 2 and 3.

### Print layout issues

**Behavior:** The header, step indicator, navigation buttons, and mode toggles are hidden when printing (via the `print:hidden` CSS class). Only the main content area is printed.

**Common issues:**

- **Charts not rendering in PDF:** Some browsers do not render canvas-based charts in print mode. Use the browser's built-in "Save as PDF" option from the print dialog for best results.
- **Wide tables clipped:** Set the print orientation to Landscape in the print dialog.
- **Background colors missing:** Enable "Background graphics" in the print dialog settings.

---

## 5. Browser Compatibility

### Minimum browser requirements

Presizion is a modern React application built with Vite. It requires:

| Feature | Minimum Version |
|---|---|
| Chrome / Edge | 88+ |
| Firefox | 85+ |
| Safari | 14+ |

Key browser APIs used:

- `crypto.randomUUID()` -- for generating scenario IDs (Chrome 92+, Firefox 95+, Safari 15.4+)
- `navigator.clipboard.writeText()` -- for copy-to-clipboard (requires secure context)
- `structuredClone()` -- for deep object copies (Chrome 98+, Firefox 94+, Safari 15.4+)
- `btoa()` / `atob()` -- for URL hash encoding (universally supported)
- `ArrayBuffer` / `Uint8Array` -- for file parsing (universally supported)

### localStorage availability

Presizion uses localStorage for two purposes:

1. **Session persistence** (`presizion-session` key) -- saves cluster data and scenarios so they survive page refreshes.
2. **Theme preference** (`presizion-theme` key) -- stores light/dark/system selection.

**When localStorage is unavailable:**

- Private/incognito browsing in some browsers restricts localStorage. Presizion will still function but will not persist data across page refreshes.
- Corporate environments with restrictive policies may block localStorage entirely. All `try/catch` guards in the persistence layer handle this gracefully -- no errors are thrown, but data will not persist.
- If `localStorage.setItem` throws (e.g., quota exceeded), the write is silently ignored.

**To test:** Open the browser console and run `localStorage.setItem('test', '1')`. If it throws a `SecurityError`, localStorage is blocked.

### Offline capability

Presizion is a fully client-side application. Once loaded, it does not make any network requests. All calculations run in the browser.

**However:**

- The initial page load requires network access to fetch the HTML, JS, and CSS bundles.
- There is no service worker or offline cache configured. If you refresh the page while offline, it will fail to load.
- File imports (xlsx parsing) use dynamically imported libraries (`@e965/xlsx`, `jszip`). These are bundled in the application and do not require network access after the initial load.

---

## 6. Data Recovery

### Session lost after page refresh

**Cause:** If localStorage is available and working, sessions are automatically saved. A lost session after refresh indicates one of:

- localStorage is blocked or unavailable (see Section 5)
- The stored session failed Zod schema validation during deserialization (e.g., after an application update that changed the schema)
- The browser cleared site data (manual clear, privacy settings, or extension)

**Recovery options:**

1. Check if the data is still in localStorage: open the browser console and run `localStorage.getItem('presizion-session')`. If it returns a JSON string, the data exists but may have failed validation.
2. If you shared a URL with the session hash, open that URL to restore.
3. If you previously downloaded a JSON export, re-import it.

### Restoring from a URL hash

**How it works:** The Share button generates a URL like `https://.../#eyJj...`. The hash contains a base64url-encoded JSON session. When Presizion loads, it checks `window.location.hash` and decodes it using `decodeSessionFromHash()`.

**If the URL hash does not restore:**

- The hash may have been truncated (see "URL hash too long" above).
- The hash decoding is lenient: it accepts hashes with or without the leading `#`, restores standard base64 from URL-safe characters, and adds padding. But if the base64 is corrupted, `atob()` will throw and the function returns `null`.
- If the hash is valid base64 but fails Zod schema validation (e.g., missing required fields), it returns `null` silently.
- Try decoding manually in the browser console: `atob(location.hash.slice(1).replace(/-/g,'+').replace(/_/g,'/'))` to inspect the raw JSON.

### Clearing stuck state

**Symptoms:** The application shows stale or corrupted data, forms behave unexpectedly, or the UI is stuck in an inconsistent state.

**Solution:**

1. **Clear session data only:** Open the browser console and run:

   ```js
   localStorage.removeItem('presizion-session')
   ```

   Then refresh the page. This clears the saved cluster and scenario data without affecting the theme preference.

2. **Clear all Presizion data:** To reset everything including theme preference:

   ```js
   localStorage.removeItem('presizion-session')
   localStorage.removeItem('presizion-theme')
   ```

   Then refresh the page.

3. **Clear URL hash:** If the URL contains a hash that is causing issues, navigate to the base URL without the hash fragment, or run:

   ```js
   history.replaceState(null, '', location.pathname)
   ```

   Then refresh.

4. **Hard refresh:** Use Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (macOS) to bypass the browser cache and reload all assets.

---

## 7. Quick Reference: Error Messages

| Error Message | Source | Fix |
|---|---|---|
| Unsupported file type "X" | fileValidation.ts | Use .xlsx, .csv, .zip, or .json |
| File does not appear to be a valid .xlsx file | fileValidation.ts | Re-export or re-download the file |
| vInfo sheet not found | rvtoolsParser.ts | Use RVTools "Export All to xlsx" |
| VMs sheet not found in LiveOptics xlsx | liveopticParser.ts | Use the VMWARE export, not GENERAL/AIR |
| Missing required columns: X | columnResolver.ts | Check that column headers match expected names |
| Unrecognised CSV format | formatDetector.ts | Only LiveOptics CSV is supported |
| No .xlsx file found inside the zip archive | formatDetector.ts | Verify ZIP contents; upload xlsx directly |
| No suitable xlsx found in zip | formatDetector.ts | ZIP lacks RVTools or LiveOptics files |
| JSON file is not a Presizion export | jsonParser.ts | File is missing schemaVersion/currentCluster/scenarios |
| JSON field "X" is not a valid number | jsonParser.ts | A required numeric field is null or non-numeric |
| Invalid JSON file | jsonParser.ts | File contains malformed JSON syntax |
