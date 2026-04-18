# ADR-021: VM exclusion rules persist, raw rows do not

## Status
Accepted — 2026-04-17

## Context
Issue #13 requires letting users exclude individual VMs from the sizing
calculation. Possible approaches ranged from storing filtered aggregates
(no round-trip) to persisting every VM row (no URL-hash support at scale).

## Decision
Persist only the `ExclusionRules` object (globs + exact names + flags +
manual overrides) in localStorage, JSON exports, and URL hashes.
Raw per-VM rows stay session-only on `useImportStore`, discarded on
reload. Post-reload the rules UI is read-only; users re-import to edit.

## Rationale
- URL hashes have an ~8 KB ceiling; VM rows at enterprise scale exceed it
  by orders of magnitude.
- Rules express intent and are forward-compatible with re-imports of a
  fresher source file — e.g. after a month, re-importing applies the
  same `test-*` pattern without manual recreation.
- Aggregates already reflect the post-exclusion snapshot, so sharing or
  reload still reproduces the sizing numbers.

## Consequences
- (+) Small persisted payload; scales to clusters of any size.
- (+) Rules can be shared and re-applied to a newer source file.
- (-) Users who reload mid-session cannot tweak per-row overrides
      without re-importing.
- (-) `manuallyExcluded` / `manuallyIncluded` lists grow with user
      input; URL hash encoder truncates them when over budget.

## Related decisions
- Glob-over-regex for `namePattern` — ReDoS-safe by construction.
- JSON schema v2 adds an optional `exclusions` block; v1 files migrate
  in by injecting `EMPTY_RULES`.
