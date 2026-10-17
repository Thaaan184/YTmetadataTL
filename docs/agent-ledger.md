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
| **TG-010** | Extension UI: Popup/Options interface for metadata & subtitle localization workflows | R1 | Implementation Agent | Code/UX Reviewer, QA Agent | Planned | Phase 5 |
