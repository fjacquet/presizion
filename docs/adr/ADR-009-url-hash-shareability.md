# ADR-009: URL Hash Shareability

**Date:** 2026-03-14
**Status:** Accepted
**Milestone:** v1.3

## Context

Presales engineers need to share sizing sessions with colleagues and customers. The application is a fully client-side static web app with no backend or database. Sharing options considered:

1. **Backend persistence**: Store sessions server-side, generate a short URL. Requires infrastructure, authentication, and ongoing maintenance.
2. **File export/import**: Export a JSON file and re-import it. Already supported but requires file transfer and manual steps.
3. **URL hash encoding**: Encode the full session state into the URL hash fragment (`#...`), producing a self-contained shareable link.

## Decision

Session state is encoded into the URL hash fragment using base64url encoding. The encoding pipeline is:

```
SessionData -> JSON.stringify() -> btoa() -> base64url (replace +/= with -/_/empty)
```

Decoding reverses the process:

```
URL hash -> restore standard base64 -> atob() -> JSON.parse() -> Zod schema validation -> SessionData
```

The implementation lives in `src/lib/utils/persistence.ts` as two pure functions:

- `encodeSessionToHash(data: SessionData): string`
- `decodeSessionFromHash(hash: string): SessionData | null`

`SessionData` contains the full cluster configuration, all scenarios, sizing mode, and layout mode.

## Rationale

- **No backend required**: Consistent with the project's architecture principle that all logic runs in the browser. No server, no database, no authentication.
- **Instant sharing**: A presales engineer can copy the URL and paste it into Slack, email, or a ticket. The recipient opens the link and sees the exact same sizing session.
- **Stateless and ephemeral**: The URL is self-contained. No session ID to expire, no storage quota to manage, no cleanup jobs.
- **Zod validation on decode**: The `sessionSchema` validates the decoded JSON against the same schemas used for forms. Malformed or tampered URLs return `null` rather than crashing.
- **base64url over standard base64**: Standard base64 uses `+`, `/`, and `=` which are problematic in URLs. The base64url variant (`-`, `_`, no padding) is URL-safe without percent-encoding.

## Consequences

- URL length is proportional to session complexity. A typical session with 2-3 scenarios produces a hash of ~2-4 KB, well within browser URL limits (~64 KB in modern browsers, ~2 KB for safe cross-platform compatibility with older tools).
- The hash is not human-readable. This is acceptable since it is not intended for manual editing.
- Schema evolution: if `SessionData` fields are added or renamed, old hashes may fail Zod validation. The `deserializeSession()` function returns `null` in this case, allowing the app to fall back to a clean state. Zod defaults (e.g., `sizingMode` defaults to `'vcpu'`) provide forward compatibility for additive changes.
- The hash does not include imported raw data (VM lists, host inventories) -- only the aggregated `OldCluster` and `Scenario` configurations. This keeps the URL size manageable.
- Hash boot priority: on page load, URL hash takes precedence over localStorage, enabling shared links to override local state.
