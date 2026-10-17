import { describe, it, expect } from 'vitest';
import {
  tokenizeInlineTags,
  restoreInlineTags,
} from '../../core/subtitles/formatting-tokens';

describe('formatting-tokens', () => {
  it('tokenizes standard HTML markup (<b>, <i>, <u>)', () => {
    const text = 'Hello <b>world</b> and <i>italic</i>!';
    const { sanitizedText, tokens } = tokenizeInlineTags(text);

    expect(sanitizedText).toBe('Hello [[TAG_0]]world[[TAG_1]] and [[TAG_2]]italic[[TAG_3]]!');
    expect(tokens.get('[[TAG_0]]')).toBe('<b>');
    expect(tokens.get('[[TAG_1]]')).toBe('</b>');
    expect(tokens.get('[[TAG_2]]')).toBe('<i>');
    expect(tokens.get('[[TAG_3]]')).toBe('</i>');
  });

  it('tokenizes WebVTT voice tags (<v Speaker>) and classes (<c.highlight>)', () => {
    const text = '<v Host>Hello</v> <c.yellow>Yellow text</c>';
    const { sanitizedText, tokens } = tokenizeInlineTags(text);

    expect(sanitizedText).toBe('[[TAG_0]]Hello[[TAG_1]] [[TAG_2]]Yellow text[[TAG_3]]');
    expect(tokens.get('[[TAG_0]]')).toBe('<v Host>');
    expect(tokens.get('[[TAG_1]]')).toBe('</v>');
  });

  it('restores placeholders accurately into translated text', () => {
    const text = 'Click <b>here</b> for details.';
    const { sanitizedText, tokens } = tokenizeInlineTags(text);

    // Simulate LLM translation that keeps placeholders in right position
    const translated = 'Klik [[TAG_0]]di sini[[TAG_1]] untuk detail.';
    const { restoredText, valid, errors } = restoreInlineTags(translated, tokens);

    expect(valid).toBe(true);
    expect(errors).toHaveLength(0);
    expect(restoredText).toBe('Klik <b>di sini</b> untuk detail.');
  });

  it('flags missing tag placeholders when LLM drops a token', () => {
    const text = '<b>Important</b> note';
    const { tokens } = tokenizeInlineTags(text);

    const corruptedTranslation = 'Catatan penting[[TAG_1]]'; // missing [[TAG_0]]
    const { valid, errors } = restoreInlineTags(corruptedTranslation, tokens);

    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('Missing tag placeholder'))).toBe(true);
  });

  it('flags duplicate tag placeholders when LLM repeats a token', () => {
    const text = '<i>Alert</i>';
    const { tokens } = tokenizeInlineTags(text);

    const duplicateTranslation = '[[TAG_0]][[TAG_0]]Peringatan[[TAG_1]]';
    const { valid, errors } = restoreInlineTags(duplicateTranslation, tokens);

    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('Duplicate tag placeholder'))).toBe(true);
  });

  it('flags unknown tag placeholders invented by LLM', () => {
    const text = 'Simple text without tags';
    const { tokens } = tokenizeInlineTags(text);

    const hallucinated = 'Teks [[TAG_99]] dengan tag';
    const { valid, errors } = restoreInlineTags(hallucinated, tokens);

    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('Unknown tag placeholder'))).toBe(true);
  });
});
