let inMemoryAccessToken: string | null = null;

export const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.force-ssl',
];

export function getStoredToken(): string | null {
  return inMemoryAccessToken;
}

export function setStoredToken(token: string | null): void {
  inMemoryAccessToken = token;
}

export function clearStoredToken(): void {
  inMemoryAccessToken = null;
}

export function buildOAuthUrl(clientId: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'token',
    scope: YOUTUBE_SCOPES.join(' '),
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function extractTokenFromRedirectUrl(redirectUrl: string): string {
  const hash = new URL(redirectUrl).hash.substring(1);
  const params = new URLSearchParams(hash);
  const token = params.get('access_token');
  const error = params.get('error');

  if (error) {
    throw new Error(`Google OAuth error: ${error}`);
  }
  if (!token) {
    throw new Error('No access token returned in OAuth redirect URL');
  }
  return token;
}

export async function authenticateGoogle(clientId: string): Promise<string> {
  if (typeof chrome === 'undefined' || !chrome.identity?.launchWebAuthFlow) {
    throw new Error('Chrome Identity API is not available in this environment');
  }

  const redirectUri = chrome.identity.getRedirectURL();
  const authUrl = buildOAuthUrl(clientId, redirectUri);

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      {
        url: authUrl,
        interactive: true,
      },
      (responseUrl) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!responseUrl) {
          reject(new Error('User cancelled Google authentication or flow failed'));
          return;
        }
        try {
          const token = extractTokenFromRedirectUrl(responseUrl);
          setStoredToken(token);
          resolve(token);
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}
