# ADR-0001: Backend-Free Architecture and Local-First Operation

- **Status:** Accepted
- **Date:** 2026-10-17
- **Deciders:** Tech Lead, Architecture Agent, Security/Privacy Agent
- **Consulted:** Repository Owner

---

## Context
Commercial YouTube metadata localization and subtitle translation tools (such as VidAI) utilize subscription and credit models enforced by centralized cloud backends. The owner requires an open-source, personal-first tool without credit quotas, ongoing server hosting expenses, or third-party tracking.

## Decision
We adopt a **backend-free, client-side Chrome Extension (Manifest V3)** architecture:
1. **Zero Central Backend:** The extension operates entirely within the user's browser runtime. There is no intermediate server, proxy, telemetry collector, or account database.
2. **Bring Your Own Key (BYOK) / Local Endpoint:** All AI translation and metadata generation calls are dispatched directly from the extension context to the user's configured endpoint:
   - A remote OpenAI-compatible provider (e.g., DeepSeek, OpenAI, Groq) using the user's personal API key.
   - A local inference server (e.g., Ollama running at `http://localhost:11434` or a local gateway).
3. **Pure Core Logic:** Subtitle parsing, cue reassembly, formatting token validation, and metadata schema checks are executed by zero-dependency TypeScript modules running locally on the user's device.

## Consequences

### Positive
- Zero recurring hosting or maintenance infrastructure costs.
- Complete user privacy: source scripts and video metadata are never routed through an intermediary server.
- No artificial monthly token or credit caps; usage is governed solely by the user's provider account or local hardware.
- Easily published as an open-source tool that anyone can clone, audit, and build.

### Negative / Trade-offs
- The browser must hold network permissions to connect to configured AI endpoints.
- Because extension storage is local and unencrypted by Chrome, API keys must be managed with high discipline (addressed in ADR-0002).
- Users are responsible for providing their own API keys or configuring a local LLM runner.
