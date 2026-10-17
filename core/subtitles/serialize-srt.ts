import { SubtitleDocument, SubtitleCue } from './types';
import { formatSrtTimestamp } from './time-utils';

/**
 * Serializes a SubtitleDocument or SubtitleCue array into standard SRT format.
 * Preserves cue order and original startMs/endMs timestamps.
 */
export function serializeSrt(input: SubtitleDocument | SubtitleCue[]): string {
  const cues = Array.isArray(input) ? input : input.cues;
  if (cues.length === 0) {
    return '';
  }

  const blocks: string[] = [];

  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    const indexNumber = (i + 1).toString();
    const startTime = formatSrtTimestamp(cue.startMs);
    const endTime = formatSrtTimestamp(cue.endMs);

    blocks.push(`${indexNumber}\n${startTime} --> ${endTime}\n${cue.text}`);
  }

  return blocks.join('\n\n') + '\n';
}
