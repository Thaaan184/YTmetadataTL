# TubeGlot Documentation Index

Welcome to the internal engineering and architectural documentation for **TubeGlot**.

---

## 📚 Core Documents

| Document | Purpose |
|---|---|
| [Master Specification (`docs/plan.md`)](./plan.md) | The comprehensive 17-phase agentic engineering plan and technical requirements. |
| [Agent Work Ledger (`docs/agent-ledger.md`)](./agent-ledger.md) | Tracking record of all agent tasks (TG-001 through TG-015), risk classes, and review sign-offs. |
| [Privacy & Data Flow (`docs/privacy-and-data-flow.md`)](./privacy-and-data-flow.md) | Zero-backend guarantees, local-first data processing, and point-to-point network policies. |
| [Threat Model (`docs/threat-model.md`)](./threat-model.md) | Security analysis: prompt injection defenses, credential redaction, and quota safeguards. |
| [Smoke Test Checklist (`docs/smoke-test.md`)](./smoke-test.md) | Step-by-step manual QA verification checklist for releases. |
| [Troubleshooting Guide (`docs/troubleshooting.md`)](./troubleshooting.md) | Solutions for common Git, 9Router connectivity, subtitle parsing, and OAuth issues. |
| [YouTube API Policy (`docs/youtube-api-policy.md`)](./youtube-api-policy.md) | Official YouTube Data API v3 quota costs, scopes, and read-modify-write invariants. |
| [Initial Repository Audit (`docs/initial-audit.md`)](./initial-audit.md) | Baseline audit report performed prior to initial code authoring. |
| [Risk Register (`docs/risks.md`)](./risks.md) | Initial technical, platform, and operational risk mitigation matrix. |

---

## 🏛️ Architectural Decision Records (ADRs)

All significant technical and architectural choices are recorded in [`docs/decisions/`](./decisions/):

- **[ADR-0001: Backend-Free Architecture](./decisions/ADR-0001-backend-free-architecture.md)** — Decision to operate 100% inside Chrome MV3 without central servers or credit tracking.
- **[ADR-0002: Provider Credentials & Storage](./decisions/ADR-0002-provider-credentials.md)** — In-memory session key storage by default, strict HTTPS enforcement, and error redaction.
- **[ADR-0003: YouTube OAuth Integration](./decisions/ADR-0003-youtube-oauth-integration.md)** — Client-side BYOK OAuth 2.0 PKCE integration with mandatory confirmation preview gates.
