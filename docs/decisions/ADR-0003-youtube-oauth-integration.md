# Architectural Decision Record (ADR-0003)

## Title
Client-Side BYOK OAuth 2.0 Integration for YouTube Data API v3

## Status
Accepted

## Context
Phase 6 specifies optional official YouTube API integration to eliminate manual download/upload workflows in YouTube Studio. However, non-negotiable rules forbid:
1. Hardcoding OAuth client secrets in code or repositories.
2. Central project-operated backends or proxy authentication servers.
3. Excessive Chrome extension permissions (`<all_urls>`).
4. Silent or automated background mutations without user confirmation.

## Decision
1. **BYOK (Bring-Your-Own-Key) Client ID Configuration**:
   - The user supplies their own Google OAuth 2.0 Client ID (type: Web Application or Chrome Extension) in the TubeGlot Settings view.
   - TubeGlot uses `chrome.identity.launchWebAuthFlow` (or `chrome.identity.getAuthToken` when configured with extension ID) with the implicit grant flow or token response type, completely client-side.
   - Zero client secrets are required or stored.
2. **Minimal Scopes & Least Privilege**:
   - Scope requested: `https://www.googleapis.com/auth/youtube.force-ssl` (required for caption insert/update and video localization metadata updates).
   - Read-only operations (`youtube.readonly`) are insufficient because subtitle upload and metadata editing write to the channel.
3. **In-Memory Token Storage**:
   - Access tokens received via OAuth are held strictly in memory in active session state.
   - Tokens are cleared on browser restart or when the user clicks "Disconnect Account".
   - Tokens are redacted from all error messages and network logging.
4. **Explicit Preview & Write Gate**:
   - Before executing `videos.update` or `captions.insert`, TubeGlot MUST display a diff/preview modal showing the exact fields being modified and require an explicit user button click ("Confirm & Publish to YouTube").
   - Read-modify-write pattern: Existing localized titles/descriptions and categories are preserved.
5. **Quota Protection**:
   - Subtitle insert: 400 quota units per call.
   - Video update: 50 quota units.
   - TubeGlot displays quota warnings before executing batch operations.

## Consequences
- Positive: No backend server required; no credit limits; no central token leaks; complies with Chrome MV3 security policies.
- Trade-off: Users perform a one-time Google Cloud Console setup to create their Client ID and add the extension redirect URI.
