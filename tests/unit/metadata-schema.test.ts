import { describe, it, expect } from 'vitest';
import {
  validateLocalizedMetadata,
  buildMetadataPrompt,
  YOUTUBE_LIMITS,
} from '../../core/localization/metadata-schema';

describe('metadata-schema', () => {
  it('validates compliant localized metadata successfully', () => {
    const valid = {
      locale: 'es',
      title: 'Título del video en español',
      description: 'Descripción completa del video con enlaces https://example.com',
      tagSuggestions: ['video', 'español', 'tutorial'],
    };

    const res = validateLocalizedMetadata(valid);
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it('rejects title exceeding YouTube limit (100 chars)', () => {
    const tooLongTitle = 'a'.repeat(YOUTUBE_LIMITS.MAX_TITLE_LENGTH + 1);
    const res = validateLocalizedMetadata({
      locale: 'es',
      title: tooLongTitle,
      description: 'Desc',
    });

    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('exceeds YouTube maximum limit'))).toBe(true);
  });

  it('rejects description exceeding YouTube limit (5000 chars)', () => {
    const tooLongDesc = 'd'.repeat(YOUTUBE_LIMITS.MAX_DESCRIPTION_LENGTH + 1);
    const res = validateLocalizedMetadata({
      locale: 'es',
      title: 'Title',
      description: tooLongDesc,
    });

    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('Description length'))).toBe(true);
  });

  it('rejects empty title or missing locale', () => {
    const resEmptyTitle = validateLocalizedMetadata({
      locale: 'es',
      title: '   ',
      description: 'Desc',
    });
    expect(resEmptyTitle.valid).toBe(false);

    const resMissingLocale = validateLocalizedMetadata({
      title: 'Valid title',
      description: 'Desc',
    });
    expect(resMissingLocale.valid).toBe(false);
  });

  it('builds system and user prompts adhering to instructions', () => {
    const { systemPrompt, userPrompt } = buildMetadataPrompt(
      'Source Title',
      'Source Description',
      'pt-BR'
    );

    expect(systemPrompt).toContain('pt-BR');
    expect(systemPrompt).toContain('tagSuggestions');
    expect(userPrompt).toContain('Source Title');
  });
});
