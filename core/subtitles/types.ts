export type SubtitleFormat = 'srt' | 'vtt';

export interface SubtitleCue {
  id: string;              // Stable identifier (original string or synthetic cue-0001)
  startMs: number;         // Start time in integer milliseconds
  endMs: number;           // End time in integer milliseconds
  text: string;            // Subtitle text (may contain multiline or inline markup)
  settings?: string;       // WebVTT cue settings (e.g. "line:0% position:50% align:start")
}

export interface SubtitleDocument {
  format: SubtitleFormat;
  cues: SubtitleCue[];
  sourceLanguage?: string;
  vttHeader?: string;      // Optional metadata/comment block following WEBVTT
  metadata?: Record<string, unknown>;
}

export interface ParseError {
  line: number;
  message: string;
  rawText?: string;
}

export type ParseResult<T = SubtitleDocument> =
  | { success: true; document: T; warnings: string[] }
  | { success: false; errors: ParseError[]; warnings: string[] };

export interface TranslationCueItem {
  id: string;
  text: string;
}

export interface CueValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
