import { describe, it, expect } from 'vitest';
import { MockProvider } from '../../core/providers/mock-provider';
import { ProviderError } from '../../core/providers/types';

describe('MockProvider', () => {
  it('connects successfully and returns healthy status', async () => {
    const mock = new MockProvider();
    const health = await mock.testConnection();
    expect(health.ok).toBe(true);
    expect(health.message).toContain('simulated successfully');
  });

  it('translates JSON cue payloads predictably', async () => {
    const mock = new MockProvider();
    const payload = JSON.stringify({
      items: [
        { id: '1', text: 'Hello' },
        { id: '2', text: 'World' },
      ],
    });

    const res = await mock.translateStructured<{ translations: { id: string; text: string }[] }>({
      systemPrompt: 'Translate',
      userPrompt: payload,
    });

    expect(res.translations).toEqual([
      { id: '1', text: '[TL] Hello' },
      { id: '2', text: '[TL] World' },
    ]);
  });

  it('supports customHandler', async () => {
    const mock = new MockProvider({
      customHandler: async <T>() => ({ custom: true } as T),
    });

    const res = await mock.translateStructured<{ custom: boolean }>({
      systemPrompt: '',
      userPrompt: '',
    });
    expect(res.custom).toBe(true);
  });

  it('supports fixedResponse', async () => {
    const mock = new MockProvider();
    mock.setOptions({ fixedResponse: { fixed: 123 } });

    const res = await mock.translateStructured<{ fixed: number }>({
      systemPrompt: '',
      userPrompt: '',
    });
    expect(res.fixed).toBe(123);
  });

  it('supports latencyMs delay without abortion', async () => {
    const mock = new MockProvider({ latencyMs: 20 });
    const res = await mock.translateStructured<{ result: string }>({
      systemPrompt: '',
      userPrompt: 'Plain text',
    });
    expect(res.result).toBe('Mock translated content');
  });

  it('injects synthetic failures when configured', async () => {
    const mock = new MockProvider({
      shouldFailWith: {
        code: 'RATE_LIMITED',
        message: 'Rate limit simulated',
        statusCode: 429,
      },
    });

    await expect(
      mock.translateStructured({ systemPrompt: '', userPrompt: '' })
    ).rejects.toThrow(ProviderError);

    const health = await mock.testConnection();
    expect(health.ok).toBe(false);
  });

  it('respects AbortSignal cancellation immediately', async () => {
    const mock = new MockProvider({ latencyMs: 50 });
    const controller = new AbortController();

    const promise = mock.translateStructured({
      systemPrompt: '',
      userPrompt: '',
      signal: controller.signal,
    });

    controller.abort();

    await expect(promise).rejects.toThrow(/cancelled|aborted/i);
  });
});
