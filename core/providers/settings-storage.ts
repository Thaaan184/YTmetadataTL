import { ProviderConfig } from './types';

export interface UserSettings {
  activeProviderId: string;
  providers: ProviderConfig[];
  targetLocales: string[];
  persistKeysLocally: boolean; // Opt-in flag with security warning
  googleOAuthClientId?: string; // Optional user Google OAuth 2.0 Client ID for Phase 6
}

export const DEFAULT_SETTINGS: UserSettings = {
  activeProviderId: 'mock',
  providers: [
    {
      id: '9router',
      name: '9Router (Local Gateway)',
      baseUrl: 'http://localhost:20128/v1',
      model: 'deepseek-chat',
    },
    {
      id: 'mock',
      name: 'Mock Test Provider',
      baseUrl: 'http://localhost',
      model: 'mock-model',
    },
    {
      id: 'ollama',
      name: 'Ollama Local',
      baseUrl: 'http://localhost:11434',
      model: 'llama3',
    },
    {
      id: 'openai-compatible',
      name: 'Custom OpenAI / DeepSeek',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
    },
  ],
  targetLocales: ['es', 'de', 'pt-BR', 'ja', 'id'],
  persistKeysLocally: false, // Default is session-only in-memory
};

// In-memory session store (default safe mechanism)
let sessionStore: UserSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

/**
 * Loads user settings. Reads from chrome.storage.local if available and opted in,
 * otherwise returns in-memory session settings.
 */
export async function loadSettings(): Promise<UserSettings> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    try {
      const data = await chrome.storage.local.get(['tubeGlotSettings']);
      if (data?.tubeGlotSettings) {
        const stored = data.tubeGlotSettings as UserSettings;
        if (stored.persistKeysLocally) {
          sessionStore = stored;
          return stored;
        }
        // If not opted in to persist keys, strip apiKey from loaded settings
        const sanitized = {
          ...stored,
          providers: stored.providers.map((p) => ({ ...p, apiKey: sessionStore.providers.find((sp) => sp.id === p.id)?.apiKey })),
        };
        return sanitized;
      }
    } catch {
      // fallback to sessionStore
    }
  }

  return JSON.parse(JSON.stringify(sessionStore));
}

/**
 * Saves user settings. If persistKeysLocally is false, keys are preserved
 * solely in active memory and not written to disk.
 */
export async function saveSettings(settings: UserSettings): Promise<void> {
  sessionStore = JSON.parse(JSON.stringify(settings));

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    if (settings.persistKeysLocally) {
      await chrome.storage.local.set({ tubeGlotSettings: settings });
    } else {
      // Strip apiKeys before saving to local disk storage
      const sanitized = {
        ...settings,
        providers: settings.providers.map((p) => {
          const { apiKey: _omitted, ...rest } = p;
          return rest;
        }),
      };
      await chrome.storage.local.set({ tubeGlotSettings: sanitized });
    }
  }
}

/**
 * Clears all API keys from both in-memory session and persisted storage.
 */
export async function clearAllApiKeys(): Promise<void> {
  sessionStore.providers = sessionStore.providers.map((p) => {
    const { apiKey: _omitted, ...rest } = p;
    return rest as ProviderConfig;
  });

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await saveSettings(sessionStore);
  }
}
