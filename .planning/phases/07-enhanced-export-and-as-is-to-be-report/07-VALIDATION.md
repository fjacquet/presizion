---
phase: 7
slug: enhanced-export-and-as-is-to-be-report
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.0 with jsdom + @testing-library/react |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `rtk vitest run` |
| **Full suite command** | `rtk vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds (222 tests baseline) |

---

## Sampling Rate

- **After every task commit:** Run `rtk vitest run`
- **After every plan wave:** Run `rtk vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green + `npm run build` clean
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 7-01-01 | 01 | 1 | REPT-02 | unit | `rtk vitest run src/components/step1/__tests__/` | ✅ (extend) | ⬜ pending |
| 7-01-02 | 01 | 1 | REPT-01 | unit | `rtk vitest run src/components/step3/__tests__/` | ✅ (extend) | ⬜ pending |
| 7-02-01 | 02 | 2 | EXPO-03 | unit | `rtk vitest run src/lib/utils/__tests__/` | ❌ Wave 0 | ⬜ pending |
| 7-02-02 | 02 | 2 | EXPO-04 | unit + manual | `rtk vitest run src/__tests__/printCss.test.ts` | ❌ Wave 0 | ⬜ pending |
| 7-02-03 | 02 | 2 | build | build | `npm run build 2>&1 \| tail -5` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/utils/__tests__/export.test.ts` — add `it.todo` stubs for `buildJsonContent` and `downloadJson` (EXPO-03)
- [ ] `src/__tests__/printCss.test.ts` — new file, checks `index.css` contains `print-color-adjust: exact` (EXPO-04 automatable portion)
- [ ] `src/components/step3/__tests__/ComparisonTable.test.tsx` — add `it.todo` stubs for As-Is column (REPT-01)
- [ ] `src/components/step1/__tests__/CurrentClusterForm.test.tsx` — add `it.todo` stubs for `existingServerCount` unconditional + `totalPcores` auto-derive (REPT-02)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `@media print` hides buttons and wizard chrome | EXPO-04 | Print rendering not automatable in jsdom | `npm run dev`, Step 3, Ctrl+P — confirm no buttons, no step tabs visible |
| Print layout fits A4/Letter width, no clipped columns | EXPO-04 | Visual layout requires browser print preview | `npm run dev`, Step 3, Ctrl+P — confirm table fits page width, no horizontal scroll |
| Utilization color coding preserved in print | EXPO-04 | `print-color-adjust` effect only visible in print | Enable ink preview in browser print settings; confirm red/amber/green cells retain color |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
