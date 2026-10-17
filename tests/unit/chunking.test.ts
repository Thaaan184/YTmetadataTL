import { describe, it, expect } from 'vitest';
import { chunkSubtitleCues } from '../../core/jobs/chunking';
import { SubtitleCue } from '../../core/subtitles/types';

describe('chunkSubtitleCues', () => {
  const makeCues = (count: number, textLen: number = 30): SubtitleCue[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `${i + 1}`,
      startMs: i * 2000,
      endMs: (i + 1) * 2000,
      text: 'A'.repeat(textLen),
    }));
  };

  it('handles empty cues array', () => {
    expect(chunkSubtitleCues([])).toEqual([]);
  });

  it('chunks cues according to maxCuesPerChunk', () => {
    const cues = makeCues(25);
    const chunks = chunkSubtitleCues(cues, { maxCuesPerChunk: 10, maxCharsPerChunk: 5000 });

    expect(chunks).toHaveLength(3);
    expect(chunks[0].cues).toHaveLength(10);
    expect(chunks[1].cues).toHaveLength(10);
    expect(chunks[2].cues).toHaveLength(5);
  });

  it('chunks cues when character budget is reached', () => {
    // 4 cues, each 300 chars. Total ~1280 chars. If maxChars is 500, should create 3 chunks.
    const cues = makeCues(4, 300);
    const chunks = chunkSubtitleCues(cues, { maxCuesPerChunk: 50, maxCharsPerChunk: 500 });

    expect(chunks.length).toBeGreaterThan(1);
    const totalCues = chunks.reduce((acc, c) => acc + c.cues.length, 0);
    expect(totalCues).toBe(4);
  });

  it('maintains strict sequential cue ordering across chunks', () => {
    const cues = makeCues(15);
    const chunks = chunkSubtitleCues(cues, { maxCuesPerChunk: 5 });

    let expectedId = 1;
    for (const chunk of chunks) {
      for (const cue of chunk.cues) {
        expect(cue.id).toBe(`${expectedId}`);
        expectedId++;
      }
    }
  });
});
