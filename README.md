# TubeGlot

> Personal-first, open-source YouTube metadata and subtitle localization helper.  
> Zero credit caps, zero project-operated backends, local-first subtitle timing preservation.

---

## Key Features

- **Backend-Free Architecture:** Runs entirely inside your browser (Chrome Manifest V3 via [WXT](https://wxt.dev)). No central servers, no user accounts, no tracking.
- **BYOK & Local LLM Gateway:**
  - **9Router Support (Default Preset):** Connect to your local [9Router](http://localhost:20128) gateway (`http://localhost:20128/v1`) using DeepSeek, Qwen, or OpenAI-compatible models.
  - **Ollama Support:** Connect directly to local Ollama (`http://localhost:11434`).
  - **Custom OpenAI-compatible Endpoints:** Connect to any remote provider over strict HTTPS.
- **Timing & Cue Preservation:** Subtitle timestamps and cue counts are programmatically preserved in code; LLMs receive only cue IDs and text. AI models cannot shift audio synchronization.
- **Formatting Token Protection:** Inline subtitle formatting (`<b>`, `<i>`, `<v Speaker>`, `<c.class>`) is converted to opaque placeholders prior to LLM translation and validated upon return.
- **Roundtrip Supported Formats:** Full parsing and serialization for `.srt` and `.vtt` (WebVTT) files.
- **YouTube Metadata Limits:** Strict character budget enforcement (Title $\le$ 100 chars, Description $\le$ 5000 chars) with live counters and 1-click clipboard actions.

---

## Installation & Chrome Setup

### 1. Build the Extension
Ensure you have Node.js LTS (v20+ or v22+) installed:

```bash
git clone https://github.com/Thaaan184/YTmetadataTL.git
cd YTmetadataTL
npm ci
npm run build
```

Production build artifacts land in `.output/chrome-mv3`.

### 2. Load Unpacked in Google Chrome
1. Open Google Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** toggle in the top-right corner.
3. Click the **Load unpacked** button in the top-left corner.
4. Select the `.output/chrome-mv3` folder inside your cloned repository.
5. TubeGlot will appear in your Chrome toolbar. Click the extension icon to open the workspace.

---

## Connecting to 9Router

TubeGlot is pre-configured with a first-class preset for 9Router:
1. Ensure your 9Router gateway is running locally (default: `http://localhost:20128`).
2. Open TubeGlot and navigate to the **Settings** tab.
3. Select **9Router (Local Gateway)** from the Active Provider dropdown:
   - **Base URL:** `http://localhost:20128/v1`
   - **Model:** `deepseek-chat` (or your configured model name)
   - **API Key:** Leave blank if local auth is not required, or enter your 9Router key.
4. Click **Test Connection** to verify latency and connectivity.
5. Click **Save Settings**.

---

## Development & Testing

```bash
# Typecheck
npm run typecheck

# Run 111+ unit tests with coverage
npm run test:coverage

# Build the Chrome Manifest V3 extension
npm run build
```

---

## Security & Privacy Policy

- **No Secrets in Code:** Build-time variables and repository files never carry API keys or credentials.
- **Session-Only Storage Default:** API keys entered into the extension settings are held in memory during the browser session by default. Opt-in local storage clearly discloses that local extension storage is unencrypted.
- **Strict HTTPS:** All remote provider connections strictly require HTTPS. Plain HTTP is restricted to local loopback addresses (`localhost`, `127.0.0.1`).
- **No Telemetry / No Tracking:** Zero analytics, crash reporting, or external phone-home endpoints.

---

## License

MIT License. See [LICENSE](LICENSE) for details.
