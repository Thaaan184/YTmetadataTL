import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OllamaProvider } from '../../core/providers/ollama';

describe('OllamaProvider', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('tests connection and checks model presence in Ollama', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [{ name: 'llama3:latest' }],
      }),
    });

    const provider = new OllamaProvider({
      baseUrl: 'http://localhost:11434',
      model: 'llama3',
    });

    const health = await provider.testConnection();
    expect(health.ok).toBe(true);
    expect(health.message).toContain('verified');
  });

  it('warns when model is not found in Ollama available models', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [{ name: 'mistral:latest' }],
      }),
    });

    const provider = new OllamaProvider({
      baseUrl: 'http://localhost:11434',
      model: 'llama3',
    });

    const health = await provider.testConnection();
    expect(health.ok).toBe(true);
    expect(health.message).toContain('not found in available models');
  });

  it('translates via /api/chat with format json', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: { content: '{"translations": [{"id": "1", "text": "Translated via Ollama"}]}' },
      }),
    });

    const provider = new OllamaProvider({
      baseUrl: 'http://localhost:11434',
      model: 'llama3',
    });

    const result = await provider.translateStructured<{ translations: { id: string; text: string }[] }>({
      systemPrompt: 'System',
      userPrompt: 'User',
    });

    expect(result.translations[0].text).toBe('Translated via Ollama');
  });

  it('throws when Ollama message content is empty', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: { content: '' },
      }),
    });

    const provider = new OllamaProvider({
      baseUrl: 'http://localhost:11434',
      model: 'llama3',
    });

    await expect(
      provider.translateStructured({ systemPrompt: '', userPrompt: '' })
    ).rejects.toThrow(/empty response message content/);
  });

  it('handles network connection failures safely', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    const provider = new OllamaProvider({
      baseUrl: 'http://localhost:11434',
      model: 'llama3',
    });

    await expect(
      provider.translateStructured({ systemPrompt: '', userPrompt: '' })
    ).rejects.toThrow(/Failed to communicate with Ollama/);
  });
});
