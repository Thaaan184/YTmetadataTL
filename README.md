# TubeGlot

> Personal-first, open-source YouTube metadata and subtitle localization helper.  
> Zero credit caps, zero project-operated backends, local-first subtitle timing preservation.

---

## Features

- **Backend-Free Architecture:** Runs entirely inside your browser (Chrome Manifest V3 via [WXT](https://wxt.dev)). No central servers, no user accounts, no tracking.
- **BYOK / Local LLM Inference:** Connect directly to any OpenAI-compatible provider (DeepSeek, OpenAI, Groq) with your personal API key, or to a local Ollama instance (`http://localhost:11434`).
- **Timing & Cue Preservation:** Subtitle timestamps and cue counts are programmatically preserved in code; LLMs receive only cue IDs and text.
- **Formatting Token Protection:** Inline subtitle formatting (`<b>`, `<i>`, `<v Speaker>`, `<c.class>`) is converted to opaque placeholders prior to LLM translation and validated upon return.
- **Roundtrip Supported Formats:** Full parsing and serialization for `.srt` and `.vtt` (WebVTT) files.

---

## Development & Testing

### Prerequisites
- Node.js LTS (v20+ or v22+)
- npm

### Installation
```bash
# Clone the repository
git clone https://github.com/Thaaan184/YTmetadataTL.git
cd YTmetadataTL

# Clean install dependencies
npm ci
```

### Running Tests & Quality Gates
```bash
# Typecheck
npm run typecheck

# Run unit tests with coverage
npm run test:coverage

# Build the Chrome Manifest V3 extension
npm run build
```

Production build artifacts land in `.output/chrome-mv3`. You can load this directory unpacked directly in Chrome under `chrome://extensions` (Developer Mode).

---

## Security & Privacy Policy

- **No Secrets in Code:** Build-time variables and repository files never carry API keys or credentials.
- **Session-Only Storage Default:** API keys entered into the extension settings are held in memory during the browser session by default. Opt-in local storage clearly discloses that local extension storage is unencrypted.
- **Strict HTTPS:** All remote provider connections strictly require HTTPS. Plain HTTP is restricted to local loopback addresses (`localhost`, `127.0.0.1`).

---

## License

MIT License. See [LICENSE](LICENSE) for details.
