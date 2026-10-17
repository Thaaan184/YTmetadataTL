# Changelog

All notable changes to the TubeGlot project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-10-17

### Added
- **Core Subtitle Engine:**
  - Robust `.srt` and `.vtt` (WebVTT) parsers and serializers with UTF-8 BOM, CRLF, and multiline cue support.
  - Subtitle cue timing preservation: source timestamps and cue indices remain programmatically locked during translation.
  - Inline tag tokenizer and protector (`<b>`, `<i>`, `<v Speaker>`, `<c.style>`).
  - Strict cue count and ID reassembly validation.
- **AI Provider Abstraction:**
  - **9Router Local Gateway:** First-class default preset for 9Router (`http://localhost:20128/v1`).
  - **Ollama Local Provider:** Integration with local Ollama (`http://localhost:11434`) via JSON chat completions.
  - **OpenAI-Compatible Adapter:** Generic endpoint support with exponential backoff and timeout handling.
  - In-memory session key storage with credential redaction utilities.
- **YouTube Localization & Metadata:**
  - 17 supported YouTube locales and BCP-47 regional mapping.
  - YouTube title ($\le 100$) and description ($\le 5000$) schema validators with live character counters.
  - Tag and keyword generation suggestions.
- **Extension UI (Chrome Manifest V3):**
  - High-contrast accessible dark theme built with zero CSS dependencies.
  - 3-tab layout: Subtitles (drag-and-drop), Metadata, and Settings.
  - Real-time chunking progress bars with cancellation support.
  - 1-click clipboard actions and file download buttons.
- **YouTube Studio Direct Integration (Optional Phase 6):**
  - Optional client-side Google OAuth 2.0 PKCE flow.
  - Direct video metadata fetch and safe read-modify-write updater preserving existing fields.
  - Direct multipart subtitle uploader.
  - Mandatory confirmation modal with diff preview and quota cost calculation.
- **Hardening & Documentation (Phase 9):**
  - Privacy and Data Flow specification (`docs/privacy-and-data-flow.md`).
  - Comprehensive Threat Model (`docs/threat-model.md`).
  - Manual Smoke Testing checklist (`docs/smoke-test.md`).
  - Troubleshooting guide (`docs/troubleshooting.md`).
  - Open-source governance (`CONTRIBUTING.md`, `LICENSE`, `docs/agent-ledger.md`).
