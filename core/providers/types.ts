import { redactSecrets, sanitizeEndpointUrl } from './redact';

export type ProviderId = 'openai-compatible' | 'ollama' | 'mock';

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  baseUrl: string;
  apiKey?: string;
  model: string;
  customHeaders?: Record<string, string>;
}

export interface ProviderCapabilities {
  supportsJsonSchema: boolean;
  supportsCancellation: boolean;
  maxContextTokens?: number;
}

export interface ProviderHealthResult {
  ok: boolean;
  message: string;
  latencyMs?: number;
}

export interface TranslationRequest {
  systemPrompt: string;
  userPrompt: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  temperature?: number;
}

export type ProviderErrorCode =
  | 'INVALID_CONFIG'
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'SCHEMA_MISMATCH'
  | 'ENDPOINT_UNREACHABLE'
  | 'INSECURE_ENDPOINT'
  | 'UNKNOWN';

export class ProviderError extends Error {
  public readonly code: ProviderErrorCode;
  public readonly statusCode?: number;
  public readonly endpoint?: string;

  constructor(options: {
    message: string;
    code: ProviderErrorCode;
    statusCode?: number;
    endpoint?: string;
  }) {
    // Redact any secrets before passing to super()
    const sanitizedMsg = redactSecrets(options.message);
    super(sanitizedMsg);
    this.name = 'ProviderError';
    this.code = options.code;
    this.statusCode = options.statusCode;
    if (options.endpoint) {
      this.endpoint = sanitizeEndpointUrl(options.endpoint);
    }
  }
}

export interface TranslationProvider {
  readonly id: ProviderId;
  readonly displayName: string;
  readonly capabilities: ProviderCapabilities;

  testConnection(): Promise<ProviderHealthResult>;
  translateStructured<T>(req: TranslationRequest): Promise<T>;
}
