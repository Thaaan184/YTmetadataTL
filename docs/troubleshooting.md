# TubeGlot Troubleshooting Guide

---

## 1. Local Git & Build Issues

### `npm error ENOENT: Could not read package.json`
- **Cause:** You are on an outdated branch or an initial audit commit that did not yet contain the project workspace files.
- **Solution:**
  ```powershell
  git clean -fd
  git checkout main
  git pull origin main
  npm install
  npm run build
  ```

### `error: The following untracked working tree files would be overwritten by merge`
- **Cause:** A local untracked file (such as `package-lock.json`) was generated before pulling from remote.
- **Solution:**
  ```powershell
  git clean -fd
  git checkout main
  git pull origin main
  ```

---

## 2. 9Router & Provider Connectivity

### "Connection failed / Provider unreachable"
- **Cause:** 9Router local service is not running on port 20128 or wrong base URL is entered.
- **Solution:**
  1. Verify 9Router is active in your terminal or Docker: `curl http://localhost:20128/v1/models`.
  2. In TubeGlot Settings, ensure Base URL is set to `http://localhost:20128/v1`.
  3. Ensure Model name matches the model loaded in your 9Router configuration (e.g. `deepseek-chat` or `gpt-4o-mini`).

### Insecure HTTP Error for Remote Endpoints
- **Cause:** TubeGlot prohibits plain HTTP for remote internet servers to protect against credential interception.
- **Solution:** Ensure remote endpoints use `https://` (e.g. `https://api.openai.com/v1`). Plain `http://` is allowed solely for local loopback addresses (`127.0.0.1` and `localhost`).

---

## 3. Subtitle Formatting & Parsing

### "Failed to parse .srt / .vtt"
- **Cause:** The subtitle file does not contain valid time separators (`-->`) or has corrupted header encoding.
- **Solution:** Ensure the file is valid UTF-8. TubeGlot automatically strips UTF-8 BOM markers and handles CRLF line endings, but timestamps must follow standard SRT (`00:00:01,000`) or WebVTT (`00:00:01.000`) conventions.

### "Tag placeholder corruption"
- **Cause:** A model modified an internal tag token like `[[TAG_0]]` during translation.
- **Solution:** In Settings, switch to a more capable model (e.g. DeepSeek V3, Qwen 2.5 72B, or GPT-4o-mini) that respects strict instruction following.

---

## 4. YouTube OAuth & Direct Sync

### "User cancelled Google authentication or flow failed"
- **Cause:** The Redirect URI configured in your Google Cloud Console does not match your Chrome extension's redirect URL.
- **Solution:**
  1. In TubeGlot Settings, expand the Optional YouTube OAuth accordion.
  2. Copy the exact Redirect URI displayed (format: `https://<id>.chromiumapp.org/`).
  3. In Google Cloud Console $\rightarrow$ APIs & Services $\rightarrow$ Credentials $\rightarrow$ your OAuth Client ID, add this URI to "Authorized redirect URIs".

### "YouTube API quota exceeded" (403)
- **Cause:** Your Google Cloud project exceeded the 10,000 daily free quota.
- **Solution:** Fall back to the default **Manual Export** workflow: click "Download Subtitle File" or "Copy Title/Desc", and paste directly into YouTube Studio without using API quota.
