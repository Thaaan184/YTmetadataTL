import {
  TranslationProvider,
  ProviderId,
  ProviderCapabilities,
  ProviderHealthResult,
  TranslationRequest,
  ProviderError,
} from './types';

export interface MockProviderOptions {
  customHandler?: <T>(req: TranslationRequest) => Promise<T>;
  fixedResponse?: unknown;
  latencyMs?: number;
  shouldFailWith?: {
    code: 'RATE_LIMITED' | 'UNAUTHORIZED' | 'TIMEOUT' | 'SCHEMA_MISMATCH';
    message: string;
    statusCode?: number;
  };
}

export class MockProvider implements TranslationProvider {
  public readonly id: ProviderId = 'mock';
  public readonly displayName = 'Mock Test Provider';
  public readonly capabilities: ProviderCapabilities = {
    supportsJsonSchema: true,
    supportsCancellation: true,
    maxContextTokens: 128000,
  };

  private options: MockProviderOptions;

  constructor(options: MockProviderOptions = {}) {
    this.options = options;
  }

  public setOptions(options: MockProviderOptions): void {
    this.options = options;
  }

  public async testConnection(): Promise<ProviderHealthResult> {
    if (this.options.shouldFailWith) {
      return {
        ok: false,
        message: this.options.shouldFailWith.message,
      };
    }
    return {
      ok: true,
      message: 'Mock provider connection simulated successfully.',
      latencyMs: 5,
    };
  }

  public async translateStructured<T>(req: TranslationRequest): Promise<T> {
    if (req.signal?.aborted) {
      throw new ProviderError({
        message: 'Request was cancelled before execution.',
        code: 'CANCELLED',
      });
    }

    if (this.options.latencyMs && this.options.latencyMs > 0) {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, this.options.latencyMs);
        if (req.signal) {
          req.signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(
              new ProviderError({
                message: 'Request aborted during latency delay.',
                code: 'CANCELLED',
              })
            );
          });
        }
      });
    }

    if (this.options.shouldFailWith) {
      throw new ProviderError({
        message: this.options.shouldFailWith.message,
        code: this.options.shouldFailWith.code,
        statusCode: this.options.shouldFailWith.statusCode,
      });
    }

    if (this.options.customHandler) {
      return this.options.customHandler<T>(req);
    }

    if (this.options.fixedResponse !== undefined) {
      return this.options.fixedResponse as T;
    }

    // Default mock behavior for testing subtitle cue translation
    // If userPrompt looks like a JSON array of cues, return them with "[TEST_TL]" prefix
    try {
      const parsed = JSON.parse(req.userPrompt);
      if (Array.isArray(parsed?.items)) {
        const translatedItems = parsed.items.map((item: { id: string; text: string }) => ({
          id: item.id,
          text: `[TL] ${item.text}`,
        }));
        return { translations: translatedItems } as T;
      }
    } catch {
      // not JSON items
    }

    return { result: 'Mock translated content' } as T;
  }
}
