import {
  TranslationProvider,
  ProviderId,
  ProviderCapabilities,
  ProviderConfig,
  ProviderHealthResult,
  TranslationRequest,
  ProviderError,
} from './types';
import { redactSecrets, sanitizeEndpointUrl } from './redact';

/**
 * Checks if a given host is a local loopback address.
 */
function isLoopback(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname === '::1'
  );
}

/**
 * Validates endpoint URL security: remote endpoints MUST use HTTPS.
 * HTTP is strictly restricted to local loopback hosts.
 */
export function validateEndpointUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ProviderError({
      message: `Invalid endpoint URL: "${redactSecrets(rawUrl)}"`,
      code: 'INVALID_CONFIG',
    });
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new ProviderError({
      message: `Unsupported protocol "${url.protocol}". Only HTTPS (or HTTP on loopback) is permitted.`,
      code: 'INSECURE_ENDPOINT',
      endpoint: url.toString(),
    });
  }

  if (url.protocol === 'http:' && !isLoopback(url.hostname)) {
    throw new ProviderError({
      message: `Insecure HTTP endpoint forbidden for non-loopback host "${url.hostname}". Remote endpoints must use HTTPS.`,
      code: 'INSECURE_ENDPOINT',
      endpoint: url.toString(),
    });
  }

  return url;
}

/**
 * Extracts and cleans JSON content from raw LLM output,
 * stripping markdown codeblock formatting if present.
 */
export function extractJsonFromResponse(raw: string): unknown {
  const trimmed = raw.trim();

  // Strip markdown code fences like ```json ... ``` or ``` ... ```
  const codeBlockMatch = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  const target = codeBlockMatch ? codeBlockMatch[1].trim() : trimmed;

  try {
    return JSON.parse(target);
  } catch (err) {
    throw new ProviderError({
      message: `Failed to parse structured JSON from provider response: ${err instanceof Error ? err.message : String(err)}`,
      code: 'SCHEMA_MISMATCH',
    });
  }
}

export class OpenAiCompatibleProvider implements TranslationProvider {
  public readonly id: ProviderId = 'openai-compatible';
  public readonly displayName: string;
  public readonly capabilities: ProviderCapabilities = {
    supportsJsonSchema: true,
    supportsCancellation: true,
    maxContextTokens: 128000,
  };

  private config: ProviderConfig;
  private maxRetries: number;
  private baseBackoffMs: number;

  constructor(
    config: ProviderConfig,
    options: { maxRetries?: number; baseBackoffMs?: number } = {}
  ) {
    this.config = config;
    this.displayName = config.name || 'OpenAI Compatible';
    this.maxRetries = options.maxRetries ?? 3;
    this.baseBackoffMs = options.baseBackoffMs ?? 500;
  }

  public async testConnection(): Promise<ProviderHealthResult> {
    const validatedUrl = validateEndpointUrl(this.config.baseUrl);
    const start = Date.now();

    try {
      // Test using a lightweight model list request or a 1-token probe
      const endpoint = new URL('models', validatedUrl.toString().endsWith('/') ? validatedUrl : `${validatedUrl}/`);
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        ...(this.config.customHeaders ?? {}),
      };

      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const res = await fetch(endpoint.toString(), {
        method: 'GET',
        headers,
      });

      const latencyMs = Date.now() - start;

      if (!res.ok) {
        return {
          ok: false,
          message: `Connection test failed with HTTP ${res.status}: ${res.statusText}`,
          latencyMs,
        };
      }

      return {
        ok: true,
        message: 'Endpoint reachable and credentials accepted.',
        latencyMs,
      };
    } catch (err) {
      return {
        ok: false,
        message: `Connection failed: ${err instanceof Error ? redactSecrets(err.message) : 'Unknown network error'}`,
      };
    }
  }

  public async translateStructured<T>(req: TranslationRequest): Promise<T> {
    const validatedBase = validateEndpointUrl(this.config.baseUrl);
    const endpoint = new URL(
      'chat/completions',
      validatedBase.toString().endsWith('/') ? validatedBase : `${validatedBase}/`
    );

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(this.config.customHeaders ?? {}),
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const bodyPayload = {
      model: this.config.model,
      messages: [
        { role: 'system', content: req.systemPrompt },
        { role: 'user', content: req.userPrompt },
      ],
      temperature: req.temperature ?? 0.1,
      response_format: { type: 'json_object' },
    };

    let attempt = 0;

    while (attempt <= this.maxRetries) {
      attempt++;

      if (req.signal?.aborted) {
        throw new ProviderError({
          message: 'Translation request was cancelled by user.',
          code: 'CANCELLED',
          endpoint: endpoint.toString(),
        });
      }

      // Controller for timeout
      const controller = new AbortController();
      let timeoutId: NodeJS.Timeout | undefined;

      if (req.timeoutMs && req.timeoutMs > 0) {
        timeoutId = setTimeout(() => {
          controller.abort(new Error('Request timeout exceeded'));
        }, req.timeoutMs);
      }

      const combinedSignal = req.signal
        ? anySignal([req.signal, controller.signal])
        : controller.signal;

      try {
        const response = await fetch(endpoint.toString(), {
          method: 'POST',
          headers,
          body: JSON.stringify(bodyPayload),
          signal: combinedSignal,
        });

        if (timeoutId) clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const content = data?.choices?.[0]?.message?.content;
          if (!content) {
            throw new ProviderError({
              message: 'Provider returned empty response content.',
              code: 'SCHEMA_MISMATCH',
              endpoint: endpoint.toString(),
            });
          }

          return extractJsonFromResponse(content) as T;
        }

        // Handle error status codes
        if (response.status === 401 || response.status === 403) {
          throw new ProviderError({
            message: `Authentication failed (HTTP ${response.status}). Verify your API key.`,
            code: 'UNAUTHORIZED',
            statusCode: response.status,
            endpoint: endpoint.toString(),
          });
        }

        if (response.status === 429 || response.status >= 500) {
          if (attempt <= this.maxRetries) {
            const jitter = Math.random() * 200;
            const delay = this.baseBackoffMs * Math.pow(2, attempt - 1) + jitter;
            await sleep(delay, req.signal);
            continue;
          }

          throw new ProviderError({
            message: `Rate limit or server error (HTTP ${response.status}) after ${attempt} attempts.`,
            code: response.status === 429 ? 'RATE_LIMITED' : 'ENDPOINT_UNREACHABLE',
            statusCode: response.status,
            endpoint: endpoint.toString(),
          });
        }

        const errText = await response.text().catch(() => '');
        throw new ProviderError({
          message: `Provider rejected request with HTTP ${response.status}: ${redactSecrets(errText)}`,
          code: 'UNKNOWN',
          statusCode: response.status,
          endpoint: endpoint.toString(),
        });
      } catch (err) {
        if (timeoutId) clearTimeout(timeoutId);

        if (err instanceof ProviderError) {
          throw err;
        }

        if (req.signal?.aborted || (err as Error)?.name === 'AbortError') {
          if (req.signal?.aborted) {
            throw new ProviderError({
              message: 'Request was cancelled by user.',
              code: 'CANCELLED',
              endpoint: endpoint.toString(),
            });
          }
          throw new ProviderError({
            message: `Request timed out after ${req.timeoutMs}ms.`,
            code: 'TIMEOUT',
            endpoint: endpoint.toString(),
          });
        }

        // Retry on transient fetch network failures
        if (attempt <= this.maxRetries) {
          const delay = this.baseBackoffMs * Math.pow(2, attempt - 1);
          await sleep(delay, req.signal);
          continue;
        }

        throw new ProviderError({
          message: `Network error connecting to provider: ${err instanceof Error ? redactSecrets(err.message) : String(err)}`,
          code: 'ENDPOINT_UNREACHABLE',
          endpoint: endpoint.toString(),
        });
      }
    }

    throw new ProviderError({
      message: 'Unexpected exhaustion of retry loop.',
      code: 'UNKNOWN',
      endpoint: endpoint.toString(),
    });
  }
}

/**
 * Polyfill-safe signal combiner.
 */
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const sig of signals) {
    if (sig.aborted) {
      controller.abort(sig.reason);
      return controller.signal;
    }
    sig.addEventListener('abort', () => controller.abort(sig.reason), { once: true });
  }
  return controller.signal;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new ProviderError({ message: 'Sleep cancelled', code: 'CANCELLED' }));
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new ProviderError({ message: 'Sleep cancelled', code: 'CANCELLED' }));
    }, { once: true });
  });
}
