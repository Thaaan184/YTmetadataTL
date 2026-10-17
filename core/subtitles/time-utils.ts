/**
 * Time utility functions for parsing and formatting SRT and WebVTT timestamps.
 * Milliseconds are stored as canonical non-negative integers.
 */

const SRT_TIMESTAMP_REGEX = /^(\d{2,}):(\d{2}):(\d{2}),(\d{3})$/;
const VTT_TIMESTAMP_LONG_REGEX = /^(\d{2,}):(\d{2}):(\d{2})\.(\d{3})$/;
const VTT_TIMESTAMP_SHORT_REGEX = /^(\d{2}):(\d{2})\.(\d{3})$/;

/**
 * Parses an SRT timestamp (HH:MM:SS,mmm) into milliseconds.
 * Returns null if the syntax does not match.
 */
export function parseSrtTimestamp(timestamp: string): number | null {
  const trimmed = timestamp.trim();
  const match = SRT_TIMESTAMP_REGEX.exec(trimmed);
  if (!match) return null;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  const milliseconds = parseInt(match[4], 10);

  if (minutes >= 60 || seconds >= 60) return null;

  return hours * 3600000 + minutes * 60000 + seconds * 1000 + milliseconds;
}

/**
 * Formats milliseconds into an SRT timestamp string (HH:MM:SS,mmm).
 */
export function formatSrtTimestamp(ms: number): string {
  const safeMs = Math.max(0, Math.floor(ms));
  const hours = Math.floor(safeMs / 3600000);
  const minutes = Math.floor((safeMs % 3600000) / 60000);
  const seconds = Math.floor((safeMs % 60000) / 1000);
  const millis = safeMs % 1000;

  const hh = hours.toString().padStart(2, '0');
  const mm = minutes.toString().padStart(2, '0');
  const ss = seconds.toString().padStart(2, '0');
  const mmm = millis.toString().padStart(3, '0');

  return `${hh}:${mm}:${ss},${mmm}`;
}

/**
 * Parses a WebVTT timestamp (HH:MM:SS.mmm or MM:SS.mmm) into milliseconds.
 * Returns null if the syntax does not match.
 */
export function parseVttTimestamp(timestamp: string): number | null {
  const trimmed = timestamp.trim();
  const longMatch = VTT_TIMESTAMP_LONG_REGEX.exec(trimmed);
  if (longMatch) {
    const hours = parseInt(longMatch[1], 10);
    const minutes = parseInt(longMatch[2], 10);
    const seconds = parseInt(longMatch[3], 10);
    const milliseconds = parseInt(longMatch[4], 10);
    if (minutes >= 60 || seconds >= 60) return null;
    return hours * 3600000 + minutes * 60000 + seconds * 1000 + milliseconds;
  }

  const shortMatch = VTT_TIMESTAMP_SHORT_REGEX.exec(trimmed);
  if (shortMatch) {
    const minutes = parseInt(shortMatch[1], 10);
    const seconds = parseInt(shortMatch[2], 10);
    const milliseconds = parseInt(shortMatch[3], 10);
    if (seconds >= 60) return null;
    return minutes * 60000 + seconds * 1000 + milliseconds;
  }

  return null;
}

/**
 * Formats milliseconds into a WebVTT timestamp string (HH:MM:SS.mmm).
 */
export function formatVttTimestamp(ms: number): string {
  const safeMs = Math.max(0, Math.floor(ms));
  const hours = Math.floor(safeMs / 3600000);
  const minutes = Math.floor((safeMs % 3600000) / 60000);
  const seconds = Math.floor((safeMs % 60000) / 1000);
  const millis = safeMs % 1000;

  const hh = hours.toString().padStart(2, '0');
  const mm = minutes.toString().padStart(2, '0');
  const ss = seconds.toString().padStart(2, '0');
  const mmm = millis.toString().padStart(3, '0');

  return `${hh}:${mm}:${ss}.${mmm}`;
}
