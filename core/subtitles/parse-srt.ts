import { SubtitleCue, SubtitleDocument, ParseResult, ParseError } from './types';
import { parseSrtTimestamp } from './time-utils';

/**
 * Parses an SRT subtitle string into a SubtitleDocument.
 * Preserves original cue order, sequence numbering, and multiline text.
 * Rejects malformed timing with line numbers.
 */
export function parseSrt(rawContent: string): ParseResult<SubtitleDocument> {
  const errors: ParseError[] = [];
  const warnings: string[] = [];
  const cues: SubtitleCue[] = [];

  // Strip BOM if present
  let cleanContent = rawContent;
  if (cleanContent.charCodeAt(0) === 0xfeff) {
    cleanContent = cleanContent.slice(1);
  }

  // Normalize CRLF / CR to LF
  cleanContent = cleanContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  if (!cleanContent.trim()) {
    return {
      success: true,
      document: { format: 'srt', cues: [] },
      warnings: ['Empty subtitle file provided.'],
    };
  }

  const lines = cleanContent.split('\n');
  let lineIndex = 0;
  const totalLines = lines.length;

  while (lineIndex < totalLines) {
    // Skip empty lines between blocks
    if (!lines[lineIndex].trim()) {
      lineIndex++;
      continue;
    }

    const blockStartLine = lineIndex + 1; // 1-indexed

    // 1. Cue Index / ID line
    const idLine = lines[lineIndex].trim();
    lineIndex++;

    if (lineIndex >= totalLines) {
      errors.push({
        line: blockStartLine,
        message: `Unexpected end of file after cue identifier "${idLine}"`,
        rawText: idLine,
      });
      break;
    }

    // 2. Timing line: 00:00:01,000 --> 00:00:04,000
    const timeLine = lines[lineIndex].trim();
    const timeLineNum = lineIndex + 1;
    lineIndex++;

    const arrowIdx = timeLine.indexOf('-->');
    if (arrowIdx === -1) {
      errors.push({
        line: timeLineNum,
        message: `Expected timing separator "-->" in cue block`,
        rawText: timeLine,
      });
      // Skip ahead to next blank line
      while (lineIndex < totalLines && lines[lineIndex].trim()) {
        lineIndex++;
      }
      continue;
    }

    const startStr = timeLine.slice(0, arrowIdx).trim();
    const endStr = timeLine.slice(arrowIdx + 3).trim();

    const startMs = parseSrtTimestamp(startStr);
    const endMs = parseSrtTimestamp(endStr);

    if (startMs === null) {
      errors.push({
        line: timeLineNum,
        message: `Invalid start timestamp syntax: "${startStr}"`,
        rawText: timeLine,
      });
    }

    if (endMs === null) {
      errors.push({
        line: timeLineNum,
        message: `Invalid end timestamp syntax: "${endStr}"`,
        rawText: timeLine,
      });
    }

    if (startMs !== null && endMs !== null && startMs >= endMs) {
      errors.push({
        line: timeLineNum,
        message: `Cue start time (${startStr}) must be before end time (${endStr})`,
        rawText: timeLine,
      });
    }

    // 3. Text lines
    const textLines: string[] = [];
    while (lineIndex < totalLines && lines[lineIndex].trim() !== '') {
      textLines.push(lines[lineIndex]);
      lineIndex++;
    }

    const cueText = textLines.join('\n');
    if (!cueText.trim()) {
      warnings.push(`Line ${blockStartLine}: Cue ${idLine} contains empty text.`);
    }

    if (startMs !== null && endMs !== null && startMs < endMs) {
      cues.push({
        id: idLine,
        startMs,
        endMs,
        text: cueText,
      });
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      errors,
      warnings,
    };
  }

  return {
    success: true,
    document: {
      format: 'srt',
      cues,
    },
    warnings,
  };
}
