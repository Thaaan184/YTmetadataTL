# TubeGlot Manual Smoke Test Checklist

> **Document ID:** SMOKE-TEST  
> **Frequency:** Run prior to every minor/major release

---

## 1. Environment & Build Integrity
- [ ] Clean clone: `git clone ... && npm ci` completes without error.
- [ ] Test suite: `npm run test:coverage` completes with 100% test pass rate and >90% coverage.
- [ ] Type check: `npm run typecheck` produces zero errors.
- [ ] Build: `npm run build` generates `.output/chrome-mv3` with valid `manifest.json`.

---

## 2. Chrome Extension Loading
- [ ] Open `chrome://extensions` in Google Chrome with Developer Mode enabled.
- [ ] Click "Load unpacked" and select `.output/chrome-mv3`.
- [ ] Verify TubeGlot icon appears without manifest loading errors or security warnings.
- [ ] Click icon: Extension popup renders within 200ms with high contrast dark UI.

---

## 3. Subtitles Workflow (Manual & Local)
- [ ] Open **Subtitles** tab.
- [ ] Drop a sample `.srt` file into the dropzone.
- [ ] Verify cue count and format badge are displayed correctly.
- [ ] Select a target language (e.g. Spanish `es`).
- [ ] Click "Start Translation".
- [ ] Verify progress bar updates dynamically.
- [ ] When complete, verify preview contains translated text while timestamps match source cues exactly.
- [ ] Click "Download Subtitle File": file downloads with valid format extension.
- [ ] Click "Copy to Clipboard": paste into text editor to verify identical contents.

---

## 4. Metadata Workflow (Manual & Local)
- [ ] Open **Metadata** tab.
- [ ] Type source video title and description.
- [ ] Verify character counters increment accurately (`/ 100` and `/ 5000`).
- [ ] Exceed 100 characters in title to confirm red warning style is applied.
- [ ] Select target locale (e.g. `es`) and click "Translate Metadata".
- [ ] Verify localized title ($\le 100$), description ($\le 5000$), and tags are displayed.
- [ ] Test individual "Copy Title", "Copy Desc", and "Copy Tags" buttons.

---

## 5. Settings & Provider Connectivity
- [ ] Open **Settings** tab.
- [ ] Verify **9Router (Local Gateway)** is the default provider (`http://localhost:20128/v1`).
- [ ] Switch provider to Mock Provider and click "Test Connection". Verify green latency status.
- [ ] Enter an API key, toggle Show/Hide password mask.
- [ ] Click "Save Settings" and reload popup: verify settings persist properly.
- [ ] Click "Clear Stored Keys": verify stored keys are removed.

---

## 6. YouTube Studio Direct Sync (Optional OAuth)
- [ ] Expand optional direct sync accordion in Settings.
- [ ] Copy redirect URI and confirm format `https://<extension-id>.chromiumapp.org/`.
- [ ] Attempt upload/publish without sign-in: verify helpful error prompt to connect Google account.
- [ ] Trigger publish action: verify confirmation modal opens with field diff, quota cost, and cancel button.
- [ ] Verify clicking Cancel aborts write without network activity.
