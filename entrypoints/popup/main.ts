import {
  parseSrt,
  parseVtt,
  serializeSrt,
  serializeVtt,
  SubtitleDocument,
} from '../../core/subtitles';
import {
  loadSettings,
  saveSettings,
  clearAllApiKeys,
  UserSettings,
} from '../../core/providers/settings-storage';
import {
  OpenAiCompatibleProvider,
  OllamaProvider,
  MockProvider,
  TranslationProvider,
  ProviderConfig,
} from '../../core/providers';
import {
  runSubtitleTranslation,
  runMetadataTranslation,
} from '../../core/jobs/translation-runner';
import { SUPPORTED_LOCALES } from '../../core/localization/locales';
import {
  authenticateGoogle,
  getStoredToken,
  setStoredToken,
  clearStoredToken,
  fetchVideo,
  updateVideoLocalization,
  uploadCaption,
  YouTubeApiError,
} from '../../core/youtube';

// State
let currentSettings: UserSettings;
let currentLoadedDoc: SubtitleDocument | null = null;
let currentTranslatedDoc: SubtitleDocument | null = null;
let activeAbortController: AbortController | null = null;

interface PendingWriteAction {
  title: string;
  summary: string;
  diffText: string;
  quotaCost: number;
  execute: () => Promise<void>;
}

let pendingWriteAction: PendingWriteAction | null = null;

function showConfirmationModal(action: PendingWriteAction): void {
  pendingWriteAction = action;
  const modal = document.getElementById('confirmation-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalSummary = document.getElementById('modal-summary');
  const modalDiff = document.getElementById('modal-diff-container');
  const modalQuota = document.getElementById('modal-quota-cost');

  if (modalTitle) modalTitle.textContent = action.title;
  if (modalSummary) modalSummary.textContent = action.summary;
  if (modalDiff) modalDiff.textContent = action.diffText;
  if (modalQuota) modalQuota.textContent = String(action.quotaCost);

  if (modal) modal.style.display = 'flex';
}

function hideConfirmationModal(): void {
  pendingWriteAction = null;
  const modal = document.getElementById('confirmation-modal');
  if (modal) modal.style.display = 'none';
}


function showAlert(message: string, type: 'info' | 'error' | 'success' = 'info'): void {
  const alertEl = document.getElementById('global-alert');
  if (!alertEl) return;
  alertEl.className = `alert alert-${type}`;
  alertEl.textContent = message;
  alertEl.style.display = 'block';
  setTimeout(() => {
    alertEl.style.display = 'none';
  }, 5000);
}

function instantiateProvider(config: ProviderConfig): TranslationProvider {
  if (config.id === 'mock') {
    return new MockProvider();
  }
  if (config.id === 'ollama') {
    return new OllamaProvider({
      baseUrl: config.baseUrl,
      model: config.model,
    });
  }
  // 'openai-compatible' or '9router'
  return new OpenAiCompatibleProvider(config);
}

function getActiveProvider(): TranslationProvider {
  const activeCfg =
    currentSettings.providers.find((p) => p.id === currentSettings.activeProviderId) ||
    currentSettings.providers[0];
  return instantiateProvider(activeCfg);
}

function updateProviderBadge(): void {
  const badge = document.getElementById('active-provider-badge');
  if (!badge || !currentSettings) return;
  const activeCfg = currentSettings.providers.find(
    (p) => p.id === currentSettings.activeProviderId
  );
  badge.textContent = `Provider: ${activeCfg ? activeCfg.name : 'Unknown'}`;
}

// Tab navigation
function setupTabs(): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>('nav.tabs button');
  const panes = document.querySelectorAll<HTMLElement>('.tab-pane');

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      buttons.forEach((b) => b.classList.remove('active'));
      panes.forEach((p) => p.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(targetId || '')?.classList.add('active');
    });
  });
}

// Locale dropdown initialization
function setupLocales(): void {
  const subSelect = document.getElementById('subtitles-target-locale') as HTMLSelectElement;
  const metaSelect = document.getElementById('metadata-target-locale') as HTMLSelectElement;

  SUPPORTED_LOCALES.forEach((loc) => {
    const opt1 = document.createElement('option');
    opt1.value = loc.code;
    opt1.textContent = `${loc.name} (${loc.nativeName}) [${loc.code}]`;
    subSelect?.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = loc.code;
    opt2.textContent = `${loc.name} (${loc.nativeName}) [${loc.code}]`;
    metaSelect?.appendChild(opt2);
  });

  if (subSelect) subSelect.value = 'es';
  if (metaSelect) metaSelect.value = 'es';
}

// Subtitles workflow
function setupSubtitlesWorkflow(): void {
  const dropzone = document.getElementById('subtitle-dropzone');
  const fileInput = document.getElementById('subtitle-file-input') as HTMLInputElement;
  const fileInfo = document.getElementById('file-info');
  const startBtn = document.getElementById('start-subtitles-btn') as HTMLButtonElement;
  const cancelBtn = document.getElementById('cancel-subtitles-btn') as HTMLButtonElement;
  const progressBox = document.getElementById('subtitles-progress');
  const progressBar = document.getElementById('subtitles-progress-bar');
  const progressStatus = document.getElementById('subtitles-progress-status');
  const progressPercent = document.getElementById('subtitles-progress-percent');
  const previewBox = document.getElementById('subtitles-preview');
  const actionsBox = document.getElementById('subtitles-actions');
  const downloadBtn = document.getElementById('download-subtitles-btn');
  const copyBtn = document.getElementById('copy-subtitles-btn');
  const targetLocaleSelect = document.getElementById('subtitles-target-locale') as HTMLSelectElement;
  const toneInput = document.getElementById('subtitles-tone') as HTMLInputElement;

  dropzone?.addEventListener('click', () => fileInput?.click());

  dropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--accent-color)';
  });

  dropzone?.addEventListener('dragleave', () => {
    dropzone.style.borderColor = 'var(--border-color)';
  });

  dropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--border-color)';
    const file = e.dataTransfer?.files[0];
    if (file) handleSubtitleFile(file);
  });

  fileInput?.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) handleSubtitleFile(file);
  });

  async function handleSubtitleFile(file: File): Promise<void> {
    try {
      const text = await file.text();
      const isVtt = file.name.endsWith('.vtt') || text.trim().startsWith('WEBVTT');
      const parseResult = isVtt ? parseVtt(text) : parseSrt(text);

      if (!parseResult.success) {
        showAlert(`Failed to parse ${file.name}: ${parseResult.errors[0]?.message}`, 'error');
        return;
      }

      currentLoadedDoc = parseResult.document;
      currentTranslatedDoc = null;

      if (fileInfo) {
        fileInfo.style.display = 'block';
        fileInfo.textContent = `Loaded ${file.name} (${currentLoadedDoc.cues.length} cues, format: ${currentLoadedDoc.format.toUpperCase()})`;
      }

      startBtn.disabled = false;
      if (actionsBox) actionsBox.style.display = 'none';
      if (previewBox) previewBox.style.display = 'none';
      showAlert(`Loaded ${currentLoadedDoc.cues.length} cues successfully.`, 'success');
    } catch (err) {
      showAlert(`Error reading file: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  }

  startBtn?.addEventListener('click', async () => {
    if (!currentLoadedDoc) return;

    activeAbortController = new AbortController();
    startBtn.disabled = true;
    cancelBtn.style.display = 'inline-flex';
    if (progressBox) progressBox.style.display = 'block';
    if (actionsBox) actionsBox.style.display = 'none';

    try {
      const provider = getActiveProvider();
      const targetLang = targetLocaleSelect.value;
      const tone = toneInput.value.trim();

      const translated = await runSubtitleTranslation(currentLoadedDoc, provider, {
        targetLanguage: targetLang,
        tonePrompt: tone || undefined,
        signal: activeAbortController.signal,
        onProgress: (p) => {
          if (progressStatus) progressStatus.textContent = p.message;
          if (progressPercent) progressPercent.textContent = `${p.percent}%`;
          if (progressBar) progressBar.style.width = `${p.percent}%`;
        },
      });

      currentTranslatedDoc = translated;
      const serialized =
        translated.format === 'vtt' ? serializeVtt(translated) : serializeSrt(translated);

      if (previewBox) {
        previewBox.style.display = 'block';
        previewBox.textContent = serialized;
      }
      if (actionsBox) actionsBox.style.display = 'flex';
      const syncBox = document.getElementById('subtitles-direct-sync');
      if (syncBox) syncBox.style.display = 'block';
      showAlert('Translation completed successfully!', 'success');
    } catch (err) {
      showAlert(`Translation failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      startBtn.disabled = false;
      cancelBtn.style.display = 'none';
      activeAbortController = null;
    }
  });

  cancelBtn?.addEventListener('click', () => {
    if (activeAbortController) {
      activeAbortController.abort();
      showAlert('Translation cancelled by user.', 'info');
    }
  });

  downloadBtn?.addEventListener('click', () => {
    if (!currentTranslatedDoc) return;
    const isVtt = currentTranslatedDoc.format === 'vtt';
    const content = isVtt ? serializeVtt(currentTranslatedDoc) : serializeSrt(currentTranslatedDoc);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subtitles_${currentTranslatedDoc.sourceLanguage || 'translated'}.${currentTranslatedDoc.format}`;
    a.click();
    URL.revokeObjectURL(url);
  });

  copyBtn?.addEventListener('click', async () => {
    if (!currentTranslatedDoc) return;
    const isVtt = currentTranslatedDoc.format === 'vtt';
    const content = isVtt ? serializeVtt(currentTranslatedDoc) : serializeSrt(currentTranslatedDoc);
    await navigator.clipboard.writeText(content);
    showAlert('Subtitles copied to clipboard!', 'success');
  });

  // Direct YouTube Upload
  const uploadYtBtn = document.getElementById('upload-subtitles-yt-btn');
  const videoIdInput = document.getElementById('subtitles-video-id') as HTMLInputElement;

  uploadYtBtn?.addEventListener('click', () => {
    const token = getStoredToken();
    if (!token) {
      showAlert('Google Account not connected. Please connect in Settings tab.', 'error');
      return;
    }

    const videoId = videoIdInput?.value.trim();
    if (!videoId) {
      showAlert('Please enter a target YouTube Video ID.', 'error');
      return;
    }

    if (!currentTranslatedDoc) {
      showAlert('No translated subtitle ready to upload.', 'error');
      return;
    }

    const targetLang = targetLocaleSelect.value;
    const isVtt = currentTranslatedDoc.format === 'vtt';
    const content = isVtt ? serializeVtt(currentTranslatedDoc) : serializeSrt(currentTranslatedDoc);

    showConfirmationModal({
      title: 'Confirm Subtitle Upload to YouTube Studio',
      summary: `Uploading ${isVtt ? 'WebVTT' : 'SRT'} caption track to video [${videoId}] for language [${targetLang}].`,
      diffText: content.substring(0, 1000) + (content.length > 1000 ? '\n... (truncated preview)' : ''),
      quotaCost: 400,
      execute: async () => {
        uploadYtBtn.setAttribute('disabled', 'true');
        try {
          const res = await uploadCaption(
            videoId,
            targetLang,
            `TubeGlot Subtitles (${targetLang.toUpperCase()})`,
            content,
            token
          );
          showAlert(`Subtitles uploaded to YouTube successfully! Track ID: ${res.id}`, 'success');
        } catch (err) {
          showAlert(`Upload failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
        } finally {
          uploadYtBtn.removeAttribute('disabled');
        }
      },
    });
  });
}

// Metadata workflow
function setupMetadataWorkflow(): void {
  const titleInput = document.getElementById('meta-source-title') as HTMLInputElement;
  const descInput = document.getElementById('meta-source-desc') as HTMLTextAreaElement;
  const titleCount = document.getElementById('title-char-count');
  const descCount = document.getElementById('desc-char-count');
  const translateBtn = document.getElementById('translate-meta-btn') as HTMLButtonElement;
  const targetLocaleSelect = document.getElementById('metadata-target-locale') as HTMLSelectElement;
  const resultContainer = document.getElementById('metadata-result-container');
  const resultTitle = document.getElementById('meta-result-title') as HTMLInputElement;
  const resultDesc = document.getElementById('meta-result-desc') as HTMLTextAreaElement;
  const resultTags = document.getElementById('meta-result-tags') as HTMLInputElement;
  const progressBox = document.getElementById('metadata-progress');

  titleInput?.addEventListener('input', () => {
    const len = titleInput.value.length;
    if (titleCount) {
      titleCount.textContent = `${len} / 100`;
      titleCount.className = len > 100 ? 'char-counter limit-exceeded' : 'char-counter';
    }
  });

  descInput?.addEventListener('input', () => {
    const len = descInput.value.length;
    if (descCount) {
      descCount.textContent = `${len} / 5000`;
      descCount.className = len > 5000 ? 'char-counter limit-exceeded' : 'char-counter';
    }
  });

  translateBtn?.addEventListener('click', async () => {
    const title = titleInput.value.trim();
    const desc = descInput.value.trim();
    const targetLocale = targetLocaleSelect.value;

    if (!title) {
      showAlert('Please enter a source video title.', 'error');
      return;
    }

    translateBtn.disabled = true;
    if (progressBox) progressBox.style.display = 'block';
    if (resultContainer) resultContainer.style.display = 'none';

    try {
      const provider = getActiveProvider();
      const localized = await runMetadataTranslation(title, desc, targetLocale, provider);

      if (resultTitle) resultTitle.value = localized.title;
      if (resultDesc) resultDesc.value = localized.description;
      if (resultTags) resultTags.value = localized.tagSuggestions?.join(', ') || '';

      if (resultContainer) resultContainer.style.display = 'block';
      showAlert(`Metadata localized into ${targetLocale} successfully!`, 'success');
    } catch (err) {
      showAlert(`Metadata localization failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      translateBtn.disabled = false;
      if (progressBox) progressBox.style.display = 'none';
    }
  });

  document.getElementById('copy-meta-title-btn')?.addEventListener('click', async () => {
    if (resultTitle?.value) {
      await navigator.clipboard.writeText(resultTitle.value);
      showAlert('Title copied to clipboard!', 'success');
    }
  });

  document.getElementById('copy-meta-desc-btn')?.addEventListener('click', async () => {
    if (resultDesc?.value) {
      await navigator.clipboard.writeText(resultDesc.value);
      showAlert('Description copied to clipboard!', 'success');
    }
  });

  document.getElementById('copy-meta-tags-btn')?.addEventListener('click', async () => {
    if (resultTags?.value) {
      await navigator.clipboard.writeText(resultTags.value);
      showAlert('Tags copied to clipboard!', 'success');
    }
  });

  // Direct YouTube Metadata Sync
  const fetchOriginalBtn = document.getElementById('fetch-original-meta-btn');
  const publishMetaBtn = document.getElementById('publish-metadata-yt-btn');
  const metaVideoIdInput = document.getElementById('metadata-video-id') as HTMLInputElement;

  fetchOriginalBtn?.addEventListener('click', async () => {
    const token = getStoredToken();
    if (!token) {
      showAlert('Google Account not connected. Please connect in Settings tab.', 'error');
      return;
    }

    const videoId = metaVideoIdInput?.value.trim();
    if (!videoId) {
      showAlert('Please enter a target YouTube Video ID.', 'error');
      return;
    }

    fetchOriginalBtn.setAttribute('disabled', 'true');
    try {
      const video = await fetchVideo(videoId, token);
      titleInput.value = video.snippet.title;
      descInput.value = video.snippet.description;

      // Update counters
      const titleLen = titleInput.value.length;
      if (titleCount) titleCount.textContent = `${titleLen} / 100`;
      const descLen = descInput.value.length;
      if (descCount) descCount.textContent = `${descLen} / 5000`;

      showAlert(`Fetched video "${video.snippet.title}" from YouTube!`, 'success');
    } catch (err) {
      showAlert(`Fetch failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      fetchOriginalBtn.removeAttribute('disabled');
    }
  });

  publishMetaBtn?.addEventListener('click', () => {
    const token = getStoredToken();
    if (!token) {
      showAlert('Google Account not connected. Please connect in Settings tab.', 'error');
      return;
    }

    const videoId = metaVideoIdInput?.value.trim();
    if (!videoId) {
      showAlert('Please enter a target YouTube Video ID.', 'error');
      return;
    }

    const locTitle = resultTitle?.value.trim();
    const locDesc = resultDesc?.value.trim();

    if (!locTitle) {
      showAlert('No localized title generated yet.', 'error');
      return;
    }

    const targetLocale = targetLocaleSelect.value;

    showConfirmationModal({
      title: 'Confirm Metadata Publication to YouTube Studio',
      summary: `Updating localizations[${targetLocale}] on video [${videoId}]. Original titles/descriptions and categories will be strictly preserved.`,
      diffText: `Locale: ${targetLocale}\nTitle: ${locTitle}\nDescription:\n${locDesc}`,
      quotaCost: 50,
      execute: async () => {
        publishMetaBtn.setAttribute('disabled', 'true');
        try {
          await updateVideoLocalization(videoId, targetLocale, locTitle, locDesc, token);
          showAlert(`Metadata for [${targetLocale}] published to YouTube video [${videoId}] successfully!`, 'success');
        } catch (err) {
          showAlert(`Publication failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
        } finally {
          publishMetaBtn.removeAttribute('disabled');
        }
      },
    });
  });
}

// Settings workflow
function setupSettingsWorkflow(): void {
  const providerSelect = document.getElementById('settings-provider-select') as HTMLSelectElement;
  const baseUrlInput = document.getElementById('settings-base-url') as HTMLInputElement;
  const modelInput = document.getElementById('settings-model') as HTMLInputElement;
  const apiKeyInput = document.getElementById('settings-api-key') as HTMLInputElement;
  const persistCheck = document.getElementById('settings-persist-key') as HTMLInputElement;
  const saveBtn = document.getElementById('save-settings-btn');
  const testBtn = document.getElementById('test-connection-btn');
  const clearBtn = document.getElementById('clear-keys-btn');
  const toggleKeyBtn = document.getElementById('toggle-key-visibility-btn');
  const statusMsg = document.getElementById('connection-status-msg');

  function renderProviderList(): void {
    providerSelect.innerHTML = '';
    currentSettings.providers.forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      providerSelect.appendChild(opt);
    });
    providerSelect.value = currentSettings.activeProviderId;
    loadSelectedProviderIntoForm();
  }

  function loadSelectedProviderIntoForm(): void {
    const selectedId = providerSelect.value;
    const config = currentSettings.providers.find((p) => p.id === selectedId);
    if (!config) return;

    baseUrlInput.value = config.baseUrl;
    modelInput.value = config.model;
    apiKeyInput.value = config.apiKey || '';
  }

  providerSelect?.addEventListener('change', () => {
    loadSelectedProviderIntoForm();
  });

  toggleKeyBtn?.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      toggleKeyBtn.textContent = 'Hide';
    } else {
      apiKeyInput.type = 'password';
      toggleKeyBtn.textContent = 'Show';
    }
  });

  saveBtn?.addEventListener('click', async () => {
    const selectedId = providerSelect.value;
    const target = currentSettings.providers.find((p) => p.id === selectedId);
    if (target) {
      target.baseUrl = baseUrlInput.value.trim();
      target.model = modelInput.value.trim();
      const keyVal = apiKeyInput.value.trim();
      target.apiKey = keyVal || undefined;
    }

    currentSettings.activeProviderId = selectedId;
    currentSettings.persistKeysLocally = persistCheck.checked;

    await saveSettings(currentSettings);
    updateProviderBadge();
    showAlert('Settings saved successfully!', 'success');
  });

  testBtn?.addEventListener('click', async () => {
    if (statusMsg) {
      statusMsg.style.display = 'block';
      statusMsg.style.color = 'var(--text-muted)';
      statusMsg.textContent = 'Testing connection...';
    }

    try {
      const provider = getActiveProvider();
      const res = await provider.testConnection();
      if (statusMsg) {
        statusMsg.style.color = res.ok ? 'var(--success-color)' : 'var(--danger-color)';
        statusMsg.textContent = `${res.message} ${res.latencyMs ? `(${res.latencyMs}ms)` : ''}`;
      }
    } catch (err) {
      if (statusMsg) {
        statusMsg.style.color = 'var(--danger-color)';
        statusMsg.textContent = `Error: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
  });

  clearBtn?.addEventListener('click', async () => {
    await clearAllApiKeys();
    currentSettings = await loadSettings();
    apiKeyInput.value = '';
    showAlert('All stored keys cleared from memory and storage.', 'info');
  });

  // Google OAuth Controls
  const googleClientIdInput = document.getElementById('settings-google-client-id') as HTMLInputElement;
  const redirectDisplay = document.getElementById('redirect-uri-display');
  const copyRedirectBtn = document.getElementById('copy-redirect-uri-btn');
  const connectGoogleBtn = document.getElementById('connect-google-btn');
  const disconnectGoogleBtn = document.getElementById('disconnect-google-btn');
  const googleAccountStatus = document.getElementById('google-account-status');

  const redirectUri =
    typeof chrome !== 'undefined' && chrome.identity?.getRedirectURL
      ? chrome.identity.getRedirectURL()
      : 'https://<extension-id>.chromiumapp.org/';

  if (redirectDisplay) redirectDisplay.textContent = redirectUri;

  copyRedirectBtn?.addEventListener('click', async () => {
    await navigator.clipboard.writeText(redirectUri);
    showAlert('Redirect URI copied to clipboard!', 'success');
  });

  function updateGoogleStatus(): void {
    const token = getStoredToken();
    if (token) {
      if (googleAccountStatus) {
        googleAccountStatus.textContent = 'Status: Connected (Active Session)';
        googleAccountStatus.style.color = 'var(--success-color)';
      }
      if (connectGoogleBtn) connectGoogleBtn.style.display = 'none';
      if (disconnectGoogleBtn) disconnectGoogleBtn.style.display = 'inline-flex';
    } else {
      if (googleAccountStatus) {
        googleAccountStatus.textContent = 'Status: Not Connected';
        googleAccountStatus.style.color = 'var(--text-muted)';
      }
      if (connectGoogleBtn) connectGoogleBtn.style.display = 'inline-flex';
      if (disconnectGoogleBtn) disconnectGoogleBtn.style.display = 'none';
    }
  }

  if (googleClientIdInput && currentSettings.googleOAuthClientId) {
    googleClientIdInput.value = currentSettings.googleOAuthClientId;
  }

  connectGoogleBtn?.addEventListener('click', async () => {
    const clientId = googleClientIdInput?.value.trim();
    if (!clientId) {
      showAlert('Please enter your Google OAuth Client ID first.', 'error');
      return;
    }

    currentSettings.googleOAuthClientId = clientId;
    await saveSettings(currentSettings);

    try {
      showAlert('Opening Google sign-in window...', 'info');
      await authenticateGoogle(clientId);
      updateGoogleStatus();
      showAlert('Connected to Google account successfully!', 'success');
    } catch (err) {
      showAlert(`Google sign-in failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  });

  disconnectGoogleBtn?.addEventListener('click', () => {
    clearStoredToken();
    updateGoogleStatus();
    showAlert('Disconnected Google account session.', 'info');
  });

  // Modal event wiring
  document.getElementById('modal-close-btn')?.addEventListener('click', hideConfirmationModal);
  document.getElementById('modal-cancel-btn')?.addEventListener('click', hideConfirmationModal);
  document.getElementById('modal-confirm-btn')?.addEventListener('click', async () => {
    if (pendingWriteAction) {
      const action = pendingWriteAction;
      hideConfirmationModal();
      await action.execute();
    }
  });

  // Initial load
  persistCheck.checked = currentSettings.persistKeysLocally;
  renderProviderList();
  updateGoogleStatus();
}

async function init(): Promise<void> {
  currentSettings = await loadSettings();
  updateProviderBadge();
  setupTabs();
  setupLocales();
  setupSubtitlesWorkflow();
  setupMetadataWorkflow();
  setupSettingsWorkflow();
}

document.addEventListener('DOMContentLoaded', init);
