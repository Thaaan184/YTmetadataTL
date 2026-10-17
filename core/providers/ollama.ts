import {
  TranslationProvider,
  ProviderId,
  ProviderCapabilities,
  ProviderHealthResult,
  TranslationRequest,
  ProviderError,
} from './types';
import { validateEndpointUrl, extractJsonFromResponse } from './openai-compatible';
import { redactSecrets } from './redact';

export interface OllamaConfig {
  baseUrl: string; // e.g. "http://localhost:11434"
  model: string;   // e.g. "llama3" or "qwen2.5"
}

export class OllamaProvider implements TranslationProvider {
  public readonly id: ProviderId = 'ollama';
  public readonly displayName = 'Ollama Local Model';
  public readonly capabilities: ProviderCapabilities = {
    supportsJsonSchema: true,
    supportsCancellation: true,
    maxContextTokens: 32768,
  };

  private config: OllamaConfig;

  constructor(config: OllamaConfig) {
    this.config = config;
  }

  public async testConnection(): Promise<ProviderHealthResult> {
    const validatedUrl = validateEndpointUrl(this.config.baseUrl);
    const start = Date.now();

    try {
      const endpoint = new URL('api/tags', validatedUrl.toString().endsWith('/') ? validatedUrl : `${validatedUrl}/`);
      const res = await fetch(endpoint.toString(), {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      const latencyMs = Date.now() - start;

      if (!res.ok) {
        return {
          ok: false,
          message: `Ollama returned HTTP ${res.status}: ${res.statusText}`,
          latencyMs,
        };
      }

      const data = await res.json();
      const models = data?.models?.map((m: { name: string }) => m.name) ?? [];
      const hasModel = models.some((m: string) => m.startsWith(this.config.model));

      if (!hasModel && models.length > 0) {
        return {
          ok: true,
          message: `Ollama reachable, but configured model "${this.config.model}" not found in available models: [${models.join(', ')}]`,
          latencyMs,
        };
      }

      return {
        ok: true,
        message: `Ollama running and model "${this.config.model}" verified.`,
        latencyMs,
      };
    } catch (err) {
      return {
        ok: false,
        message: `Could not connect to Ollama: ${err instanceof Error ? redactSecrets(err.message) : 'Server offline'}`,
      };
    }
  }

  public async translateStructured<T>(req: TranslationRequest): Promise<T> {
    const validatedBase = validateEndpointUrl(this.config.baseUrl);
    const endpoint = new URL('api/chat', validatedBase.toString().endsWith('/') ? validatedBase : `${validatedBase}/`);

    if (req.signal?.aborted) {
      throw new ProviderError({
        message: 'Request was cancelled before start.',
        code: 'CANCELLED',
        endpoint: endpoint.toString(),
      });
    }

    const payload = {
      model: this.config.model,
      messages: [
        { role: 'system', content: req.systemPrompt },
        { role: 'user', content: req.userPrompt },
      ],
      stream: false,
      format: 'json',
      options: {
        temperature: req.temperature ?? 0.1,
      },
    };

    try {
      const res = await fetch(endpoint.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: req.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new ProviderError({
          message: `Ollama returned HTTP ${res.status}: ${redactSecrets(text)}`,
          code: 'ENDPOINT_UNREACHABLE',
          statusCode: res.status,
          endpoint: endpoint.toString(),
        });
      }

      const data = await res.json();
      const rawContent = data?.message?.content;
      if (!rawContent) {
        throw new ProviderError({
          message: 'Ollama returned empty response message content.',
          code: 'SCHEMA_MISMATCH',
          endpoint: endpoint.toString(),
        });
      }

      return extractJsonFromResponse(rawContent) as T;
    } catch (err) {
      if (err instanceof ProviderError) throw err;

      if (req.signal?.aborted) {
        throw new ProviderError({
          message: 'Ollama request cancelled by user.',
          code: 'CANCELLED',
          endpoint: endpoint.toString(),
        });
      }

      throw new ProviderError({
        message: `Failed to communicate with Ollama: ${err instanceof Error ? redactSecrets(err.message) : String(err)}`,
        code: 'ENDPOINT_UNREACHABLE',
        endpoint: endpoint.toString(),
      });
    }
  }
}
