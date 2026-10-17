import {
  YouTubeVideoItem,
  YouTubeCaptionItem,
  YouTubeApiError,
} from './types';
import { redactText } from '../providers/redact';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_UPLOAD_BASE = 'https://www.googleapis.com/upload/youtube/v3';

async function handleApiError(res: Response, token: string): Promise<never> {
  let errorMsg = `YouTube API error (${res.status})`;
  let errorCode = 'UNKNOWN';

  try {
    const errorJson = await res.json();
    if (errorJson.error) {
      errorMsg = errorJson.error.message || errorMsg;
      if (errorJson.error.errors?.[0]?.reason) {
        errorCode = errorJson.error.errors[0].reason;
      }
    }
  } catch {
    // Non-JSON response
  }

  // Redact token from any reflected messages
  errorMsg = redactText(errorMsg, [token]);

  if (res.status === 401) {
    throw new YouTubeApiError(
      'Authentication session expired. Please re-authenticate Google account.',
      401,
      'UNAUTHORIZED'
    );
  }

  if (res.status === 403 && errorCode === 'quotaExceeded') {
    throw new YouTubeApiError(
      'YouTube Data API quota exceeded. Please fall back to manual export workflow.',
      403,
      'QUOTA_EXCEEDED'
    );
  }

  throw new YouTubeApiError(errorMsg, res.status, errorCode);
}

export async function fetchVideo(
  videoId: string,
  token: string,
  fetchFn: typeof fetch = fetch
): Promise<YouTubeVideoItem> {
  const url = `${YOUTUBE_API_BASE}/videos?part=snippet,localizations&id=${encodeURIComponent(
    videoId
  )}`;

  const res = await fetchFn(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    await handleApiError(res, token);
  }

  const data = await res.json();
  if (!data.items || data.items.length === 0) {
    throw new YouTubeApiError(
      `Video with ID "${videoId}" not found or inaccessible.`,
      404,
      'NOT_FOUND'
    );
  }

  return data.items[0] as YouTubeVideoItem;
}

export async function updateVideoLocalization(
  videoId: string,
  locale: string,
  localizedTitle: string,
  localizedDescription: string,
  token: string,
  fetchFn: typeof fetch = fetch
): Promise<YouTubeVideoItem> {
  // Step 1: Read existing video to ensure safe read-modify-write
  const existingVideo = await fetchVideo(videoId, token, fetchFn);

  const existingLocalizations = existingVideo.localizations || {};
  const updatedLocalizations = {
    ...existingLocalizations,
    [locale]: {
      title: localizedTitle,
      description: localizedDescription,
    },
  };

  // Preserve all required snippet fields
  const payload = {
    id: videoId,
    snippet: {
      title: existingVideo.snippet.title,
      description: existingVideo.snippet.description,
      categoryId: existingVideo.snippet.categoryId,
      defaultLanguage: existingVideo.snippet.defaultLanguage,
      defaultAudioLanguage: existingVideo.snippet.defaultAudioLanguage,
      tags: existingVideo.snippet.tags,
    },
    localizations: updatedLocalizations,
  };

  const url = `${YOUTUBE_API_BASE}/videos?part=snippet,localizations`;
  const res = await fetchFn(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await handleApiError(res, token);
  }

  return (await res.json()) as YouTubeVideoItem;
}

export async function listCaptions(
  videoId: string,
  token: string,
  fetchFn: typeof fetch = fetch
): Promise<YouTubeCaptionItem[]> {
  const url = `${YOUTUBE_API_BASE}/captions?part=snippet&videoId=${encodeURIComponent(videoId)}`;

  const res = await fetchFn(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    await handleApiError(res, token);
  }

  const data = await res.json();
  return (data.items || []) as YouTubeCaptionItem[];
}

export function buildMultipartCaptionPayload(
  metadata: { videoId?: string; language?: string; name: string; isDraft?: boolean },
  fileContent: string,
  boundary: string
): string {
  const delimiter = `--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metaPart =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    '\r\n';

  const filePart =
    delimiter +
    'Content-Type: text/plain; charset=UTF-8\r\n\r\n' +
    fileContent +
    closeDelimiter;

  return metaPart + filePart;
}

export async function uploadCaption(
  videoId: string,
  locale: string,
  trackName: string,
  subtitleContent: string,
  token: string,
  fetchFn: typeof fetch = fetch
): Promise<YouTubeCaptionItem> {
  // Step 1: Check existing captions
  const captions = await listCaptions(videoId, token, fetchFn);
  const existing = captions.find(
    (c) => c.snippet.language.toLowerCase() === locale.toLowerCase()
  );

  const boundary = 'TubeGlotMultipartBoundary' + Date.now();

  if (existing) {
    // Update existing track
    const body = buildMultipartCaptionPayload(
      {
        name: trackName,
        isDraft: false,
      },
      subtitleContent,
      boundary
    );

    const url = `${YOUTUBE_UPLOAD_BASE}/captions?part=snippet&uploadType=multipart&id=${existing.id}`;
    const res = await fetchFn(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        Accept: 'application/json',
      },
      body,
    });

    if (!res.ok) {
      await handleApiError(res, token);
    }
    return (await res.json()) as YouTubeCaptionItem;
  } else {
    // Insert new track
    const body = buildMultipartCaptionPayload(
      {
        videoId,
        language: locale,
        name: trackName,
        isDraft: false,
      },
      subtitleContent,
      boundary
    );

    const url = `${YOUTUBE_UPLOAD_BASE}/captions?part=snippet&uploadType=multipart`;
    const res = await fetchFn(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        Accept: 'application/json',
      },
      body,
    });

    if (!res.ok) {
      await handleApiError(res, token);
    }
    return (await res.json()) as YouTubeCaptionItem;
  }
}
