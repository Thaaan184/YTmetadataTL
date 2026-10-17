# TubeGlot / OpenVid — Agentic Build Plan

> **Document type:** Implementation plan and operating contract for a multi-agent coding team  
> **Version:** 1.0  
> **Status:** Ready for repository audit; implementation has not started  
> **Product direction:** Personal-first, backend-free, local-first where practical, open-source  
> **Working name:** TubeGlot (not final; verify naming before public release)

---

## 0. Mission for the Agentic AI Team

Build a reliable, maintainable Chrome extension that helps its owner localize YouTube video metadata and subtitle files using AI providers selected by the user. The owner intends to use it personally and publish the source code on GitHub. This is **not a SaaS product** and must not require a project-operated cloud backend, central account system, billing system, or application-managed credit balance.

The team is expected to act as a coordinated engineering team: plan, implement, test, independently review, security-review, and curate every change. Agents may make both minor and major in-scope changes, but the required review and validation level must scale with the change's risk. Do not optimize for speed at the expense of correctness, user data protection, YouTube/Chrome policy compliance, or repository integrity.

### Non-negotiable rules

1. **Never commit, push, paste into source files, or publish any secret.** This includes AI provider keys, GitHub tokens, Google API credentials, OAuth tokens, refresh tokens, passwords, private keys, cookies, and real user data. A private GitHub repository is not an acceptable secret store.
2. Credentials supplied separately by the owner may be used only through an approved local runtime/secret mechanism. Never repeat them in responses, logs, screenshots, tests, issue comments, commits, or generated documentation. If the available tool cannot handle a credential securely, stop using it and explain how the owner can configure it locally.
3. Do not put API keys into `VITE_*` variables, source constants, extension build-time variables, `manifest.json`, test fixtures, example files, or the built extension. Build-time values are bundled and must be treated as public.
4. Do not push directly to the default branch. Use a task branch/worktree and review gates. Never force-push, rewrite shared history, delete user data, rotate/revoke credentials, change repository visibility, publish a release, or alter production OAuth settings without explicit owner approval.
5. Do not overwrite or restructure an existing repository before auditing it. Preserve existing working features and user changes. Do not run destructive Git or shell commands without first proving they are safe.
6. Never claim a test passed unless it was actually run and its result observed. Label unrun checks clearly.
7. Do not bypass YouTube quota, account limits, authentication, policy restrictions, or UI protections. Do not use undocumented/private YouTube endpoints or scrape content to evade API limitations.
8. Do not add a backend, telemetry, analytics, crash-reporting service, or data-export endpoint without an approved architecture decision and an explicit user-visible reason.
9. No agent may approve its own implementation. Independent review is mandatory.
10. If implementation reality conflicts with this plan, document the conflict, propose the smallest safe adjustment, create/update an ADR, and obtain the required review before changing direction.

---

## 1. Product Definition

### 1.1 Product statement

TubeGlot is a personal-first, open-source YouTube localization helper. It provides one workflow for translating video titles and descriptions into selected languages and translating subtitle files while preserving their timing structure. It allows the owner to choose a supported cloud AI provider with their own API key (BYOK) or configure a compatible local model endpoint.

### 1.2 Product promises

- No application-managed AI credits, subscription, or billing system.
- No mandatory project-operated cloud backend.
- Core file translation and validation should work locally apart from the explicitly selected model endpoint.
- User controls the target languages, provider, model, and whether content is sent to a cloud provider.
- Output is previewable and exportable before being used in YouTube Studio.
- Subtitle timestamps and cue identifiers are programmatically preserved; they are not entrusted to an LLM.
- User can cancel a job and recover from provider errors without losing the source file.
- Source code can be built and tested from a clean checkout using documented steps.

### 1.3 Claims we must NOT make

- Do not promise “unlimited AI”, “zero cost”, or unrestricted usage. Provider rate limits, model context windows, hardware, model licenses, and network availability still apply.
- Do not claim that translated metadata will increase views, CTR, or revenue. The tool can generate and organize localized content; performance must be measured by the creator.
- Do not claim that all metadata fields can be localized through YouTube Data API. Title/description localizations and tags/keywords are different fields and capabilities.
- Do not claim DOM automation is a permitted way to bypass YouTube API quota.
- Do not claim browser extension storage encrypts API keys.

### 1.4 Intended primary user

The owner of the repository, initially using the tool for their own YouTube channel and publishing the implementation as open-source. The design may be reusable by others, but there is no requirement for multi-user hosting, team accounts, centralized configuration, user analytics, billing, or customer support systems.

### 1.5 Working terminology

- **Provider:** service or local endpoint that receives a translation/generation request.
- **BYOK:** Bring Your Own Key; the user supplies their own provider API key.
- **Locale:** a language/region identifier such as `en`, `de`, `pt-BR`, or `es-419`.
- **Cue:** one timed subtitle entry.
- **Core engine:** parser, serializer, validation, locale logic, prompt construction, and provider abstraction independent from the YouTube page UI.
- **Page bridge/content script:** a small extension component that interacts with the currently open YouTube Studio page, if that interaction is approved and necessary.

---

## 2. Scope and Priorities

### 2.1 MVP — required

1. Chrome Extension using Manifest V3 and WXT + TypeScript unless repository audit finds a sound existing foundation that should be preserved.
2. A settings view for provider/model/endpoint and target locales.
3. A provider abstraction with at least:
   - a generic OpenAI-compatible API adapter;
   - a configurable local OpenAI-compatible endpoint adapter, initially targeting Ollama compatibility;
   - a mock/fake provider for deterministic tests.
4. Metadata localization:
   - accept source title and description;
   - translate into one or more configured locales;
   - optionally generate tag/keyword suggestions as a separate field, not as part of the YouTube `localizations` object;
   - validate output structure and show a preview before copy/export/apply.
5. Subtitle translation:
   - import `.srt` and `.vtt` files;
   - parse into structured cues;
   - translate cue text only, using stable cue IDs;
   - preserve the original cue IDs/order/timestamps and supported formatting tags;
   - validate every returned cue;
   - export a valid `.srt` or `.vtt` file per locale.
6. Robust user-visible status: idle, reading, translating, validating, completed, cancelled, or failed. Show which chunk failed without exposing API keys or raw sensitive headers.
7. Manual-first workflow for YouTube Studio: users can copy localized metadata and export/upload subtitle files manually.
8. Automated checks: lint, type-check, tests, and production build; clean install instructions.
9. Security baseline, secret scan, local configuration documentation, README, license decision, and contribution guidance.

### 2.2 MVP — conditional / only after technical and policy review

- A small extension panel rendered on `studio.youtube.com`.
- Reading fields from the live YouTube Studio DOM, injecting/filling values, or auto-clicking UI controls.
- YouTube Data API OAuth integration for reading/writing video metadata or uploading captions.

These features must not be implemented as quota/policy workarounds. For each, the assigned Policy/Compliance Reviewer must verify the current official YouTube and Chrome rules, document the approved interaction and required scopes/permissions, and record an ADR. The default fallback is manual copy/paste and file export. Never use undocumented endpoints or automate authentication.

### 2.3 Later features — not part of MVP

- Multi-model title and hook comparison.
- CTR prediction or numeric viral scores. If revisited, present qualitative heuristics unless the score is calibrated on reliable relevant data.
- Comment translation and reply drafting.
- Automatic comment posting.
- Translation job history beyond what is necessary for resumability.
- Shared backend, accounts, cloud sync, remote processing, team collaboration, SaaS, billing, usage credits, telemetry, or analytics.

### 2.4 Explicit non-goals

- Uploading/publishing videos.
- Circumventing YouTube limits or platform restrictions.
- Scraping YouTube to obtain data unavailable through approved APIs.
- Silent modification of video metadata/captions.
- Sending user content to an undisclosed provider.
- Storing secrets in the Git repository or compiled bundle.
- Guaranteeing perfect translation or YouTube ranking outcomes.

---

## 3. Architecture Decisions

### 3.1 Baseline architecture

- **Framework:** WXT + TypeScript + Vite-based build, unless an existing repository has a better validated baseline. Verify WXT's current official documentation during setup.
- **Browser model:** Chrome Manifest V3 first. Keep browser-specific code isolated so cross-browser support may be possible later, but do not expand MVP scope without a reason.
- **Core:** pure TypeScript modules independent from the DOM and browser APIs, with unit tests.
- **Extension UI:** settings/popup or side-panel UI for long-running translation workflows; use the minimal page UI only when needed.
- **Page bridge/content script:** small, isolated, and no provider API keys. It should not own the translation pipeline.
- **Provider requests:** execute only from a suitable extension context with explicit host permissions. Do not call an LLM from arbitrary webpage JavaScript or expose keys in the DOM.
- **Persistent state:** persist only user-selected settings or explicitly opted-in resumable job state. Do not persist source content/history by default unless necessary and documented.
- **Network:** all remote requests must be initiated only for the selected function/provider and disclosed by the UI. Use HTTPS for remote providers. Permit plain HTTP only for explicitly configured loopback/local endpoints when needed.
- **No central server:** no application backend is required for the core workflow.

### 3.2 Suggested repository structure

Adapt this structure after auditing the existing repository. Do not force a full rewrite just to match the suggested tree.

```text
/
├── .github/
│   ├── workflows/ci.yml
│   ├── pull_request_template.md
│   └── ISSUE_TEMPLATE/
├── docs/
│   ├── architecture.md
│   ├── security.md
│   ├── privacy-and-data-flow.md
│   ├── testing.md
│   ├── agent-workflow.md
│   ├── risks.md
│   ├── agent-ledger.md
│   └── decisions/
│       ├── ADR-0001-backend-free-architecture.md
│       └── ADR-0002-provider-credentials.md
├── entrypoints/
│   ├── popup/ or options/            # WXT-supported structure, verify on setup
│   ├── content.ts                    # Minimal YouTube Studio page bridge, if approved
│   └── background.ts                 # Lifecycle-safe message/network coordination if needed
├── components/                       # Small reusable UI components
├── core/
│   ├── subtitles/
│   │   ├── parse-srt.ts
│   │   ├── parse-vtt.ts
│   │   ├── serialize-srt.ts
│   │   ├── serialize-vtt.ts
│   │   ├── validate-cues.ts
│   │   └── formatting-tokens.ts
│   ├── localization/
│   │   ├── locales.ts
│   │   ├── metadata-schema.ts
│   │   └── prompts.ts
│   ├── providers/
│   │   ├── types.ts
│   │   ├── openai-compatible.ts
│   │   ├── ollama-compatible.ts
│   │   └── mock-provider.ts
│   ├── jobs/
│   │   ├── chunking.ts
│   │   ├── translation-runner.ts
│   │   └── job-state.ts
│   └── errors/
├── tests/
│   ├── fixtures/
│   ├── unit/
│   ├── integration/
│   └── security/
├── public/                            # Only non-secret static assets
├── .env.example                       # Placeholders only; omit if not needed
├── .gitignore
├── .npmrc                             # If needed for reproducible install
├── README.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE
├── package.json
├── lockfile
└── plan.md
```

File names and WXT entrypoint conventions must be confirmed against the selected WXT version. This is a target structure, not permission to create unused boilerplate.

### 3.3 Extension context boundaries

- UI components render, validate user input, and display progress.
- Core modules do not import `chrome`, `browser`, `window`, `document`, or framework UI libraries.
- The provider layer accepts explicit configuration and a cancellation signal; it never reads keys from the page DOM.
- Content scripts may message the extension runtime using a narrow, typed message contract. Never accept arbitrary commands or `eval` strings from the page.
- Do not depend on a Manifest V3 service worker remaining alive forever. Long work must have cancellation, timeout, and recoverable status handling. Do not keep essential state only in worker memory.
- Avoid remotely hosted executable code. All extension code must be packaged with the build.

### 3.4 Provider contract

Create a typed provider interface before adding provider-specific UI. Example conceptual contract:

```ts
interface TranslationProvider {
  id: string;
  displayName: string;
  capabilities: {
    structuredOutput?: boolean;
    streaming?: boolean;
    supportsCancellation?: boolean;
  };
  translateStructured<T>(input: {
    systemPrompt: string;
    userPayload: unknown;
    schema?: unknown;
    signal?: AbortSignal;
  }): Promise<T>;
  testConnection(): Promise<ProviderHealthResult>;
}
```

This is illustrative. The implementation should use a type-safe result/error convention and must not assume every “OpenAI-compatible” provider fully implements JSON Schema or the same request fields. Validate every response locally, even when the provider claims structured output support.

Provider requirements:

- Normalize request construction and error handling.
- Set timeouts and support cancellation.
- Handle rate-limit and transient failures with bounded exponential backoff and jitter.
- Never retry indefinitely.
- Never log authorization headers, API keys, full request headers, or secret-bearing URLs.
- Do not silently switch to another provider or upload content to another endpoint.
- Validate endpoint URL and protocol. Remote endpoints must use HTTPS. HTTP is allowed only for configured loopback addresses (`localhost`, `127.0.0.1`, or `[::1]`) unless an explicit development-only override is approved.
- Avoid sending an API key to a different origin through redirects; reject unexpected cross-origin redirects where possible.
- Use explicit, narrowly scoped host permissions/optional host permissions. Explain any permission that requires a user decision.
- Make the provider/model and destination endpoint visible before sending source text.
- Mock provider tests must not require a network connection or real key.

### 3.5 Credential strategy

A backend-free extension cannot provide a server-side secret vault. Treat this as a documented product trade-off.

- API keys must be entered at runtime by the owner in a settings UI or supplied to a local tool through a secure runtime mechanism.
- No secrets are committed to Git, copied into source, written to fixtures, captured in snapshots, logged, or included in build artifacts.
- **Default persistence should be session-only where practical.** If a “remember key” option is added, it must be off by default or require explicit opt-in, with a clear warning that Chrome extension storage is local but not encrypted by Chrome. Provide a visible delete/clear action.
- Do not describe `chrome.storage.local`, `localStorage`, an ignored `.env` file, or a private repository as encrypted secret storage.
- Do not place secrets in `VITE_*` variables or other build-time environment values because they can be embedded into the client bundle.
- A `.env.example` may contain placeholders only, such as `PROVIDER_API_KEY=replace-me`; it must never contain a real key.
- `.gitignore` must cover `.env`, `.env.*` except `.env.example` where needed, local config files, debug logs, temporary provider responses, token caches, and generated output. Confirm the exact ignore rules against the real tooling.
- If an actual credential is found in tracked files/history, stop publication, notify the owner without repeating it, rotate/revoke it as appropriate, and follow GitHub's secret-removal procedures. Deleting it from the latest file alone is insufficient if it exists in Git history.
- Prefer GitHub secret scanning and push protection if available, but do not rely on scanning as the only control.

### 3.6 YouTube integration boundary

Build the manual-first workflow first. Do not make the extension dependent on reading private page state or auto-clicking Studio controls.

Potential official API integration must be an independently reviewed phase:

- Use official YouTube Data API endpoints and OAuth scopes only as currently documented.
- Request the minimum scopes needed, with clear user-facing consent explaining the operation.
- Keep OAuth client configuration and tokens out of the public repository. Do not embed an API client secret or owner-specific credentials in open-source code.
- Before any write operation, show the exact metadata/caption change and require an explicit user action.
- For `videos.update`, account for the API behavior that omitted writable fields may be removed. Use a carefully validated read/modify/write flow that preserves fields not meant to change, and test with a disposable video or non-destructive fixture where possible.
- Use the official captions endpoints if uploading or updating caption tracks is supported. Explain quota use and handle quota errors gracefully.
- Do not assume extension DOM automation is policy-compliant merely because it avoids API quota. Before adding DOM reads, fills, clicks, or other automation, review current YouTube Terms/Developer Policies and Chrome policies, document the conclusion, and keep a manual fallback. If the policy result is uncertain, do not ship that automation in MVP.
- Do not use undocumented/private YouTube endpoints, cookie extraction, credential interception, or automation designed to evade quota or product restrictions.

---

## 4. Data Contracts and Core Correctness

### 4.1 Subtitle cue model

Use a single normalized internal representation. Example:

```ts
interface SubtitleCue {
  id: string;              // Stable ID created from cue index if source lacks one
  startMs: number;         // Integer milliseconds parsed from original timestamp
  endMs: number;           // Integer milliseconds parsed from original timestamp
  text: string;            // Cue text; inline formatting handled deliberately
}

interface SubtitleDocument {
  format: 'srt' | 'vtt';
  cues: SubtitleCue[];
  sourceLanguage?: string;
  vttHeader?: string;
  metadata?: Record<string, unknown>;
}
```

Do not let the provider become the source of truth for cue IDs or timestamps. The original parsed document remains authoritative for order, times, format, and any structural fields not intended for translation.

### 4.2 Parser and serializer requirements

- Parse SRT and WebVTT without silently skipping malformed cue blocks.
- Report validation errors with line/cue location where practical.
- Preserve cue ordering and cue count. Do not reorder by text or timestamp.
- Preserve original timestamp values by keeping an immutable source copy or canonical integer millisecond values. The translation output must be reassembled with source timestamps.
- Preserve supported WebVTT header, cue identifiers/settings, and supported inline formatting where technically feasible. Explicitly document unsupported constructs rather than silently corrupting them.
- Preserve multi-line cue content unless there is an explicit user-selected reflow feature. Translation may change word wrapping; cue count and cue timing must not change.
- Validate `startMs < endMs`, unique IDs, legal timestamp syntax, and serializer output.
- Do not “fix” source timing automatically in MVP. If invalid source timing is found, report it and ask the user to repair or explicitly export a best-effort copy.
- Handle UTF-8, optional BOM, CRLF/LF line endings, blank lines, escaped characters, inline tags, and non-Latin text.

### 4.3 Translation payload contract

LLM input per chunk should include:

- target locale;
- a brief, configurable tone/style instruction;
- optional user glossary and channel-specific terms;
- ordered cue items containing only stable ID and source text, plus limited adjacent context if useful;
- explicit instruction to return one translation for each supplied ID and no timestamps.

Expected structured output:

```json
{
  "translations": [
    { "id": "cue-0001", "text": "Translated text" }
  ]
}
```

Rules:

- Do not ask the LLM to output timestamp fields.
- The validator must reject missing, extra, duplicate, unknown, or blank IDs/text where a translation is required.
- Match output to input by ID, never only by array position.
- On failure, retry only the offending chunk or cue subset, with a bounded retry count. Preserve the failed response only in local debug mode after redacting sensitive content; never log keys/headers.
- Support cancel and partial recovery; a cancelled job must not be reported as successful.
- Define and test how inline subtitle tags are preserved. Prefer replacing supported tags with opaque placeholders before translation and restoring them afterward, then validate all placeholders. Never allow a model to invent arbitrary markup that is inserted without validation.
- Do not rigidly forbid all punctuation changes: preserve meaning, IDs, timing, and required formatting while allowing target-language punctuation to be natural.

### 4.4 Chunking and context

- Use configurable maximum cue count and an estimated token/character budget, not a fixed “50 cues always” rule.
- Keep chunks in source order and retain adjacent-cue context when it improves dialogue consistency without overloading the context window.
- Never split or merge a cue across output IDs.
- Track per-chunk status, retries, and validation results.
- Persist only the minimum state needed to recover a job; do not persist translated content history by default.
- Provide progress such as `chunk 3 of 10`, not misleading token-level progress if provider usage data is unavailable.

### 4.5 Metadata schema

Use a validated structure conceptually similar to:

```ts
interface LocalizedMetadata {
  locale: string;          // Validated BCP-47/YouTube-compatible locale where applicable
  title: string;
  description: string;
  tagSuggestions?: string[]; // Suggestions; not assumed to be per-locale API localizations
}
```

Requirements:

- Distinguish language codes from locale identifiers and support region-specific locales where needed (`pt-BR`, `es-419`, etc.).
- Validate title and description as strings and check documented YouTube limits at the point of implementation; do not hard-code assumptions without checking current official docs.
- Present the original and translated values side by side.
- Do not overwrite original source text.
- Do not silently truncate output. Show validation warnings and allow user edits.
- If the user asks for tags/keywords, show them as separate suggestions and document whether/how they can be applied; do not represent them as part of `snippet.localizations`.
- Do not invent a precise CTR score without a validated scoring basis.

---

## 5. User Experience Requirements

### 5.1 Main workflow

1. User opens extension UI and selects `Metadata` or `Subtitles`.
2. User selects or confirms provider/model and target locale(s).
3. UI shows what source text will be sent and to which provider, particularly for cloud endpoints.
4. User starts the job explicitly.
5. UI displays progress, cancellation, warnings, and structured errors.
6. Results are validated locally.
7. User reviews/edits output.
8. User exports files or copies metadata; optional official YouTube API integration is a separate, confirmed action.

### 5.2 Error handling

Provide useful and non-secret error messages for:

- missing/invalid API key;
- unauthorized provider response;
- endpoint unreachable;
- local model not running;
- invalid model name;
- rate limit/quota exhaustion;
- network timeout/cancellation;
- invalid JSON or schema mismatch;
- missing/duplicate/extra cue ID;
- malformed subtitle file;
- failed serialization/validation;
- permission not granted;
- YouTube API authorization/quota/policy-related errors.

Never display an entire raw request or authorization header. If showing a provider response for diagnostics, redact keys/tokens and make inclusion of user content opt-in.

### 5.3 Accessibility and usability

- Clear labels and focus states.
- Keyboard-accessible controls.
- Show language names as well as codes.
- Avoid destructive actions without confirmation.
- Provide “Clear key/configuration” and “Cancel job” controls.
- Distinguish “copy to clipboard”, “download file”, “fill form”, and “publish/update via API” as separate actions.

---

## 6. Security, Privacy, and Open-Source Hygiene

### 6.1 Data-flow inventory

Create `docs/privacy-and-data-flow.md` with a table for each data type, where it originates, whether it is stored, where it is sent, and how it is deleted. At minimum cover:

- provider API keys and endpoint settings;
- subtitle source text and translated text;
- metadata source and translations;
- OAuth tokens if API integration is ever implemented;
- logs, errors, job state, and downloaded output.

### 6.2 Mandatory controls

- Minimal permissions; use optional permissions where possible.
- No broad `<all_urls>` permissions unless there is a documented, approved necessity.
- No remote code execution, `eval`, dynamic script injection from remote sources, or remote executable code.
- Validate all cross-context messages and all parsed provider responses.
- Avoid unsafe HTML rendering. Treat source text, translated text, model replies, and Studio DOM values as untrusted input.
- No credentials in logs, UI diagnostics, screenshots, commits, fixtures, snapshots, changelogs, or issue templates.
- No telemetry or automatic upload by default.
- No real provider calls in CI. Integration tests must use mocks unless a local explicit manual test is being performed outside CI.
- Dependency audit and license check before adding a new runtime dependency.
- Document data sent to each provider and the fact that cloud providers may process the text under their own policies.
- Provide an explicit “forget settings/clear key” action.

### 6.3 Secret scan and publication gate

Before every push and before the repository becomes public:

1. Run the available secret scanner and inspect the output.
2. Search tracked files for common key/token patterns and accidental local config.
3. Confirm `.gitignore` and sample configuration files are correct.
4. Inspect the staged diff and commit history for secrets and private data.
5. Enable GitHub secret scanning/push protection if available on the repository.
6. Confirm no real keys are present in build output, maps, test artifacts, logs, or documentation.

If a secret has entered Git history, treat it as compromised: rotate/revoke as appropriate, remove it from current files, and follow official history-cleanup steps. Do not merely delete the line and proceed.

### 6.4 Licensing

- Do not add a license without recording the owner's intended license choice.
- MIT is a reasonable default if broad reuse, including commercial reuse, is acceptable; Apache-2.0 is another option with explicit patent provisions. These are choices for the owner, not assumptions to silently impose.
- Record third-party dependency licenses and comply with notices/attribution requirements.
- Do not bundle downloaded model weights or assets unless licensing and redistribution rights are verified.

---

## 7. Multi-Agent Team and Review Model

The agents are roles, not an excuse to have multiple bots rubber-stamp each other. Assign distinct responsibilities and require independent passes. If the agentic platform cannot run separate agents simultaneously, perform the same roles in separate, clearly labeled passes and do not let the implementation pass approve itself.

### 7.1 Roles

| Role | Responsibility | May approve its own work? |
|---|---|---|
| **Orchestrator / Tech Lead** | Maintains task queue, plan, architecture decisions, change classification, integration status, and final report. Prevents scope drift and conflicts. | No |
| **Product / Requirements Agent** | Maps each feature to user need, acceptance criteria, edge cases, and non-goals. Challenges unnecessary features. | No, not implementation author |
| **Architecture Agent** | Reviews module boundaries, type contracts, extension lifecycle, dependency choices, and architecture drift. Authors/updates ADRs. | No, not implementation author |
| **Implementation Agent** | Implements one bounded task in a dedicated branch/worktree; provides tests and records file changes. | No |
| **QA / Test Agent** | Independently tests expected behavior, regressions, edge cases, build, and acceptance criteria. May create bug-fix tasks but should not quietly change implementation while reviewing. | No |
| **Security / Privacy Agent** | Reviews secrets, permission scope, data flows, untrusted inputs, dependency risk, logging, and network behavior. | No |
| **YouTube / Platform Policy Agent** | Verifies current official policies for APIs, OAuth/scopes, UI interactions, and quota. Documents links and a dated conclusion. | No |
| **Code / UX Reviewer** | Reviews readability, maintainability, user feedback, accessibility, and error messages. | No |
| **Release / Documentation Agent** | Verifies README, install/build instructions, change log, license/notice status, and release readiness. | No |

A single agent may hold more than one role in a small change, but the reviewer of code must be a different agent/pass from the implementation author. For major or security-sensitive work, require at least two independent reviews: one technical/QA and one security/policy as relevant.

### 7.2 Change risk classes

Every task must be classified before implementation.

- **R0 — Documentation/style:** spelling, wording, non-behavioral comments. One independent review; normal CI still runs if source files are touched.
- **R1 — Minor behavior/UI:** isolated UI behavior, ordinary bug fixes, non-sensitive refactoring. Implementer + independent code/QA review.
- **R2 — Major/core:** parser/serializer, provider interface, chunking, persistence, data model, extension architecture, new runtime dependency, build configuration, significant UX workflow. Requires an ADR or design note when architecture changes, two independent reviews, complete relevant test suite, and full build.
- **R3 — Security/policy/irreversible:** credentials, OAuth/scopes, new host permissions, network destination/data flow, YouTube DOM automation, YouTube API writes, remote dependency execution, licensing/visibility, destructive data/Git actions, public release. Requires Security/Privacy review plus the relevant Architecture/Policy/QA review. Obtain owner approval before irreversible or externally consequential actions.

Risk is determined by the highest applicable class. A one-line change to permissions, secrets, OAuth, or external data flow is R3 even if its diff is small.

### 7.3 Required per-task workflow

For every task, the Orchestrator creates or updates an entry in `docs/agent-ledger.md` with:

- task ID and linked requirement/acceptance criteria;
- risk class;
- assignee and reviewer roles;
- planned files/modules and expected behavior;
- tests required;
- external data, permission, or credential impact;
- current status and blockers.

Then follow this sequence:

1. **Understand:** inspect existing code, git status, repo conventions, and linked requirements. Do not edit unrelated files.
2. **Propose:** implementation agent writes a brief change plan and identifies edge cases before touching code. R2/R3 tasks require reviewer feedback on the approach first.
3. **Isolate:** use a task branch/worktree. Do not have concurrent agents edit the same working tree or the same files without coordination.
4. **Implement:** change only task-relevant files; add/update automated tests with the code.
5. **Self-check:** implementation author runs formatter/linter/type-check/targeted tests/build as available. This is not the independent approval.
6. **Independent review:** reviewer examines the diff against requirements and checks likely failure modes, not just style. Reviewers must inspect actual changes and test results.
7. **Security/policy review:** mandatory for R3; mandatory for provider, storage, permissions, and API-integration changes where relevant.
8. **QA:** independently runs targeted tests and checks regression/acceptance criteria. No approval based only on the author's summary.
9. **Resolve:** every blocker/high-severity finding must be fixed and re-reviewed. Medium/low findings must be fixed or have a documented reason and follow-up task.
10. **Integrate:** Orchestrator verifies all gates, merges/rebases without rewriting shared history, and runs the full CI sequence on the integrated branch.
11. **Curate:** update `CHANGELOG.md`, `docs/agent-ledger.md`, relevant docs, and ADRs. Do not add noisy changelog entries for every trivial internal refactor; group them sensibly.
12. **Report:** state files changed, behavior changed, tests actually run, unrun manual tests, reviewer verdicts, remaining risks, and whether anything was pushed. Never report “done” while a required gate is red.

### 7.4 Review checklist

Each reviewer must explicitly mark every applicable item as **Pass**, **Fail**, or **Not applicable with reason**:

- Requirement and acceptance criteria are met.
- No unrelated files or features were altered.
- Behavior is covered by tests, including failure cases.
- Types and validation are strict enough for untrusted model/provider output.
- Source subtitle IDs, timing, format and tags are not silently corrupted.
- Secrets and user content are not logged or committed.
- Provider requests go only to the explicitly configured endpoint.
- Permissions and scopes are minimum necessary and documented.
- No undisclosed telemetry or data transfer was added.
- User confirmation exists for impactful write/update actions.
- Dependency licenses/security are acceptable.
- Docs, changelog, task ledger, and ADRs are updated when required.
- Build and required test results are actual, reproducible results.

### 7.5 Disagreement handling

- The Orchestrator does not resolve disagreements by simply picking the fastest approach.
- Record alternatives, rationale, downsides, and the chosen decision in `docs/decisions/ADR-####-*.md` for R2/R3 architecture or policy choices.
- Security or policy objections affecting secrets, user data, OAuth, YouTube restrictions, or unsafe code block merge until resolved or the feature is removed from scope.
- If two agents disagree on a factual platform requirement, verify current official documentation; do not rely on memory alone.
- Favor the smallest implementation that satisfies acceptance criteria and is easy to revert.

---

## 8. Git, Repository, and Change Curation Rules

### 8.1 Initial repository audit (first task, mandatory)

Before coding:

1. Inspect `git status`, current branch, remotes, recent commits, repository tree, package scripts, lockfile, existing tests, build workflow, license, README, and current ignore rules.
2. Identify user changes and uncommitted files; preserve them.
3. Check for accidental secrets without printing them. If found, stop and report a safe description only.
4. Identify existing working features, known failing tests, code conventions, and architecture constraints.
5. Produce `docs/initial-audit.md` with the baseline state, risks, and proposed integration approach.
6. Compare the existing repository to this plan. Update the plan/ADRs where necessary rather than blindly replacing a viable project.
7. Run baseline checks and record results before implementation.

### 8.2 Branch and commit rules

- Use branches such as `agent/TG-001-repo-audit`, `agent/TG-021-subtitle-parser`, etc.
- One task per branch. Do not share a mutable worktree among parallel agents.
- Use clear, conventional commits, e.g. `feat(subtitles): add WebVTT parser` or `fix(provider): bound retry on rate limit`.
- Never commit generated secrets, build output, temporary source files, real subtitle samples, user video metadata, or provider responses.
- Do not disable failing checks merely to merge. Fix the issue or document a justified, approved exception with a follow-up.
- Do not force-push. If a remote push is appropriate and credentials allow it, push only the reviewed branch; never expose the token in the remote URL or logs.
- Do not enable public visibility or publish releases without explicit owner approval.

### 8.3 Change records

Maintain:

- `CHANGELOG.md`: user-visible changes grouped under `Unreleased`.
- `docs/agent-ledger.md`: task progress, risk class, test results, review verdicts, blockers, and integration status. Never include secrets or raw sensitive content.
- `docs/decisions/`: ADRs for decisions that affect architecture, provider support, permissions, credential handling, YouTube interaction, licensing, or scope.
- `docs/risks.md`: active risks, severity, mitigation, owner/role, and status.

Any major change must be reversible. Prefer a feature flag, isolated module, or small migration where practical. For a breaking architectural change, document migration and rollback steps before implementation.

---

## 9. Implementation Phases and Exit Gates

Do not skip phases just to show more features. A phase is complete only when its exit gates pass.

### Phase 0 — Repository and Policy Audit

**Tasks**
- Audit existing GitHub repo and working tree.
- Record existing stack, architecture, package scripts, test health, license, and missing docs.
- Review current official WXT, Chrome Manifest V3, extension privacy/security, YouTube Data API, and YouTube Developer Policy docs.
- Identify exactly which Studio interactions are safe to implement now versus deferred pending policy certainty.
- Define current assumptions in ADRs.

**Exit gate**
- `docs/initial-audit.md`, `docs/agent-ledger.md`, risk register, and required initial ADRs exist.
- Baseline build/tests run or failures are recorded accurately.
- No code changes beyond audit/documentation unless explicitly needed to protect secrets or make the repository safe.

### Phase 1 — Project Foundation and CI

**Tasks**
- Establish/confirm WXT + TypeScript + Manifest V3 build.
- Add lint, format check, type check, unit-test runner, production build scripts, and a minimal CI workflow.
- Configure `.gitignore` and placeholder-only environment examples.
- Add test fixtures with synthetic/non-sensitive subtitle samples.
- Create README setup/build instructions and document supported Node/package-manager versions.

**Exit gate**
- Clean checkout can install dependencies and build from documented commands.
- CI passes without API keys or network calls to LLM providers.
- Secret scan and staged-diff review pass.

### Phase 2 — Subtitle Core (highest correctness priority)

**Tasks**
- Implement SRT parser/serializer.
- Implement WebVTT parser/serializer.
- Define supported inline tag preservation and unsupported-construct warnings.
- Implement stable cue IDs and validator.
- Add property-based/fuzz tests if compatible with the selected test stack; at minimum add adversarial edge-case fixtures.

**Exit gate**
- Parser/serializer round-trip tests pass for valid supported fixtures.
- Malformed input fails with understandable errors rather than silent corruption.
- Timestamp, cue count, order, IDs, supported tags, UTF-8, BOM, CRLF/LF, non-Latin text, multiline content, empty files, duplicate IDs, and invalid timing are tested.
- Core parser/validator modules meet a target of at least 90% statement/line coverage where measurable; any gap is documented by risk rather than hidden.

### Phase 3 — Provider Layer and Secure Settings

**Tasks**
- Define the provider interface and normalized error model.
- Implement fake/mock provider first.
- Add generic OpenAI-compatible adapter with configurable base URL/model.
- Add local endpoint path for Ollama-compatible API and verify actual current API behavior.
- Add connection test, cancel/timeout, bounded retry, JSON parsing and validation.
- Add settings UI and clear/delete configuration controls.
- Implement session-only key handling first; consider opt-in persistence only with a clear warning and threat model.

**Exit gate**
- All provider tests run with mocks and no secret.
- Invalid endpoints, rejected keys, rate limits, timeouts, malformed responses, cancellation, and unsupported structured-output behavior are handled.
- No credential appears in logs, snapshots, fixtures, or build-time variables.
- User can see the active provider and endpoint before sending text.

### Phase 4 — Translation Jobs and Metadata Localization

**Tasks**
- Implement token/character-budget-aware chunking.
- Implement ID-based subtitle translation orchestration and retries.
- Add strict local validation and deterministic reassembly.
- Add locale registry with editable/selectable targets, including regional BCP-47 locales where relevant.
- Add metadata localization with schema validation and preview.
- Keep keyword/tag suggestions separate from localized title/description fields.

**Exit gate**
- A known synthetic subtitle fixture translates using the mock provider and reconstructs with exactly the original cue count, IDs/order, timestamps, and supported tags.
- Missing/duplicate/extra cue IDs are detected and cannot be exported as a valid success.
- Metadata output validation and preview works for multiple locales.
- Chunk failures can be retried without retranslating successful chunks unnecessarily.
- Cancellation and failed jobs do not show success or overwrite source content.

### Phase 5 — Extension UI and Safe YouTube Studio Workflow

**Tasks**
- Implement metadata/subtitle workflow UI.
- Show source/target preview, job progress, per-chunk errors, cancel, copy, and download controls.
- Add a basic Studio-facing panel only if the policy review approves the limited behavior.
- Keep manual copy/paste/file export as a working fallback.
- Add permission explanations and ensure a feature does not request permissions before it needs them.

**Exit gate**
- Install unpacked extension in a clean Chrome profile using documented instructions.
- Manual metadata copy and subtitle export workflow works end to end.
- If a Studio panel exists, verify it does not break the main Studio UI, does not run outside approved pages, and handles route/navigation changes gracefully.
- No silent publish/write behavior.

### Phase 6 — Optional Official YouTube API Integration (not required for first MVP)

**Prerequisite**
- Explicit owner decision to pursue API integration.
- Policy agent documents current official endpoints, quotas, OAuth configuration, required scopes, credential rules, and applicable audit/verification requirements.
- Security and architecture reviews approve the data flow.

**Tasks**
- Implement only required read/write operations.
- Use least-privilege OAuth scope(s) and consent initiated by a user action with clear purpose.
- Preview exact changes and require explicit confirmation immediately before write.
- Use safe read/modify/write for metadata to preserve existing fields.
- Explain per-call quotas and handle 401/403/429/quota errors.
- Keep OAuth secrets/tokens out of repository and logs.

**Exit gate**
- Tests cover permission denial, cancellation, expired/invalid token, quota failure, partial responses, and preservation of unrelated metadata fields.
- A non-destructive manual test has been performed with a dedicated test video/account where possible.
- Policy and Security reviewers sign off. If requirements or policy are uncertain, do not ship this phase and retain manual workflow.

### Phase 7 — Title Tester (deferred)

**Tasks**
- Generate a configurable number of title variants grouped by defined angles, such as curiosity, direct value, or strong contrast.
- Let the user compare and copy variants.
- Do not label an uncalibrated heuristic as a predicted CTR or “viral score”.

**Exit gate**
- Output schema validation, language appropriateness, and no fabricated performance claims.

### Phase 8 — Comment Translation / Reply Drafts (deferred, optional)

**Prerequisite**
- Owner has a demonstrated personal need for this feature.
- Review current platform API/policy and privacy implications.

**Rules**
- Draft replies only; no automatic posting in initial implementation.
- No background comment scraping or silent data collection.
- Require explicit user action before retrieving/translating comments or using account permissions.

### Phase 9 — Open-Source Readiness

**Tasks**
- Finalize chosen license with owner.
- Complete README, installation, local provider setup, limitations, privacy/data flow, threat model, troubleshooting, contribution guide, and changelog.
- Review all dependencies/licenses and build provenance.
- Run clean-checkout build, full tests, lint, type-check, secret scan, dependency audit, and staged-diff/history review.
- Confirm no real API keys, OAuth credentials, private data, or user-specific config in Git history.

**Exit gate**
- All critical/high findings resolved.
- Release checklist signed by QA, Security/Privacy, Architecture, and Documentation roles.
- Owner approves any public release or visibility change.

---

## 10. Testing Strategy

### 10.1 Required automated checks

The exact commands depend on the audited repository, but CI should provide equivalent checks for:

1. Dependency installation from lockfile (`npm ci` or the chosen package manager's clean install).
2. Formatting check.
3. Lint.
4. Type checking.
5. Unit tests.
6. Integration tests with mock providers.
7. Production extension build.
8. Secret scan / staged-diff scan.
9. Dependency vulnerability audit where feasible.

No CI check may require a real API key, authenticated YouTube account, real video, or private dataset.

### 10.2 Mandatory test categories

**Subtitle parsing and round trip**
- Valid SRT/VTT, no cues, one cue, many cues, duplicate cue labels, multiline text, non-Latin scripts, emojis, BOM, CRLF/LF, Unicode normalization cases, supported tags, malformed timestamps, `start >= end`, missing separators, and unsupported WebVTT features.

**Translation validation**
- Correct output; reordered outputs; missing/duplicate/extra/unknown IDs; empty response; invalid JSON; unexpected fields; tag placeholder corruption; truncated responses; chunk timeout; 429/rate limit; cancellation; retry exhaustion; partial job recovery.

**Metadata localization**
- Multiple locales, regional locale validation, long title/description, quotes and line breaks, output schema mismatch, empty fields, tags returned separately, user edit/preview, and no overwrite of source values.

**Provider security/reliability**
- Key absent/invalid; key redaction; no key in error output; non-HTTPS remote endpoint rejected; loopback local endpoint accepted only via intended configuration; redirect handling; host permission absent; network timeout; rate limit; malformed content; provider reports unsupported JSON schema.

**Extension integration**
- Unpacked installation, options/config persistence, clear key, reload/navigation, service worker restart, content-script not loaded outside allowed pages, permissions denied, manual fallback, downloads/copy operations, and no silent Studio writes.

**Repository hygiene**
- Secret scan against staged files; generated build output ignored unless deliberately distributed as a release artifact; no local config; no real subtitle or metadata fixtures; no unexpected dependency/license changes.

### 10.3 Manual test checklist

A human-assisted checklist must document:

- Browser and OS version.
- Extension build hash or commit.
- Provider/model and endpoint class (never key value).
- Synthetic/local sample used, or a private sample that is not committed.
- Steps attempted and pass/fail outcome.
- Screenshots only if they contain no account information, real keys, private content, or tokens.

Manual tests with private real data are never uploaded into the repository or CI artifacts.

---

## 11. Definition of Done

A task is **Done** only when all applicable criteria are true:

- [ ] Implementation meets written acceptance criteria.
- [ ] Changes are isolated to the intended scope.
- [ ] Types and input/output validation are appropriate.
- [ ] Automated tests were added or updated and were actually run.
- [ ] Existing tests/build remain green, or a pre-existing failure is explicitly documented.
- [ ] Independent reviewer approved the diff.
- [ ] Security/Policy reviewers approved it when its risk class requires them.
- [ ] No secrets, private user data, or provider content were committed or logged.
- [ ] Permissions, network traffic, and data flows are documented.
- [ ] README/changelog/agent ledger/ADR updated where applicable.
- [ ] Rollback or revert path is understood for major changes.
- [ ] Final report lists actual commands and observed results, plus any checks not run.

A task is **not Done** if implementation compiles but the critical behavior is not tested, if reviewers have unresolved blockers, or if security/policy requirements are uncertain.

---

## 12. Risk Register

| ID | Risk | Initial severity | Mitigation / exit condition |
|---|---|---:|---|
| RISK-01 | API key leaked to public GitHub or extension bundle | Critical | Runtime-only secrets, strict ignore rules, secret scan/push protection, staged diff review; rotate if exposed. |
| RISK-02 | Subtitle timestamps/cues are corrupted by LLM | High | Store timestamps outside model; ID-based schema; deterministic validator; adversarial tests; block export on invalid output. |
| RISK-03 | YouTube Studio DOM changes break the extension | High | Manual-first workflow; isolate page bridge; smoke tests; graceful failure; no sole dependency on DOM. |
| RISK-04 | DOM automation violates YouTube/Chrome policy | Critical | Policy review before implementation; no quota-bypass rationale; no undocumented endpoints; omit feature if uncertain. |
| RISK-05 | API update erases unspecified metadata fields | High | Review current official API semantics; preserve fields via safe read/modify/write; confirm diff before write. |
| RISK-06 | Provider-specific “OpenAI compatibility” differs | Medium | Capability flags, adapter tests, local validation, clear errors; do not assume full schema compatibility. |
| RISK-07 | Extension storage exposes persisted API key to local access | High | Session-only default; opt-in persistence with warning; clear-key feature; no false encryption claims. |
| RISK-08 | MV3 service worker stops during long jobs | Medium | Avoid memory-only job state; explicit cancellation/timeout; persist minimal progress if needed; test worker restart. |
| RISK-09 | Unexpected data sent to an external endpoint | High | Visible active provider/endpoint; strict endpoint validation; no silent fallback; data-flow docs and tests. |
| RISK-10 | Scope expands before MVP is stable | Medium | Milestone gates; defer title/comment modules; Orchestrator blocks unrelated features. |
| RISK-11 | Dependency becomes abandoned, insecure, or license-incompatible | Medium | Minimize dependencies; check maintenance, vulnerability, and license before adding. |
| RISK-12 | Name collision or licensing issue before publication | Medium | Verify project name, domain, package and repository namespace; owner chooses license before public release. |

Review and update this table at each milestone and before public release.

---

## 13. Required Artifacts Maintained by Agents

At minimum, ensure these files exist and stay accurate:

- `plan.md` — this plan; update only through reviewed changes.
- `docs/initial-audit.md` — original repo health and integration audit.
- `docs/architecture.md` — current architecture and module boundaries.
- `docs/security.md` — threat model, secret handling, permissions and security rules.
- `docs/privacy-and-data-flow.md` — data collection, storage, provider requests, and deletion.
- `docs/testing.md` — actual test commands and manual test matrix.
- `docs/agent-workflow.md` — roles, risk classes, handoffs, and review gates.
- `docs/agent-ledger.md` — every task, status, change summary, tests and reviewer verdicts.
- `docs/risks.md` — current risk register.
- `docs/decisions/ADR-*.md` — non-trivial architecture and policy decisions.
- `CHANGELOG.md` — concise user-visible change history.
- `README.md` — install, configure provider, build, use, limitations, privacy and troubleshooting.
- `CONTRIBUTING.md` — local setup, tests, branching, contribution and secret policy.
- `LICENSE` — only after owner confirms the intended license.

The repository audit may justify different names or a reduced initial documentation set, but the content must exist somewhere and be discoverable.

---

## 14. First Task Instructions to the Agentic Team

Do not start by implementing all features. Start with the following bounded task:

### Task TG-001 — Repository Audit and Execution Plan Alignment

1. Open and inspect the supplied GitHub repository in its current state. Do not assume it is empty.
2. Check current branch, `git status`, remotes, recent commits, directory tree, package manager, scripts, tests, workflows, `.gitignore`, existing documentation, license, and current build status.
3. Do not print, copy, or expose any secret while reviewing the repository. If a secret is detected, report only the file/commit location and secret type, never the value; stop before pushing anything.
4. Compare repository reality with this `plan.md`; preserve viable code and existing user work.
5. Run safe baseline checks and record real results. Clearly separate failures that existed before changes from failures introduced later.
6. Write `docs/initial-audit.md`, initialize `docs/agent-ledger.md` and `docs/risks.md`, and propose the first 3–7 tasks in dependency order.
7. Create/update the initial ADRs for backend-free architecture and credential handling if these documents are not already present.
8. Ask the Architecture and Security/Privacy roles to independently review the proposed implementation sequence before Phase 1 begins.
9. Report the audit findings, current blockers, baseline checks and proposed task order. Do not claim the application is built at this stage.

After TG-001 passes review, continue through the phases sequentially. Parallelize only independent work, such as documentation and isolated tests, and never have multiple agents concurrently modify the same files without a defined integration owner.

---

## 15. Agent Final-Response Format

At the end of each task or milestone, report using this exact outline:

1. **Task / risk class:** ID, summary, R0/R1/R2/R3.
2. **Files changed:** paths and short reason.
3. **Behavior delivered:** what now works, not what was merely planned.
4. **Checks actually run:** command, result, and important output. Say “not run” for missing checks.
5. **Independent review:** reviewer roles, verdicts, blocker count, and disposition.
6. **Security/policy impact:** permissions, network destinations, data flow, secrets, and OAuth/YouTube impact; “none” only after inspection.
7. **Known issues / risks:** remaining work with task IDs.
8. **Git status:** branch and commit hash; whether anything was pushed. Never include tokens or secret-bearing remote URLs.
9. **Next task:** one clearly scoped task that is ready to begin.

Do not use vague statements such as “everything works” without evidence. Do not hide test failures or unresolved reviewer objections.

---

## 16. Official References to Verify During Implementation

The agent responsible for a task must check the current official documentation at implementation time. A link in this plan is a starting point, not permanent proof that the current behavior or policy has not changed.

### Chrome / WXT

- WXT introduction: <https://wxt.dev/guide/introduction.html>
- Chrome extension permissions: <https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions>
- Chrome extension privacy and user data: <https://developer.chrome.com/docs/extensions/develop/security-privacy/user-privacy>
- Manifest V3 service worker lifecycle: <https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle>
- Chrome Identity API: <https://developer.chrome.com/docs/extensions/reference/api/identity>

### YouTube Data API / Developer Policies

- `videos.update`: <https://developers.google.com/youtube/v3/docs/videos/update>
- `captions.insert`: <https://developers.google.com/youtube/v3/docs/captions/insert>
- `captions.update`: <https://developers.google.com/youtube/v3/docs/captions/update>
- `captions.list`: <https://developers.google.com/youtube/v3/docs/captions/list>
- YouTube API Developer Policies: <https://developers.google.com/youtube/terms/developer-policies>
- Compliance guide: <https://developers.google.com/youtube/terms/developer-policies-guide>
- OAuth 2.0 for installed apps (only where applicable; select the correct flow for Chrome extensions): <https://developers.google.com/identity/protocols/oauth2/native-app>

### Provider / GitHub Security

- Ollama OpenAI compatibility: <https://ollama.com/blog/openai-compatibility>
- GitHub secret security: <https://docs.github.com/en/code-security/concepts/secret-security>
- GitHub push protection: <https://docs.github.com/en/code-security/how-tos/secure-your-secrets/prevent-future-leaks/enable-push-protection>

---

## 17. Final Engineering Principle

The team's job is not to maximize the number of files, agents, features, or commits. The job is to deliver a small, correct, auditable tool that its owner can actually use, and to preserve the ability to trust every subsequent change.

**Inspect before changing. Specify before coding. Test before claiming. Review independently before merging. Protect secrets always. Respect platform policies. Keep the backend optional and the core workflow local-first.**
