import { SubtitleCue } from '../subtitles/types';

export interface ChunkOptions {
  maxCuesPerChunk?: number;    // Default: 30
  maxCharsPerChunk?: number;   // Default: 1800
}

export interface CueChunk {
  index: number;               // 0-indexed chunk position
  cues: SubtitleCue[];
  characterCount: number;
}

/**
 * Splits subtitle cues into sequential chunks respecting both cue count
 * and character budgets without splitting individual cues.
 */
export function chunkSubtitleCues(
  cues: SubtitleCue[],
  options: ChunkOptions = {}
): CueChunk[] {
  const maxCues = options.maxCuesPerChunk ?? 30;
  const maxChars = options.maxCharsPerChunk ?? 1800;

  if (cues.length === 0) {
    return [];
  }

  const chunks: CueChunk[] = [];
  let currentChunkCues: SubtitleCue[] = [];
  let currentChars = 0;

  for (const cue of cues) {
    const cueChars = cue.text.length + 20; // Text + estimated formatting overhead

    const wouldExceedCueLimit = currentChunkCues.length >= maxCues;
    const wouldExceedCharLimit =
      currentChunkCues.length > 0 && currentChars + cueChars > maxChars;

    if (wouldExceedCueLimit || wouldExceedCharLimit) {
      chunks.push({
        index: chunks.length,
        cues: currentChunkCues,
        characterCount: currentChars,
      });
      currentChunkCues = [];
      currentChars = 0;
    }

    currentChunkCues.push(cue);
    currentChars += cueChars;
  }

  if (currentChunkCues.length > 0) {
    chunks.push({
      index: chunks.length,
      cues: currentChunkCues,
      characterCount: currentChars,
    });
  }

  return chunks;
}
