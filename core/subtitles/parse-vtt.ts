import { SubtitleCue, SubtitleDocument, ParseResult, ParseError } from './types';
import { parseVttTimestamp } from './time-utils';

/**
 * Parses a WebVTT subtitle string into a SubtitleDocument.
 * Validates the WEBVTT signature, parses timestamps and cue settings,
 * preserves header blocks, and flags malformed entries.
 */
export function parseVtt(rawContent: string): ParseResult<SubtitleDocument> {
  const errors: ParseError[] = [];
  const warnings: string[] = [];
  const cues: SubtitleCue[] = [];

  // Strip BOM if present
  let cleanContent = rawContent;
  if (cleanContent.charCodeAt(0) === 0xfeff) {
    cleanContent = cleanContent.slice(1);
  }

  // Normalize line endings
  cleanContent = cleanContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  if (!cleanContent.trim()) {
    return {
      success: false,
      errors: [{ line: 1, message: 'File is empty: missing WEBVTT signature' }],
      warnings: [],
    };
  }

  const lines = cleanContent.split('\n');
  const firstLine = lines[0].trim();

  if (!firstLine.startsWith('WEBVTT')) {
    return {
      success: false,
      errors: [
        {
          line: 1,
          message: 'Malformed WebVTT: First line must start with "WEBVTT"',
          rawText: firstLine,
        },
      ],
      warnings: [],
    };
  }

  let lineIndex = 1;
  const totalLines = lines.length;
  const headerLines: string[] = [];

  // Read header / comment section prior to first cue
  while (lineIndex < totalLines) {
    const current = lines[lineIndex].trim();
    if (!current) {
      lineIndex++;
      break;
    }
    headerLines.push(lines[lineIndex]);
    lineIndex++;
  }

  const vttHeader = headerLines.join('\n').trim() || undefined;
  let cueCounter = 1;

  while (lineIndex < totalLines) {
    const currentLine = lines[lineIndex].trim();

    // Skip empty lines
    if (!currentLine) {
      lineIndex++;
      continue;
    }

    // Skip NOTE comment blocks
    if (currentLine.startsWith('NOTE')) {
      while (lineIndex < totalLines && lines[lineIndex].trim() !== '') {
        lineIndex++;
      }
      continue;
    }

    // Skip STYLE / REGION blocks for MVP
    if (currentLine.startsWith('STYLE') || currentLine.startsWith('REGION')) {
      warnings.push(`Line ${lineIndex + 1}: Skipping WebVTT ${currentLine.split(' ')[0]} block.`);
      while (lineIndex < totalLines && lines[lineIndex].trim() !== '') {
        lineIndex++;
      }
      continue;
    }

    const blockStartLine = lineIndex + 1;
    let cueId: string | undefined = undefined;
    let timeLine = currentLine;

    // Check if currentLine is an identifier line or the timing line itself
    if (!timeLine.includes('-->')) {
      cueId = timeLine;
      lineIndex++;
      if (lineIndex >= totalLines) {
        errors.push({
          line: blockStartLine,
          message: `Unexpected end of file after WebVTT cue identifier "${cueId}"`,
          rawText: cueId,
        });
        break;
      }
      timeLine = lines[lineIndex].trim();
    }

    const timeLineNum = lineIndex + 1;
    const arrowIdx = timeLine.indexOf('-->');

    if (arrowIdx === -1) {
      errors.push({
        line: timeLineNum,
        message: 'Expected WebVTT timing separator "-->"',
        rawText: timeLine,
      });
      while (lineIndex < totalLines && lines[lineIndex].trim() !== '') {
        lineIndex++;
      }
      continue;
    }

    const startPart = timeLine.slice(0, arrowIdx).trim();
    const restPart = timeLine.slice(arrowIdx + 3).trim();

    // Check for cue settings after end timestamp
    const parts = restPart.split(/\s+/);
    const endPart = parts[0];
    const settings = parts.slice(1).join(' ').trim() || undefined;

    const startMs = parseVttTimestamp(startPart);
    const endMs = parseVttTimestamp(endPart);

    if (startMs === null) {
      errors.push({
        line: timeLineNum,
        message: `Invalid WebVTT start timestamp: "${startPart}"`,
        rawText: timeLine,
      });
    }

    if (endMs === null) {
      errors.push({
        line: timeLineNum,
        message: `Invalid WebVTT end timestamp: "${endPart}"`,
        rawText: timeLine,
      });
    }

    if (startMs !== null && endMs !== null && startMs >= endMs) {
      errors.push({
        line: timeLineNum,
        message: `Cue start time (${startPart}) must be strictly before end time (${endPart})`,
        rawText: timeLine,
      });
    }

    lineIndex++;

    // Read cue text lines
    const textLines: string[] = [];
    while (lineIndex < totalLines && lines[lineIndex].trim() !== '') {
      textLines.push(lines[lineIndex]);
      lineIndex++;
    }

    const cueText = textLines.join('\n');
    const stableId = cueId || `cue-${cueCounter.toString().padStart(4, '0')}`;
    cueCounter++;

    if (startMs !== null && endMs !== null && startMs < endMs) {
      cues.push({
        id: stableId,
        startMs,
        endMs,
        text: cueText,
        settings,
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
      format: 'vtt',
      cues,
      vttHeader,
    },
    warnings,
  };
}
