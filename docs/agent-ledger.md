# Agent Work Ledger

> **Document ID:** AGENT-LEDGER  
> **Last Updated:** October 17, 2026  
> **Status:** Active  

This ledger records every engineering task, its classification, assignees, review verdicts, and integration status under the multi-agent operating model defined in `plan.md` Section 7.

---

## Risk Classes Summary
- **R0 — Documentation / Governance:** Non-behavioral documentation, style, or task planning. (1 independent review)
- **R1 — Minor Behavior / UI:** Isolated UI adjustments, ordinary bug fixes, non-sensitive refactoring. (Implementer + independent code/QA review)
- **R2 — Major / Core Architecture:** Subtitle parsing/serializing, provider abstraction, chunking, data models, build configuration. (ADR required, 2 independent reviews, complete tests)
- **R3 — Security / Policy / Irreversible:** Credentials, OAuth/scopes, host permissions, network destinations, YouTube DOM/API integration, release publication. (Security/Privacy review + Policy/Architecture review + Owner approval)

---

## Task History & Queue

| Task ID | Summary | Class | Assignee | Reviewers | Status | Verification & Verdict |
|---|---|:---:|---|---|:---:|---|
| **TG-001** | Repository baseline audit, governance documents initialization, initial ADRs | R0 | Tech Lead / Orchestrator | Architecture, Security/Privacy | Approved | Merged to `main` (`68a0f2a`). Baseline clean. |
| **TG-002** | Project foundation: WXT + TypeScript + Manifest V3, strict `.gitignore`, CI workflow, Vitest runner | R2 | Implementation Agent | Architecture, QA Agent | Approved | Build (`wxt build`) and `tsc --noEmit` pass. CI workflow added. |
| **TG-003** | Subtitle core: Normalized cue model, SRT parser & serializer with roundtrip tests | R2 | Implementation Agent | Architecture, QA Agent | Approved | 100% statement coverage. Tested BOM, CRLF, non-Latin, inverted times. |
| **TG-004** | Subtitle core: WebVTT parser & serializer with header & settings preservation | R2 | Implementation Agent | Architecture, QA Agent | Approved | 100% statement coverage. Tested headers, settings, NOTE/STYLE blocks. |
| **TG-005** | Subtitle core: Cue validator, tag tokenizer (placeholder preservation), adversarial fixtures | R2 | Implementation Agent | QA Agent, Security Agent | Approved | 100% statement coverage. 44/44 tests green, 97.91% branch coverage. |
| **TG-006** | Provider core: Generic provider interface, normalized error hierarchy, mock provider | R2 | Implementation Agent | Architecture, QA Agent | Approved | Mock provider supports synthetic latency, aborts, rate limits. |
| **TG-007** | Provider adapters: OpenAI-compatible & Ollama adapter, timeout, cancellation, credential redaction | R3 | Implementation Agent | Security Agent, QA Agent | Approved | Enforces HTTPS on remote; loopback HTTP; secrets strictly redacted in errors. |
| **TG-008** | Translation jobs: Token/character-aware chunking, per-chunk retry runner, progress reporting | R2 | Implementation Agent | Architecture, QA Agent | Approved | Independent chunk retry, deterministic reassembly with source timestamps. |
| **TG-009** | Localization core: BCP-47 locale registry, YouTube metadata schema & length validation | R2 | Implementation Agent | Architecture, QA Agent | Approved | Title (<=100) and description (<=5000) validated. Tag suggestions separated. |
| **TG-010** | Extension UI: Interactive Popup interface for subtitle & metadata localization with 9Router preset | R1 | Implementation Agent | Code/UX Reviewer, QA Agent | Approved | 111 tests passed, WXT build clean (44.6KB), zero external dependencies, accessible controls. |
| **TG-011** | Policy & Architecture: ADR-0003 BYOK OAuth 2.0 & YouTube API policy specification | R3 | Security & Policy Lead | Architecture, Security/Privacy | Approved | Owner approved. Zero secrets stored, memory-only session tokens, strict read-modify-write. |
| **TG-012** | YouTube API Client: Videos & Captions read/write, multipart upload, quota handling & redaction | R3 | Implementation Agent | Security Agent, QA Agent | Approved | 124 tests pass with >94% coverage. 401/403 quota errors and 404 handled cleanly. |
| **TG-013** | UI YouTube Direct Sync: Google sign-in flow, Studio direct fetch & upload with confirmation preview gate | R3 | Implementation Agent | Code/UX Reviewer, Security Agent | Approved | Mandatory preview modal before write, live quota warning, seamless 1-click publishing. |
| **TG-014** | Open-Source Readiness: Final release candidate hardening, threat model, license & CI verification | R0 | Tech Lead / Implementation Agent | QA Agent, Security Agent | Approved | 124 tests pass, 0 npm audit vulnerabilities, clean MV3 build (60.65KB), zero secrets. |
