/**
 * Inline formatting tag preservation engine.
 * Replaces supported inline markup (<b>, <i>, <u>, <v Speaker>, <font>, <c.class>)
 * with opaque placeholders [[TAG_n]] prior to translation, then validates
 * and restores them into translated text.
 */

const SUPPORTED_TAG_REGEX = /<\/?[a-zA-Z0-9_\-\.:]+(?:\s+[^>]+)?>/g;
const PLACEHOLDER_REGEX = /\[\[TAG_(\d+)\]\]/g;

export interface TokenizeResult {
  sanitizedText: string;
  tokens: Map<string, string>; // Maps "[[TAG_0]]" -> original tag string
}

export interface RestoreResult {
  restoredText: string;
  valid: boolean;
  errors: string[];
}

/**
 * Replaces all supported markup tags with opaque placeholders [[TAG_0]], [[TAG_1]]...
 */
export function tokenizeInlineTags(text: string): TokenizeResult {
  const tokens = new Map<string, string>();
  let counter = 0;

  const sanitizedText = text.replace(SUPPORTED_TAG_REGEX, (match) => {
    const placeholder = `[[TAG_${counter}]]`;
    tokens.set(placeholder, match);
    counter++;
    return placeholder;
  });

  return { sanitizedText, tokens };
}

/**
 * Restores original markup tags from placeholders in the translated text.
 * Flags missing, duplicate, or corrupted placeholders.
 */
export function restoreInlineTags(
  translatedText: string,
  tokens: Map<string, string>
): RestoreResult {
  const errors: string[] = [];
  const foundPlaceholders = new Set<string>();

  // Check which placeholders appear in translatedText
  let match: RegExpExecArray | null;
  const regex = new RegExp(PLACEHOLDER_REGEX.source, 'g');

  while ((match = regex.exec(translatedText)) !== null) {
    const placeholder = match[0];
    if (!tokens.has(placeholder)) {
      errors.push(`Unknown tag placeholder detected: "${placeholder}"`);
    } else if (foundPlaceholders.has(placeholder)) {
      errors.push(`Duplicate tag placeholder detected: "${placeholder}"`);
    } else {
      foundPlaceholders.add(placeholder);
    }
  }

  // Check if any expected placeholder is missing
  for (const expectedPlaceholder of tokens.keys()) {
    if (!foundPlaceholders.has(expectedPlaceholder)) {
      errors.push(`Missing tag placeholder in translation: "${expectedPlaceholder}" (${tokens.get(expectedPlaceholder)})`);
    }
  }

  // Replace placeholders with real tags
  const restoredText = translatedText.replace(PLACEHOLDER_REGEX, (ph) => {
    return tokens.get(ph) ?? ph;
  });

  return {
    restoredText,
    valid: errors.length === 0,
    errors,
  };
}
