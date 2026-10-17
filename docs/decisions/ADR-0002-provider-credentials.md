# ADR-0002: Provider Credential Handling and Storage Strategy

- **Status:** Accepted
- **Date:** 2026-10-17
- **Deciders:** Tech Lead, Security/Privacy Agent, Architecture Agent
- **Consulted:** Repository Owner

---

## Context
In a backend-free extension, API keys cannot be stored in a server-side secret manager or environment variable on a server. If stored carelessly on the client, keys can leak into git repositories, build bundles, logs, or extension exports.

## Decision
We enforce strict credential hygiene rules across the codebase:
1. **Zero Secret in Code/Bundle:**
   - No hardcoded API keys, tokens, or default secrets anywhere in source code, tests, fixtures, or `.env` files.
   - Build-time variables (`VITE_*`) must never carry secrets, as they are compiled directly into public client JavaScript.
2. **Session-Only Storage Default:**
   - By default, user-provided API keys are retained only in memory during the active browser session (`sessionStorage` or extension memory).
   - Any optional feature to persist keys across browser restarts (`chrome.storage.local`) must be strictly opt-in and explicitly display a clear security notice: *Chrome extension storage is stored locally on disk and is not encrypted by Chrome*.
3. **Strict Redaction in Logs and Errors:**
   - Normalized error and logger utilities must strip `Authorization`, `Bearer`, `api-key`, and URL query parameters containing keys before presenting diagnostics or recording debug events.
4. **Endpoint Validation:**
   - Remote provider URLs must strictly require HTTPS. Plain HTTP is forbidden except for loopback addresses (`localhost`, `127.0.0.1`, `[::1]`).
   - Requests must never be routed through unapproved cross-origin redirects carrying Authorization headers.

## Consequences

### Positive
- Prevents accidental token exposure via git pushes, open-source releases, or extension bundling.
- Protects users from silent credential exfiltration.
- Transparent user expectations regarding local browser storage security.

### Negative / Trade-offs
- Users on session-only mode may need to re-enter their API key upon restarting Chrome if they decline persistence.
