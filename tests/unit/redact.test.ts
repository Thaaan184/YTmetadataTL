import { describe, it, expect } from 'vitest';
import { redactSecrets, sanitizeEndpointUrl } from '../../core/providers/redact';

describe('redactSecrets & sanitizeEndpointUrl', () => {
  it('redacts Bearer tokens from strings', () => {
    const raw = 'Authorization: Bearer sk-1234567890abcdef1234567890';
    expect(redactSecrets(raw)).toBe('Authorization: Bearer [REDACTED]');
  });

  it('redacts query parameter api_key and token values', () => {
    const raw = 'https://api.example.com/v1/chat?api_key=secretKey123&other=val';
    const redacted = redactSecrets(raw);
    expect(redacted).not.toContain('secretKey123');
    expect(redacted).toContain('[REDACTED]');
  });

  it('redacts GitHub PATs and sk- OpenAI keys', () => {
    const raw = 'Found github_pat_FAKETESTTOKEN1234567890 and sk-abcdef123456789012345678 in text';
    const redacted = redactSecrets(raw);
    expect(redacted).not.toContain('github_pat_');
    expect(redacted).not.toContain('sk-abcdef');
    expect(redacted).toContain('[REDACTED]');
  });

  it('sanitizes URL query secrets cleanly', () => {
    const url = 'https://api.example.com/v1?api_key=secret123&safe=1';
    const sanitized = sanitizeEndpointUrl(url);
    expect(sanitized).toBe('https://api.example.com/v1?api_key=%5BREDACTED%5D&safe=1');
  });

  it('handles empty input gracefully', () => {
    expect(redactSecrets('')).toBe('');
  });
});
