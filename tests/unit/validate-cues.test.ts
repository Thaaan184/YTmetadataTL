import { describe, it, expect } from 'vitest';
import {
  validateTranslationItems,
  reassembleSubtitles,
} from '../../core/subtitles/validate-cues';
import { SubtitleDocument, SubtitleCue, TranslationCueItem } from '../../core/subtitles/types';

describe('validate-cues & reassembleSubtitles', () => {
  const sourceCues: SubtitleCue[] = [
    { id: '1', startMs: 1000, endMs: 3000, text: 'Hello' },
    { id: '2', startMs: 3500, endMs: 6000, text: 'World' },
  ];

  const sourceDoc: SubtitleDocument = {
    format: 'srt',
    cues: sourceCues,
    sourceLanguage: 'en',
  };

  it('validates and reassembles successfully when items match 1:1', () => {
    const translatedItems: TranslationCueItem[] = [
      { id: '1', text: 'Halo' },
      { id: '2', text: 'Dunia' },
    ];

    const validation = validateTranslationItems(sourceCues, translatedItems);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);

    const reassembled = reassembleSubtitles(sourceDoc, translatedItems, 'id');
    expect(reassembled.cues).toHaveLength(2);
    expect(reassembled.sourceLanguage).toBe('id');
    // Verifies timestamps strictly match source
    expect(reassembled.cues[0]).toEqual({
      id: '1',
      startMs: 1000,
      endMs: 3000,
      text: 'Halo',
      settings: undefined,
    });
    expect(reassembled.cues[1]).toEqual({
      id: '2',
      startMs: 3500,
      endMs: 6000,
      text: 'Dunia',
      settings: undefined,
    });
  });

  it('detects duplicate cue IDs in source cues', () => {
    const dupSourceCues: SubtitleCue[] = [
      { id: '1', startMs: 1000, endMs: 2000, text: 'First' },
      { id: '1', startMs: 2500, endMs: 3500, text: 'Duplicate First' },
    ];
    const validation = validateTranslationItems(dupSourceCues, [{ id: '1', text: 'Trans' }]);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.includes('Source document contains duplicate cue ID'))).toBe(true);
  });

  it('rejects translated payload with missing cue IDs', () => {
    const incompleteItems: TranslationCueItem[] = [
      { id: '1', text: 'Halo' },
      // id: '2' is missing
    ];

    const validation = validateTranslationItems(sourceCues, incompleteItems);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.includes('Missing translation for cue ID: "2"'))).toBe(true);

    expect(() => reassembleSubtitles(sourceDoc, incompleteItems)).toThrow(/Cannot reassemble subtitles/);
  });

  it('rejects translated payload with unknown / hallucinated cue IDs', () => {
    const extraItems: TranslationCueItem[] = [
      { id: '1', text: 'Halo' },
      { id: '2', text: 'Dunia' },
      { id: '99', text: 'Hallucinated extra cue' },
    ];

    const validation = validateTranslationItems(sourceCues, extraItems);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.includes('unknown cue ID: "99"'))).toBe(true);
  });

  it('rejects duplicate translated cue IDs', () => {
    const duplicateItems: TranslationCueItem[] = [
      { id: '1', text: 'Halo' },
      { id: '1', text: 'Duplicate Halo' },
      { id: '2', text: 'Dunia' },
    ];

    const validation = validateTranslationItems(sourceCues, duplicateItems);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.includes('duplicate cue ID: "1"'))).toBe(true);
  });

  it('rejects blank translated text for non-empty source cues', () => {
    const blankItems: TranslationCueItem[] = [
      { id: '1', text: 'Halo' },
      { id: '2', text: '   ' }, // empty text
    ];

    const validation = validateTranslationItems(sourceCues, blankItems);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.includes('returned empty translation'))).toBe(true);
  });
});
