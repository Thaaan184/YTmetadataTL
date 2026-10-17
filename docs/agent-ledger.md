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
| **TG-001** | Repository baseline audit, governance documents initialization, initial ADRs | R0 | Tech Lead / Orchestrator | Architecture, Security/Privacy | In Review | Audit complete. Empty baseline repo confirmed. Baseline clean. |
| **TG-002** | Project foundation: WXT + TypeScript + Manifest V3, strict `.gitignore`, CI workflow, Vitest runner | R2 | Implementation Agent | Architecture, QA Agent | Ready | Prerequisite: TG-001 approval |
| **TG-003** | Subtitle core: Normalized cue model, SRT parser & serializer with roundtrip tests | R2 | Implementation Agent | Architecture, QA Agent | Planned | Prerequisite: TG-002 |
| **TG-004** | Subtitle core: WebVTT parser & serializer with header & settings preservation | R2 | Implementation Agent | Architecture, QA Agent | Planned | Prerequisite: TG-003 |
| **TG-005** | Subtitle core: Cue validator, tag tokenizer (placeholder preservation), adversarial fixtures | R2 | Implementation Agent | QA Agent, Security Agent | Planned | Prerequisite: TG-004 |
| **TG-006** | Provider core: Generic provider interface, normalized error hierarchy, mock provider | R2 | Implementation Agent | Architecture, QA Agent | Planned | Prerequisite: TG-002 |
| **TG-007** | Provider adapters: OpenAI-compatible & Ollama adapter, timeout, cancellation, credential redaction | R3 | Implementation Agent | Security Agent, QA Agent | Planned | Prerequisite: TG-006 |
