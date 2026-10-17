import {
  SubtitleDocument,
  TranslationCueItem,
} from '../subtitles/types';
import { tokenizeInlineTags, restoreInlineTags } from '../subtitles/formatting-tokens';
import { reassembleSubtitles, validateTranslationItems } from '../subtitles/validate-cues';
import { chunkSubtitleCues, ChunkOptions } from './chunking';
import { TranslationProvider } from '../providers/types';
import {
  LocalizedMetadata,
  validateLocalizedMetadata,
  buildMetadataPrompt,
} from '../localization/metadata-schema';

export interface SubtitleJobProgress {
  currentChunk: number;
  totalChunks: number;
  percent: number;
  status: 'idle' | 'translating' | 'validating' | 'completed' | 'cancelled' | 'failed';
  message: string;
}

export interface SubtitleJobOptions {
  targetLanguage: string;
  tonePrompt?: string;
  chunkOptions?: ChunkOptions;
  signal?: AbortSignal;
  onProgress?: (progress: SubtitleJobProgress) => void;
  maxChunkRetries?: number;
}

/**
 * Runs end-to-end subtitle translation with cue chunking, tokenized tag preservation,
 * per-chunk retries, strict validation, and deterministic reassembly.
 */
export async function runSubtitleTranslation(
  sourceDoc: SubtitleDocument,
  provider: TranslationProvider,
  options: SubtitleJobOptions
): Promise<SubtitleDocument> {
  const { targetLanguage, signal, onProgress, maxChunkRetries = 2 } = options;

  if (sourceDoc.cues.length === 0) {
    return {
      ...sourceDoc,
      sourceLanguage: targetLanguage,
    };
  }

  const chunks = chunkSubtitleCues(sourceDoc.cues, options.chunkOptions);
  const totalChunks = chunks.length;

  onProgress?.({
    currentChunk: 0,
    totalChunks,
    percent: 0,
    status: 'translating',
    message: `Starting translation into ${targetLanguage} (${totalChunks} chunks)...`,
  });

  const allTranslatedItems: TranslationCueItem[] = [];

  for (let i = 0; i < totalChunks; i++) {
    if (signal?.aborted) {
      onProgress?.({
        currentChunk: i,
        totalChunks,
        percent: Math.round((i / totalChunks) * 100),
        status: 'cancelled',
        message: 'Translation was cancelled by user.',
      });
      throw new Error('Subtitle translation cancelled by user.');
    }

    const chunk = chunks[i];
    let chunkAttempt = 0;
    let chunkSuccess = false;
    let lastError: Error | undefined;

    // Tokenize tags per cue in this chunk
    const cueTokenMaps = new Map<string, Map<string, string>>();
    const sanitizedItems = chunk.cues.map((c) => {
      const { sanitizedText, tokens } = tokenizeInlineTags(c.text);
      cueTokenMaps.set(c.id, tokens);
      return { id: c.id, text: sanitizedText };
    });

    const systemPrompt = `You are a subtitle localization engine.
Translate the supplied subtitle cues into language "${targetLanguage}".
Strict rules:
1. Preserve every cue "id" exactly.
2. Do NOT output timestamps.
3. Preserve all [[TAG_n]] placeholders exactly in appropriate positions.
4. Return ONLY valid JSON matching this schema:
{
  "translations": [
    { "id": "1", "text": "Translated text" }
  ]
}`;

    const userPrompt = JSON.stringify({
      targetLanguage,
      tone: options.tonePrompt || 'Natural, colloquial, faithful to original meaning.',
      items: sanitizedItems,
    });

    while (chunkAttempt <= maxChunkRetries && !chunkSuccess) {
      chunkAttempt++;

      onProgress?.({
        currentChunk: i + 1,
        totalChunks,
        percent: Math.round(((i + (chunkAttempt - 1) * 0.3) / totalChunks) * 100),
        status: 'translating',
        message: `Translating chunk ${i + 1} of ${totalChunks} (Attempt ${chunkAttempt})...`,
      });

      try {
        const response = await provider.translateStructured<{
          translations?: TranslationCueItem[];
        }>({
          systemPrompt,
          userPrompt,
          signal,
          temperature: 0.1,
        });

        const rawTranslations = response?.translations;
        if (!Array.isArray(rawTranslations)) {
          throw new Error('Provider response did not contain a "translations" array.');
        }

        // Validate IDs match chunk cues 1:1
        const validation = validateTranslationItems(chunk.cues, rawTranslations);
        if (!validation.valid) {
          throw new Error(`Chunk ${i + 1} validation failed:\n${validation.errors.join('; ')}`);
        }

        // Restore formatting tokens and validate placeholders
        const restoredChunkItems: TranslationCueItem[] = [];
        for (const item of rawTranslations) {
          const tokens = cueTokenMaps.get(item.id) ?? new Map();
          const { restoredText, valid, errors } = restoreInlineTags(item.text, tokens);
          if (!valid) {
            throw new Error(`Cue "${item.id}" tag validation failed: ${errors.join(', ')}`);
          }
          restoredChunkItems.push({ id: item.id, text: restoredText });
        }

        allTranslatedItems.push(...restoredChunkItems);
        chunkSuccess = true;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (signal?.aborted) throw lastError;
      }
    }

    if (!chunkSuccess) {
      onProgress?.({
        currentChunk: i + 1,
        totalChunks,
        percent: Math.round((i / totalChunks) * 100),
        status: 'failed',
        message: `Chunk ${i + 1} failed after ${maxChunkRetries + 1} attempts: ${lastError?.message}`,
      });
      throw new Error(`Failed to translate chunk ${i + 1}: ${lastError?.message}`);
    }
  }

  onProgress?.({
    currentChunk: totalChunks,
    totalChunks,
    percent: 95,
    status: 'validating',
    message: 'Reassembling finalized subtitle document with source timestamps...',
  });

  // Reassemble finalized document with original source timestamps
  const finalized = reassembleSubtitles(sourceDoc, allTranslatedItems, targetLanguage);

  onProgress?.({
    currentChunk: totalChunks,
    totalChunks,
    percent: 100,
    status: 'completed',
    message: `Translation complete: ${finalized.cues.length} cues localized to ${targetLanguage}.`,
  });

  return finalized;
}

/**
 * Runs metadata translation for a given video title and description.
 */
export async function runMetadataTranslation(
  sourceTitle: string,
  sourceDescription: string,
  targetLocale: string,
  provider: TranslationProvider,
  options: { styleNotes?: string; signal?: AbortSignal } = {}
): Promise<LocalizedMetadata> {
  const { systemPrompt, userPrompt } = buildMetadataPrompt(
    sourceTitle,
    sourceDescription,
    targetLocale,
    options.styleNotes
  );

  const raw = await provider.translateStructured<{
    title?: string;
    description?: string;
    tagSuggestions?: string[];
  }>({
    systemPrompt,
    userPrompt,
    signal: options.signal,
    temperature: 0.2,
  });

  const candidate: LocalizedMetadata = {
    locale: targetLocale,
    title: raw.title ?? '',
    description: raw.description ?? '',
    tagSuggestions: Array.isArray(raw.tagSuggestions) ? raw.tagSuggestions : [],
  };

  const validation = validateLocalizedMetadata(candidate);
  if (!validation.valid) {
    throw new Error(`Metadata validation failed: ${validation.errors.join('; ')}`);
  }

  return candidate;
}
