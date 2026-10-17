import { describe, it, expect, vi } from 'vitest';
import {
  runSubtitleTranslation,
  runMetadataTranslation,
  SubtitleJobProgress,
} from '../../core/jobs/translation-runner';
import { SubtitleDocument } from '../../core/subtitles/types';
import { MockProvider } from '../../core/providers/mock-provider';

describe('translation-runner', () => {
  const sourceDoc: SubtitleDocument = {
    format: 'srt',
    sourceLanguage: 'en',
    cues: [
      { id: '1', startMs: 1000, endMs: 3000, text: 'Hello <b>world</b>!' },
      { id: '2', startMs: 3500, endMs: 6000, text: 'Enjoy this <i>tutorial</i>.' },
    ],
  };

  it('translates subtitle document preserving timestamps and tags with MockProvider', async () => {
    const mock = new MockProvider();
    const progressHistory: SubtitleJobProgress[] = [];

    const localized = await runSubtitleTranslation(sourceDoc, mock, {
      targetLanguage: 'es',
      onProgress: (p) => progressHistory.push({ ...p }),
    });

    expect(localized.sourceLanguage).toBe('es');
    expect(localized.cues).toHaveLength(2);

    // Verifies cue 1
    expect(localized.cues[0].id).toBe('1');
    expect(localized.cues[0].startMs).toBe(1000);
    expect(localized.cues[0].endMs).toBe(3000);
    expect(localized.cues[0].text).toContain('<b>');
    expect(localized.cues[0].text).toContain('</b>');

    // Verifies cue 2
    expect(localized.cues[1].id).toBe('2');
    expect(localized.cues[1].startMs).toBe(3500);
    expect(localized.cues[1].endMs).toBe(6000);
    expect(localized.cues[1].text).toContain('<i>');
    expect(localized.cues[1].text).toContain('</i>');

    // Verifies progress completed
    const lastProgress = progressHistory[progressHistory.length - 1];
    expect(lastProgress.status).toBe('completed');
    expect(lastProgress.percent).toBe(100);
  });

  it('retries failed chunk without failing entire job if retry succeeds', async () => {
    let callCount = 0;
    const mock = new MockProvider({
      customHandler: async <T>() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Temporary provider rate limit');
        }
        return {
          translations: [
            { id: '1', text: 'Hola [[TAG_0]]mundo[[TAG_1]]!' },
            { id: '2', text: 'Disfruta este [[TAG_0]]tutorial[[TAG_1]].' },
          ],
        } as T;
      },
    });

    const localized = await runSubtitleTranslation(sourceDoc, mock, {
      targetLanguage: 'es',
      maxChunkRetries: 2,
    });

    expect(callCount).toBe(2);
    expect(localized.cues).toHaveLength(2);
  });

  it('fails cleanly when provider returns corrupted IDs (missing cue)', async () => {
    const mock = new MockProvider({
      fixedResponse: {
        translations: [
          { id: '1', text: 'Only cue 1 returned' },
          // cue 2 is missing!
        ],
      },
    });

    await expect(
      runSubtitleTranslation(sourceDoc, mock, {
        targetLanguage: 'es',
        maxChunkRetries: 0,
      })
    ).rejects.toThrow(/validation failed/i);
  });

  it('fails cleanly when provider corrupts tag placeholders', async () => {
    const mock = new MockProvider({
      fixedResponse: {
        translations: [
          { id: '1', text: 'Corrupted text without tags' }, // dropped [[TAG_0]] and [[TAG_1]]
          { id: '2', text: 'Disfruta [[TAG_2]]tutorial[[TAG_3]]' },
        ],
      },
    });

    await expect(
      runSubtitleTranslation(sourceDoc, mock, {
        targetLanguage: 'es',
        maxChunkRetries: 0,
      })
    ).rejects.toThrow(/tag validation failed/i);
  });

  it('handles cancellation and throws error without modifying document', async () => {
    const controller = new AbortController();
    const mock = new MockProvider();

    controller.abort();

    await expect(
      runSubtitleTranslation(sourceDoc, mock, {
        targetLanguage: 'es',
        signal: controller.signal,
      })
    ).rejects.toThrow(/cancelled/i);
  });

  describe('runMetadataTranslation', () => {
    it('translates video metadata into target locale with validation', async () => {
      const mock = new MockProvider({
        fixedResponse: {
          title: 'Título localizado en español',
          description: 'Descripción completa en español con enlaces.',
          tagSuggestions: ['video', 'espanol'],
        },
      });

      const res = await runMetadataTranslation(
        'English Title',
        'English Description',
        'es',
        mock
      );

      expect(res.locale).toBe('es');
      expect(res.title).toBe('Título localizado en español');
      expect(res.tagSuggestions).toContain('espanol');
    });

    it('rejects provider output when title exceeds limits', async () => {
      const mock = new MockProvider({
        fixedResponse: {
          title: 'T'.repeat(120), // 120 chars > 100 limit
          description: 'Desc',
        },
      });

      await expect(
        runMetadataTranslation('Title', 'Desc', 'es', mock)
      ).rejects.toThrow(/exceeds YouTube maximum limit/);
    });
  });
});
