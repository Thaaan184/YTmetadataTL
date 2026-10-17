import { SubtitleDocument, SubtitleCue } from './types';
import { formatVttTimestamp } from './time-utils';

/**
 * Serializes a SubtitleDocument or SubtitleCue array into WebVTT format.
 * Preserves header metadata, cue identifiers, and cue settings.
 */
export function serializeVtt(input: SubtitleDocument | SubtitleCue[]): string {
  const cues = Array.isArray(input) ? input : input.cues;
  const vttHeader = !Array.isArray(input) && input.vttHeader ? `\n${input.vttHeader}` : '';

  let out = `WEBVTT${vttHeader}\n\n`;

  if (cues.length === 0) {
    return out;
  }

  const blocks: string[] = [];

  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    const startTime = formatVttTimestamp(cue.startMs);
    const endTime = formatVttTimestamp(cue.endMs);
    const settings = cue.settings ? ` ${cue.settings}` : '';

    let block = '';
    // If the cue ID is not a synthetic auto-id (like cue-0001), write it
    if (cue.id && !cue.id.startsWith('cue-')) {
      block += `${cue.id}\n`;
    }
    block += `${startTime} --> ${endTime}${settings}\n${cue.text}`;
    blocks.push(block);
  }

  return out + blocks.join('\n\n') + '\n';
}
