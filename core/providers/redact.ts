/**
 * Credential and secret redaction utilities.
 * Strips authorization headers, Bearer tokens, query parameter keys,
 * and key-like patterns before logging or surfacing error messages.
 */

const KEY_PATTERNS = [
  /Bearer\s+[A-Za-z0-9_\-\.]+/gi,
  /(?:api[_-]?key|token|auth)=([^&\s]+)/gi,
  /github_pat_[A-Za-z0-9_]+/gi,
  /sk-[A-Za-z0-9_-]{20,}/gi,
];

/**
 * Redacts any detected API key, token, or auth header from a raw string.
 */
export function redactSecrets(input: string): string {
  if (!input) return '';
  let result = input;

  for (const pattern of KEY_PATTERNS) {
    result = result.replace(pattern, (match) => {
      if (match.toLowerCase().startsWith('bearer ')) {
        return 'Bearer [REDACTED]';
      }
      return '[REDACTED]';
    });
  }

  return result;
}

/**
 * Redacts specific known secrets as well as general secret patterns.
 */
export function redactText(input: string, specificSecrets: (string | undefined | null)[] = []): string {
  if (!input) return '';
  let result = redactSecrets(input);

  for (const secret of specificSecrets) {
    if (secret && secret.length >= 4) {
      result = result.split(secret).join('[REDACTED]');
    }
  }

  return result;
}

export function sanitizeEndpointUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    for (const key of Array.from(url.searchParams.keys())) {
      if (/key|token|auth|secret/i.test(key)) {
        url.searchParams.set(key, '[REDACTED]');
      }
    }
    return url.toString();
  } catch {
    return redactSecrets(rawUrl);
  }
}
