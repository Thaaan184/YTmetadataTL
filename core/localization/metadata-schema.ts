export interface LocalizedMetadata {
  locale: string;
  title: string;
  description: string;
  tagSuggestions?: string[];
}

export interface MetadataValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export const YOUTUBE_LIMITS = {
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 5000,
  MAX_TAG_COUNT: 50,
};

/**
 * Validates a LocalizedMetadata payload against YouTube field constraints.
 */
export function validateLocalizedMetadata(input: unknown): MetadataValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!input || typeof input !== 'object') {
    return {
      valid: false,
      errors: ['Metadata payload must be an object'],
      warnings: [],
    };
  }

  const obj = input as Partial<LocalizedMetadata>;

  if (!obj.locale || typeof obj.locale !== 'string') {
    errors.push('Missing or invalid locale identifier');
  }

  if (typeof obj.title !== 'string') {
    errors.push('Title must be a string');
  } else if (!obj.title.trim()) {
    errors.push('Title cannot be empty');
  } else if (obj.title.length > YOUTUBE_LIMITS.MAX_TITLE_LENGTH) {
    errors.push(
      `Title length (${obj.title.length}) exceeds YouTube maximum limit of ${YOUTUBE_LIMITS.MAX_TITLE_LENGTH} characters.`
    );
  }

  if (typeof obj.description !== 'string') {
    errors.push('Description must be a string');
  } else if (obj.description.length > YOUTUBE_LIMITS.MAX_DESCRIPTION_LENGTH) {
    errors.push(
      `Description length (${obj.description.length}) exceeds YouTube maximum limit of ${YOUTUBE_LIMITS.MAX_DESCRIPTION_LENGTH} characters.`
    );
  }

  if (obj.tagSuggestions !== undefined) {
    if (!Array.isArray(obj.tagSuggestions)) {
      warnings.push('tagSuggestions should be an array of strings');
    } else if (obj.tagSuggestions.length > YOUTUBE_LIMITS.MAX_TAG_COUNT) {
      warnings.push(`tagSuggestions count exceeds recommended limit (${YOUTUBE_LIMITS.MAX_TAG_COUNT})`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Constructs prompt instructions for localizing title, description, and keywords.
 */
export function buildMetadataPrompt(
  sourceTitle: string,
  sourceDescription: string,
  targetLocale: string,
  styleNotes?: string
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are an expert multilingual video metadata localizer.
Translate YouTube video titles and descriptions into target locale "${targetLocale}" naturally, keeping the tone engaging and culturally appropriate.
Strict rules:
1. Title must be under 100 characters.
2. Maintain all links, social handles, and promotional formatting in the description.
3. Return ONLY valid JSON matching this schema:
{
  "title": "Localized Title",
  "description": "Localized Description",
  "tagSuggestions": ["tag1", "tag2", "tag3"]
}`;

  const userPayload = {
    targetLocale,
    sourceTitle,
    sourceDescription,
    styleNotes: styleNotes || 'Preserve key creator tone and clarity.',
  };

  return {
    systemPrompt,
    userPrompt: JSON.stringify(userPayload, null, 2),
  };
}
