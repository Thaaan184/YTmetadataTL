# Risk Register

> **Document ID:** RISK-REGISTRY  
> **Last Updated:** October 17, 2026  
> **Status:** Active  

This document tracks all active project risks, impact severity, mitigation strategies, and assigned owner roles in accordance with `plan.md` Section 12.

---

## Active Risk Matrix

| ID | Risk Description | Severity | Mitigation Strategy | Owner Role | Status |
|---|---|:---:|---|---|:---:|
| **RISK-01** | API key leaked to public GitHub repository or built extension bundle | Critical | Runtime-only secrets. Strict `.gitignore` blocking `.env*`. No build-time `VITE_*` secrets. Pre-push secret audits. | Security/Privacy Agent | Monitored |
| **RISK-02** | Subtitle timestamps and cue counts corrupted by LLM hallucinations | High | Programmatic isolation: LLM receives only stable cue IDs and text. Timestamps remain authoritative in memory. Deterministic validator blocks export on mismatch. | Implementation / QA Agent | Planned (TG-003..005) |
| **RISK-03** | YouTube Studio DOM changes break extension selectors | High | Manual-first workflow as baseline. Content script is optional bridge only. Pure clipboard/download fallback always available. | Architecture Agent | Planned (Phase 5) |
| **RISK-04** | DOM automation violates YouTube or Chrome Web Store policy | Critical | Mandatory Platform Policy review before any DOM fill/click. No quota evasion claims. Manual copy/paste fallback prioritized. | Policy Agent | Planned (Phase 5) |
| **RISK-05** | YouTube Data API `videos.update` erases omitted metadata fields | High | Strict read/modify/write semantics preserving unmodified fields. Confirmation diff displayed before any remote write. | Architecture / QA Agent | Deferred (Phase 6) |
| **RISK-06** | Third-party providers diverge in OpenAI compatibility (JSON schema support) | Medium | Adapter capability flags (`structuredOutput`). Strict local validation of all raw JSON. Defensive fallback parsing. | Implementation Agent | Planned (TG-006..007) |
| **RISK-07** | Extension storage exposes persisted API keys to local disk access | High | Session-only in-memory storage by default. Opt-in persistence requires explicit disclaimer that extension storage is unencrypted. Quick-clear key action. | Security/Privacy Agent | Planned (TG-007) |
| **RISK-08** | Manifest V3 service worker terminates during long translation jobs | Medium | Stateless chunk coordinator. Persist job progress to recoverable local state. No reliance on in-memory worker globals. | Architecture Agent | Planned (Phase 4) |
| **RISK-09** | User content or keys transmitted to unintended external endpoints | High | Explicit endpoint allowlist. Remote endpoints enforce HTTPS. Plain HTTP permitted solely for loopback (`localhost`, `127.0.0.1`). Active endpoint displayed in UI. | Security/Privacy Agent | Planned (TG-007) |
| **RISK-10** | Scope expansion beyond MVP delays delivery | Medium | Strict gate enforcement by Tech Lead / Orchestrator. Title testing and comment reply features deferred past MVP. | Tech Lead / Orchestrator | Active |
| **RISK-11** | Runtime dependency becomes abandoned or security-vulnerable | Medium | Minimal dependency footprint. No heavy frameworks in core engine. Pre-install license and vulnerability check. | Tech Lead | Active |
| **RISK-12** | Name collision or licensing issue prior to public release | Medium | Working title TubeGlot marked provisional. Repository owner selects final open-source license (MIT / Apache-2.0) before publication. | Release / Docs Agent | Active |
