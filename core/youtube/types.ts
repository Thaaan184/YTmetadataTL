export interface YouTubeVideoLocalization {
  title: string;
  description: string;
}

export interface YouTubeVideoSnippet {
  title: string;
  description: string;
  categoryId: string;
  tags?: string[];
  defaultLanguage?: string;
  defaultAudioLanguage?: string;
}

export interface YouTubeVideoItem {
  id: string;
  snippet: YouTubeVideoSnippet;
  localizations?: Record<string, YouTubeVideoLocalization>;
}

export interface YouTubeCaptionSnippet {
  videoId: string;
  language: string;
  name: string;
  audioTrackType?: string;
  isCC?: boolean;
  isDraft?: boolean;
  isAutoSynced?: boolean;
  status?: string;
  lastUpdated?: string;
}

export interface YouTubeCaptionItem {
  id: string;
  snippet: YouTubeCaptionSnippet;
}

export class YouTubeApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string = 'UNKNOWN') {
    super(message);
    this.name = 'YouTubeApiError';
    this.status = status;
    this.code = code;
  }
}
