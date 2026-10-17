import { describe, it, expect, vi } from 'vitest';
import {
  buildOAuthUrl,
  extractTokenFromRedirectUrl,
  getStoredToken,
  setStoredToken,
  clearStoredToken,
} from '../../core/youtube/oauth';
import {
  fetchVideo,
  updateVideoLocalization,
  listCaptions,
  uploadCaption,
  buildMultipartCaptionPayload,
} from '../../core/youtube/client';
import { YouTubeApiError } from '../../core/youtube/types';

describe('YouTube OAuth & Token Helpers', () => {
  it('builds valid Google OAuth authorization URL', () => {
    const url = buildOAuthUrl('my-client-id-123.apps.googleusercontent.com', 'https://ext-id.chromiumapp.org/');
    expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url).toContain('client_id=my-client-id-123.apps.googleusercontent.com');
    expect(url).toContain('response_type=token');
    expect(url).toContain('redirect_uri=https%3A%2F%2Fext-id.chromiumapp.org%2F');
    expect(url).toContain('https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fyoutube.force-ssl');
  });

  it('extracts access token from redirect URL hash', () => {
    const redirectUrl = 'https://ext-id.chromiumapp.org/#access_token=ya29.sample-token-123&token_type=Bearer&expires_in=3599';
    const token = extractTokenFromRedirectUrl(redirectUrl);
    expect(token).toBe('ya29.sample-token-123');
  });

  it('throws on OAuth error parameter in redirect URL', () => {
    const redirectUrl = 'https://ext-id.chromiumapp.org/#error=access_denied&error_description=User+denied';
    expect(() => extractTokenFromRedirectUrl(redirectUrl)).toThrow('access_denied');
  });

  it('throws when access_token is missing in redirect URL', () => {
    const redirectUrl = 'https://ext-id.chromiumapp.org/#state=123';
    expect(() => extractTokenFromRedirectUrl(redirectUrl)).toThrow('No access token');
  });

  it('manages in-memory token state', () => {
    clearStoredToken();
    expect(getStoredToken()).toBeNull();
    setStoredToken('test-token-abc');
    expect(getStoredToken()).toBe('test-token-abc');
    clearStoredToken();
    expect(getStoredToken()).toBeNull();
  });

  it('authenticateGoogle resolves with token when launchWebAuthFlow succeeds', async () => {
    const { authenticateGoogle } = await import('../../core/youtube/oauth');

    // Mock chrome.identity
    const originalChrome = (globalThis as any).chrome;
    (globalThis as any).chrome = {
      identity: {
        getRedirectURL: () => 'https://mock-ext-id.chromiumapp.org/',
        launchWebAuthFlow: vi.fn().mockImplementation((opts, callback) => {
          callback('https://mock-ext-id.chromiumapp.org/#access_token=mock-oauth-token-999&token_type=Bearer');
        }),
      },
      runtime: {},
    };

    const token = await authenticateGoogle('test-client-id');
    expect(token).toBe('mock-oauth-token-999');
    expect(getStoredToken()).toBe('mock-oauth-token-999');

    // Restore
    (globalThis as any).chrome = originalChrome;
  });

  it('authenticateGoogle rejects when chrome error or user cancel', async () => {
    const { authenticateGoogle } = await import('../../core/youtube/oauth');

    const originalChrome = (globalThis as any).chrome;
    (globalThis as any).chrome = {
      identity: {
        getRedirectURL: () => 'https://mock-ext-id.chromiumapp.org/',
        launchWebAuthFlow: vi.fn().mockImplementation((opts, callback) => {
          (globalThis as any).chrome.runtime.lastError = { message: 'The user did not approve access.' };
          callback(undefined);
        }),
      },
      runtime: {},
    };

    await expect(authenticateGoogle('test-client-id')).rejects.toThrow('did not approve access');

    (globalThis as any).chrome = originalChrome;
  });

});

describe('YouTube API Client & Read-Modify-Write Safety', () => {
  const dummyToken = 'ya29.secret-test-token-xyz';

  it('fetchVideo returns video item and handles 404', async () => {
    const mockSuccessFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        items: [
          {
            id: 'vid123',
            snippet: {
              title: 'Original Title',
              description: 'Original Desc',
              categoryId: '22',
            },
            localizations: {},
          },
        ],
      }),
    });

    const video = await fetchVideo('vid123', dummyToken, mockSuccessFetch as any);
    expect(video.id).toBe('vid123');
    expect(video.snippet.title).toBe('Original Title');

    const mockNotFoundFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ items: [] }),
    });

    await expect(fetchVideo('nonexistent', dummyToken, mockNotFoundFetch as any)).rejects.toThrow(YouTubeApiError);
  });

  it('handles 401 unauthorized and 403 quotaExceeded safely', async () => {
    const mock401Fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        error: { message: 'Invalid credentials with token ya29.secret-test-token-xyz' },
      }),
    });

    try {
      await fetchVideo('vid123', dummyToken, mock401Fetch as any);
      expect.fail('Should have thrown 401');
    } catch (err) {
      expect(err).toBeInstanceOf(YouTubeApiError);
      const ytErr = err as YouTubeApiError;
      expect(ytErr.status).toBe(401);
      expect(ytErr.code).toBe('UNAUTHORIZED');
      // Secret must not be in message
      expect(ytErr.message).not.toContain('ya29.secret-test-token-xyz');
    }

    const mock403QuotaFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        error: {
          message: 'The request cannot be completed because you have exceeded your quota.',
          errors: [{ reason: 'quotaExceeded' }],
        },
      }),
    });

    await expect(fetchVideo('vid123', dummyToken, mock403QuotaFetch as any)).rejects.toThrow('quota exceeded');
  });

  it('updateVideoLocalization performs safe read-modify-write preserving existing fields', async () => {
    let putPayload: any = null;

    const mockFetch = vi.fn().mockImplementation(async (url: string, opts: any) => {
      if (opts.method === 'GET') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            items: [
              {
                id: 'vid123',
                snippet: {
                  title: 'English Title',
                  description: 'English Desc',
                  categoryId: '28',
                  tags: ['tech', 'gadgets'],
                  defaultLanguage: 'en',
                },
                localizations: {
                  fr: { title: 'Titre Francais', description: 'Desc Francaise' },
                },
              },
            ],
          }),
        };
      }
      if (opts.method === 'PUT') {
        putPayload = JSON.parse(opts.body);
        return {
          ok: true,
          status: 200,
          json: async () => putPayload,
        };
      }
      throw new Error(`Unexpected call ${opts.method}`);
    });

    const result = await updateVideoLocalization(
      'vid123',
      'es',
      'Titulo Espanol',
      'Descripcion Espanola',
      dummyToken,
      mockFetch as any
    );

    expect(result.id).toBe('vid123');
    expect(putPayload).toBeDefined();
    // Verify preserved fields
    expect(putPayload.snippet.categoryId).toBe('28');
    expect(putPayload.snippet.tags).toEqual(['tech', 'gadgets']);
    expect(putPayload.snippet.defaultLanguage).toBe('en');
    // Verify preserved old localization and new localization
    expect(putPayload.localizations.fr).toEqual({ title: 'Titre Francais', description: 'Desc Francaise' });
    expect(putPayload.localizations.es).toEqual({ title: 'Titulo Espanol', description: 'Descripcion Espanola' });
  });

  it('listCaptions and uploadCaption (insert new and update existing)', async () => {
    const boundary = 'test-boundary';
    const payload = buildMultipartCaptionPayload(
      { videoId: 'vid123', language: 'es', name: 'Spanish Subtitles' },
      '1\n00:00:01,000 --> 00:00:02,000\nHola',
      boundary
    );
    expect(payload).toContain('--test-boundary');
    expect(payload).toContain('Spanish Subtitles');
    expect(payload).toContain('Hola');

    // Case 1: Insert new caption
    const mockInsertFetch = vi.fn().mockImplementation(async (url: string, opts: any) => {
      if (opts.method === 'GET') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ items: [] }), // No existing captions
        };
      }
      if (opts.method === 'POST') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 'new-caption-id',
            snippet: { language: 'es', name: 'Spanish Subtitles' },
          }),
        };
      }
      throw new Error(`Unexpected call ${opts.method}`);
    });

    const newCap = await uploadCaption(
      'vid123',
      'es',
      'Spanish Subtitles',
      '1\n00:00:01,000 --> 00:00:02,000\nHola',
      dummyToken,
      mockInsertFetch as any
    );
    expect(newCap.id).toBe('new-caption-id');

    // Case 2: Update existing caption
    const mockUpdateFetch = vi.fn().mockImplementation(async (url: string, opts: any) => {
      if (opts.method === 'GET') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            items: [
              {
                id: 'existing-cap-456',
                snippet: { language: 'es', name: 'Old Spanish' },
              },
            ],
          }),
        };
      }
      if (opts.method === 'PUT') {
        expect(url).toContain('id=existing-cap-456');
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 'existing-cap-456',
            snippet: { language: 'es', name: 'Updated Spanish' },
          }),
        };
      }
      throw new Error(`Unexpected call ${opts.method}`);
    });

    const updatedCap = await uploadCaption(
      'vid123',
      'es',
      'Updated Spanish',
      '1\n00:00:01,000 --> 00:00:02,000\nHola nuevo',
      dummyToken,
      mockUpdateFetch as any
    );
    expect(updatedCap.id).toBe('existing-cap-456');
  });
});
