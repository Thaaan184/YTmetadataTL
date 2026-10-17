import { SubtitleCue, SubtitleDocument, TranslationCueItem, CueValidationResult } from './types';

/**
 * Validates translated cue items against authoritative source cues.
 * Enforces:
 * 1. Exact 1:1 ID match (no missing, no extra, no unknown, no duplicate IDs).
 * 2. Non-empty text for any cue where source text was non-empty.
 */
export function validateTranslationItems(
  sourceCues: SubtitleCue[],
  translatedItems: TranslationCueItem[]
): CueValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const sourceMap = new Map<string, SubtitleCue>();
  for (const sc of sourceCues) {
    if (sourceMap.has(sc.id)) {
      errors.push(`Source document contains duplicate cue ID: "${sc.id}"`);
    }
    sourceMap.set(sc.id, sc);
  }

  const translatedSeen = new Set<string>();

  for (const item of translatedItems) {
    // Check unknown ID
    if (!sourceMap.has(item.id)) {
      errors.push(`Translated item contains unknown cue ID: "${item.id}"`);
      continue;
    }

    // Check duplicate ID
    if (translatedSeen.has(item.id)) {
      errors.push(`Translated response contains duplicate cue ID: "${item.id}"`);
      continue;
    }
    translatedSeen.add(item.id);

    // Check empty text
    const source = sourceMap.get(item.id)!;
    if (source.text.trim() && !item.text.trim()) {
      errors.push(`Cue "${item.id}" returned empty translation for non-empty source.`);
    }
  }

  // Check missing IDs
  for (const sourceId of sourceMap.keys()) {
    if (!translatedSeen.has(sourceId)) {
      errors.push(`Missing translation for cue ID: "${sourceId}"`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Deterministically reassembles a localized SubtitleDocument from original source cues
 * and validated translated items. Source timestamps, cue order, IDs, and settings
 * remain strictly authoritative and are never modified by the translation.
 */
export function reassembleSubtitles(
  sourceDoc: SubtitleDocument,
  translatedItems: TranslationCueItem[],
  targetLanguage?: string
): SubtitleDocument {
  const validation = validateTranslationItems(sourceDoc.cues, translatedItems);
  if (!validation.valid) {
    throw new Error(`Cannot reassemble subtitles due to validation errors:\n- ${validation.errors.join('\n- ')}`);
  }

  const transMap = new Map<string, string>();
  for (const item of translatedItems) {
    transMap.set(item.id, item.text);
  }

  const reassembledCues: SubtitleCue[] = sourceDoc.cues.map((sc) => ({
    id: sc.id,
    startMs: sc.startMs,
    endMs: sc.endMs,
    text: transMap.get(sc.id) ?? sc.text,
    settings: sc.settings,
  }));

  return {
    format: sourceDoc.format,
    cues: reassembledCues,
    sourceLanguage: targetLanguage ?? sourceDoc.sourceLanguage,
    vttHeader: sourceDoc.vttHeader,
    metadata: sourceDoc.metadata,
  };
}
