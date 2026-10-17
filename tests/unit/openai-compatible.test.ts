import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  OpenAiCompatibleProvider,
  validateEndpointUrl,
  extractJsonFromResponse,
} from '../../core/providers/openai-compatible';
import { ProviderError } from '../../core/providers/types';

describe('OpenAiCompatibleProvider', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('Endpoint Security Validation', () => {
    it('accepts HTTPS remote URLs', () => {
      const url = validateEndpointUrl('https://api.openai.com/v1');
      expect(url.protocol).toBe('https:');
    });

    it('accepts HTTP only for local loopback hosts (localhost, 127.0.0.1)', () => {
      expect(validateEndpointUrl('http://localhost:11434').hostname).toBe('localhost');
      expect(validateEndpointUrl('http://127.0.0.1:20128/v1').hostname).toBe('127.0.0.1');
    });

    it('rejects unencrypted HTTP for remote internet endpoints', () => {
      expect(() => validateEndpointUrl('http://api.deepseek.com/v1')).toThrow(
        /Insecure HTTP endpoint forbidden/
      );
    });

    it('rejects unsupported protocols', () => {
      expect(() => validateEndpointUrl('ftp://example.com')).toThrow(
        /Unsupported protocol/
      );
    });

    it('rejects malformed URLs', () => {
      expect(() => validateEndpointUrl('not a url')).toThrow(ProviderError);
    });
  });

  describe('extractJsonFromResponse', () => {
    it('parses raw JSON string', () => {
      expect(extractJsonFromResponse('{"title": "Test"}')).toEqual({ title: 'Test' });
    });

    it('extracts JSON enclosed within markdown code fences', () => {
      const wrapped = '```json\n{\n  "translations": [{"id": "1", "text": "Halo"}]\n}\n```';
      expect(extractJsonFromResponse(wrapped)).toEqual({
        translations: [{ id: '1', text: 'Halo' }],
      });
    });

    it('throws SCHEMA_MISMATCH on unparseable garbage', () => {
      expect(() => extractJsonFromResponse('Not a JSON at all')).toThrow(ProviderError);
    });
  });

  describe('testConnection', () => {
    it('returns ok: true when endpoint is reachable', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
      });

      const provider = new OpenAiCompatibleProvider({
        id: 'openai-compatible',
        name: 'OpenAI Test',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test',
        model: 'gpt-4o-mini',
      });

      const res = await provider.testConnection();
      expect(res.ok).toBe(true);
      expect(res.message).toContain('reachable');
    });

    it('returns ok: false when endpoint returns HTTP error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const provider = new OpenAiCompatibleProvider({
        id: 'openai-compatible',
        name: 'OpenAI Test',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
      });

      const res = await provider.testConnection();
      expect(res.ok).toBe(false);
      expect(res.message).toContain('HTTP 404');
    });

    it('returns ok: false on network rejection', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));

      const provider = new OpenAiCompatibleProvider({
        id: 'openai-compatible',
        name: 'OpenAI Test',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
      });

      const res = await provider.testConnection();
      expect(res.ok).toBe(false);
      expect(res.message).toContain('Network failure');
    });
  });

  describe('translateStructured & Error Redaction', () => {
    it('successfully translates and parses response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"translations": [{"id": "1", "text": "Hola"}]}' } }],
        }),
      });

      const provider = new OpenAiCompatibleProvider({
        id: 'openai-compatible',
        name: 'OpenAI Test',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-supersecretkey12345678901234567890',
        model: 'gpt-4o-mini',
      });

      const result = await provider.translateStructured<{ translations: { id: string; text: string }[] }>({
        systemPrompt: 'System',
        userPrompt: 'User',
      });

      expect(result.translations[0].text).toBe('Hola');
    });

    it('retries on 429 and succeeds on subsequent attempt', async () => {
      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return { ok: false, status: 429, statusText: 'Too Many Requests' };
        }
        return {
          ok: true,
          json: async () => ({
            choices: [{ message: { content: '{"translations": [{"id": "1", "text": "Recovered"}]}' } }],
          }),
        };
      });

      const provider = new OpenAiCompatibleProvider(
        {
          id: 'openai-compatible',
          name: 'OpenAI Test',
          baseUrl: 'https://api.openai.com/v1',
          model: 'gpt-4o-mini',
        },
        { maxRetries: 2, baseBackoffMs: 10 }
      );

      const res = await provider.translateStructured<{ translations: { id: string; text: string }[] }>({
        systemPrompt: '',
        userPrompt: '',
      });

      expect(res.translations[0].text).toBe('Recovered');
      expect(callCount).toBe(2);
    });

    it('fails when 429 persists beyond maxRetries', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });

      const provider = new OpenAiCompatibleProvider(
        {
          id: 'openai-compatible',
          name: 'OpenAI Test',
          baseUrl: 'https://api.openai.com/v1',
          model: 'gpt-4o-mini',
        },
        { maxRetries: 1, baseBackoffMs: 10 }
      );

      await expect(
        provider.translateStructured({ systemPrompt: '', userPrompt: '' })
      ).rejects.toThrow(/Rate limit/);
    });

    it('handles cancellation during backoff sleep', async () => {
      const controller = new AbortController();
      globalThis.fetch = vi.fn().mockImplementation(async () => {
        setTimeout(() => controller.abort(), 20);
        return { ok: false, status: 429, statusText: 'Too Many Requests' };
      });

      const provider = new OpenAiCompatibleProvider(
        {
          id: 'openai-compatible',
          name: 'OpenAI Test',
          baseUrl: 'https://api.openai.com/v1',
          model: 'gpt-4o-mini',
        },
        { maxRetries: 2, baseBackoffMs: 200 }
      );

      await expect(
        provider.translateStructured({
          systemPrompt: '',
          userPrompt: '',
          signal: controller.signal,
        })
      ).rejects.toThrow(/cancelled/i);
    });

    it('throws when choices content is empty', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: '' } }] }),
      });

      const provider = new OpenAiCompatibleProvider({
        id: 'openai-compatible',
        name: 'OpenAI Test',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
      });

      await expect(
        provider.translateStructured({ systemPrompt: '', userPrompt: '' })
      ).rejects.toThrow(/empty response content/);
    });

    it('handles HTTP 401 and redacts authorization details from error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const provider = new OpenAiCompatibleProvider({
        id: 'openai-compatible',
        name: 'OpenAI Test',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-supersecretkey12345678901234567890',
        model: 'gpt-4o-mini',
      });

      try {
        await provider.translateStructured({ systemPrompt: '', userPrompt: '' });
      } catch (err) {
        expect((err as Error).message).not.toContain('sk-supersecret');
        expect((err as ProviderError).code).toBe('UNAUTHORIZED');
      }
    });

    it('handles cancellation via AbortSignal', async () => {
      const controller = new AbortController();
      controller.abort();

      const provider = new OpenAiCompatibleProvider({
        id: 'openai-compatible',
        name: 'OpenAI Test',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
      });

      await expect(
        provider.translateStructured({
          systemPrompt: '',
          userPrompt: '',
          signal: controller.signal,
        })
      ).rejects.toThrow(/cancelled/i);
    });

    it('handles timeout when timeoutMs expires', async () => {
      globalThis.fetch = vi.fn().mockImplementation(async (_url, opts) => {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            resolve({ ok: true, json: async () => ({ choices: [{ message: { content: '{}' } }] }) });
          }, 100);
          opts?.signal?.addEventListener('abort', () => {
            clearTimeout(timer);
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        });
      });

      const provider = new OpenAiCompatibleProvider({
        id: 'openai-compatible',
        name: 'OpenAI Test',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
      });

      await expect(
        provider.translateStructured({
          systemPrompt: '',
          userPrompt: '',
          timeoutMs: 10,
        })
      ).rejects.toThrow(/timed out/i);
    });
  });
});
