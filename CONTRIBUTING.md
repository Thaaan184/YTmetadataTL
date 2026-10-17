# Contributing to TubeGlot

Thank you for your interest in improving TubeGlot! TubeGlot is a personal-first, zero-backend, open-source YouTube localization tool.

---

## Code of Conduct & Core Architectural Tenets

1. **Never Commit Secrets:** Do not hardcode API keys, Google credentials, access tokens, or private user data into source files, tests, documentation, or git commits.
2. **Backend-Free Architecture:** Do not propose or introduce central tracking servers, proxy servers, user databases, or telemetry backends.
3. **Timing Invariance:** Subtitle cues and timestamps must always be preserved programmatically. AI models translate text only; they never compute or alter timestamps.
4. **Isolated Feature Branches:** Never commit directly to `main`. Open pull requests from task branches.

---

## Development Workflow

### 1. Setup
```bash
git clone https://github.com/Thaaan184/YTmetadataTL.git
cd YTmetadataTL
npm ci
```

### 2. Quality Gates & Pre-Commit Checks
All contributions must pass the following commands cleanly before a pull request can be merged:

```bash
# Typecheck
npm run typecheck

# Unit tests with coverage (>90% threshold)
npm run test:coverage

# Production build test
npm run build
```

---

## Reporting Vulnerabilities

If you discover a security vulnerability or credential leak risk, please do not open a public issue. Instead, report it privately to the repository owner.
