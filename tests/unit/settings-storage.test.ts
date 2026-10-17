import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  loadSettings,
  saveSettings,
  clearAllApiKeys,
  DEFAULT_SETTINGS,
  UserSettings,
} from '../../core/providers/settings-storage';

describe('settings-storage', () => {
  const originalChrome = (globalThis as unknown as { chrome: unknown }).chrome;

  beforeEach(() => {
    (globalThis as unknown as { chrome: unknown }).chrome = undefined;
  });

  afterEach(() => {
    (globalThis as unknown as { chrome: unknown }).chrome = originalChrome;
  });

  it('loads default settings initially', async () => {
    const settings = await loadSettings();
    expect(settings.activeProviderId).toBe(DEFAULT_SETTINGS.activeProviderId);
    expect(settings.persistKeysLocally).toBe(false);
  });

  it('updates in-memory settings without saving keys to disk', async () => {
    const current = await loadSettings();
    current.providers[2].apiKey = 'sk-inmemorykey12345';
    await saveSettings(current);

    const reloaded = await loadSettings();
    expect(reloaded.providers[2].apiKey).toBe('sk-inmemorykey12345');
  });

  it('clears all API keys completely', async () => {
    await clearAllApiKeys();
    const clean = await loadSettings();
    for (const p of clean.providers) {
      expect(p.apiKey).toBeUndefined();
    }
  });

  describe('with chrome.storage.local mocked', () => {
    let mockStorage: Record<string, unknown> = {};

    beforeEach(() => {
      mockStorage = {};
      (globalThis as unknown as { chrome: unknown }).chrome = {
        storage: {
          local: {
            get: vi.fn(async (keys: string[]) => {
              const res: Record<string, unknown> = {};
              for (const k of keys) {
                if (k in mockStorage) res[k] = mockStorage[k];
              }
              return res;
            }),
            set: vi.fn(async (items: Record<string, unknown>) => {
              Object.assign(mockStorage, items);
            }),
          },
        },
      };
    });

    it('persists keys when persistKeysLocally is explicitly true', async () => {
      const custom: UserSettings = {
        ...DEFAULT_SETTINGS,
        persistKeysLocally: true,
        providers: [
          ...DEFAULT_SETTINGS.providers.map((p) =>
            p.id === 'openai-compatible' ? { ...p, apiKey: 'sk-persistedkey' } : p
          ),
        ],
      };

      await saveSettings(custom);
      expect(mockStorage['tubeGlotSettings']).toBeDefined();

      const loaded = await loadSettings();
      expect(loaded.persistKeysLocally).toBe(true);
      expect(loaded.providers.find((p) => p.id === 'openai-compatible')?.apiKey).toBe('sk-persistedkey');
    });

    it('strips keys before writing to chrome.storage.local when persistKeysLocally is false', async () => {
      const custom: UserSettings = {
        ...DEFAULT_SETTINGS,
        persistKeysLocally: false,
        providers: [
          ...DEFAULT_SETTINGS.providers.map((p) =>
            p.id === 'openai-compatible' ? { ...p, apiKey: 'sk-should-not-persist' } : p
          ),
        ],
      };

      await saveSettings(custom);
      const inDisk = mockStorage['tubeGlotSettings'] as UserSettings;
      expect(inDisk.providers.find((p) => p.id === 'openai-compatible')?.apiKey).toBeUndefined();
    });

    it('clears keys through chrome.storage.local', async () => {
      await clearAllApiKeys();
      const loaded = await loadSettings();
      for (const p of loaded.providers) {
        expect(p.apiKey).toBeUndefined();
      }
    });
  });
});
