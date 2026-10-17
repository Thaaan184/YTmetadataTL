# TubeGlot Privacy & Data Flow Specification

> **Document ID:** PRIVACY-DATA-FLOW  
> **Version:** 1.0.0  
> **Status:** Released  
> **Last Updated:** October 17, 2026

---

## 1. Core Architecture Principles

1. **Zero-Backend Guarantee:**
   TubeGlot does not maintain, contact, or depend on any project-operated servers, cloud functions, tracking pixels, or proxy middleboxes.
2. **Local-First Execution:**
   Subtitle parsing, validation, cue splitting, serialization, and time calculation occur entirely inside the local browser V8 runtime.
3. **No Central Analytics or Telemetry:**
   No telemetry SDKs (Google Analytics, Sentry, Mixpanel, etc.) are included in the codebase or extension manifest.
4. **Direct Point-to-Point Network Communication:**
   Network calls exit the extension only in two explicit scenarios:
   - To the user-selected LLM Provider endpoint (e.g., local 9Router at `http://localhost:20128/v1`, local Ollama at `http://localhost:11434`, or user-specified custom endpoint).
   - To official Google YouTube Data API endpoints (`https://www.googleapis.com/*`) solely when the user explicitly triggers direct YouTube Studio actions.

---

## 2. Data Flow Diagram

```text
[ User Desktop / Browser ]
┌────────────────────────────────────────────────────────┐
│  TubeGlot Extension Popup (Chrome MV3)                 │
│                                                        │
│  1. Parse Subtitles / Metadata                         │
│     - Input: .srt / .vtt or title/description strings  │
│     - Timing & formatting tags isolated                │
│                                                        │
│  2. Dispatch to AI Provider                            │
│     ├─► [Local 9Router Gateway] (http://127.0.0.1:20128)│
│     ├─► [Local Ollama]          (http://127.0.0.1:11434)│
│     └─► [Custom HTTPS LLM]      (https://api.openai...)│
│                                                        │
│  3. Validate & Reassemble                              │
│     - Match cue IDs 1:1                                │
│     - Preserve timestamps and structure                │
│                                                        │
│  4. Output Channel (User Choice)                       │
│     ├─► Option A: Local File Download (.srt / .vtt)    │
│     ├─► Option B: Clipboard (1-click copy)             │
│     └─► Option C (Optional): Direct to YouTube Studio  │
│             (via official Google OAuth & API)          │
└────────────────────────────────────────────────────────┘
```

---

## 3. Credential Handling & Storage

| Credential Type | Default Storage | Opt-In Local Storage | Redaction Guarantees |
|---|---|---|---|
| **AI Provider API Key** | Volatile in-memory session only | Unencrypted `chrome.storage.local` with explicit warning | Redacted from all network logs, error banners, and URLs via `redactSecrets()`. |
| **Google OAuth Access Token** | Volatile in-memory variable (`inMemoryAccessToken`) | Never stored to disk; cleared on disconnect or browser restart | Redacted via `redactSecrets()` and `redactText()`. |
| **OAuth Client Secret** | **Never used / forbidden** | Forbidden | Uses OAuth 2.0 PKCE / token flow without secrets. |

---

## 4. YouTube & Chrome Policy Compliance

- TubeGlot uses only public, official YouTube Data API v3 endpoints.
- No undocumented, private, or scraped YouTube internal endpoints are accessed.
- Host permissions are strictly restricted to `https://www.googleapis.com/*`.
- All requests are initiated by explicit user button clicks; no automated background tasks or polling daemons run while idle.
