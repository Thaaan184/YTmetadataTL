import { describe, it, expect } from 'vitest';
import { parseSrt } from '../../core/subtitles/parse-srt';
import { serializeSrt } from '../../core/subtitles/serialize-srt';
import * as fs from 'fs';
import * as path from 'path';

describe('parseSrt', () => {
  it('parses valid SRT file correctly', () => {
    const raw = fs.readFileSync(path.join(__dirname, '../fixtures/sample-en.srt'), 'utf8');
    const result = parseSrt(raw);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.document.cues).toHaveLength(2);
    expect(result.document.cues[0]).toEqual({
      id: '1',
      startMs: 1000,
      endMs: 4500,
      text: 'Welcome to TubeGlot.\nThe open-source localization helper.',
    });
    expect(result.document.cues[1]).toEqual({
      id: '2',
      startMs: 5000,
      endMs: 8200,
      text: 'It translates your video subtitles\nwithout monthly credit caps.',
    });
  });

  it('handles non-Latin scripts (Arabic, Japanese, Russian, Indonesian)', () => {
    const raw = fs.readFileSync(path.join(__dirname, '../fixtures/sample-multilingual.srt'), 'utf8');
    const result = parseSrt(raw);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.document.cues).toHaveLength(4);
    expect(result.document.cues[1].text).toContain('こんにちは世界');
    expect(result.document.cues[2].text).toContain('مرحبا بالعالم');
    expect(result.document.cues[3].text).toContain('Привет, мир');
  });

  it('strips UTF-8 BOM smoothly without breaking first cue id', () => {
    const rawWithBom = '\uFEFF1\n00:00:01,000 --> 00:00:02,000\nBOM test\n';
    const result = parseSrt(rawWithBom);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.document.cues[0].id).toBe('1');
    expect(result.document.cues[0].text).toBe('BOM test');
  });

  it('normalizes CRLF windows line breaks', () => {
    const rawCrlf = '1\r\n00:00:01,000 --> 00:00:02,000\r\nWindows Line 1\r\nLine 2\r\n\r\n';
    const result = parseSrt(rawCrlf);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.document.cues[0].text).toBe('Windows Line 1\nLine 2');
  });

  it('handles empty input gracefully', () => {
    const result = parseSrt('   \n\n  ');
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.document.cues).toEqual([]);
  });

  it('fails with line number when timing is invalid (start >= end)', () => {
    const malformed = '1\n00:00:05,000 --> 00:00:02,000\nInverted time\n';
    const result = parseSrt(malformed);

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].line).toBe(2);
    expect(result.errors[0].message).toContain('must be before end time');
  });

  it('fails with line number when separator "-->" is missing', () => {
    const malformed = '1\n00:00:01,000 00:00:03,000\nMissing arrow\n';
    const result = parseSrt(malformed);

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.errors[0].message).toContain('separator "-->"');
  });

  it('fails with line number when unexpected EOF occurs after cue id', () => {
    const malformed = '1';
    const result = parseSrt(malformed);

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.errors[0].message).toContain('Unexpected end of file');
  });

  it('fails when timestamp syntax is completely invalid', () => {
    const malformed = '1\ninvalid_start --> invalid_end\nText\n';
    const result = parseSrt(malformed);

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.errors.some((e) => e.message.includes('Invalid start timestamp syntax'))).toBe(true);
    expect(result.errors.some((e) => e.message.includes('Invalid end timestamp syntax'))).toBe(true);
  });

  it('records warning when cue text is empty', () => {
    const emptyCueText = '1\n00:00:01,000 --> 00:00:02,000\n\n2\n00:00:03,000 --> 00:00:04,000\nNext text\n';
    const result = parseSrt(emptyCueText);

    expect(result.success).toBe(true);
    expect(result.warnings.some((w) => w.includes('empty text'))).toBe(true);
  });

  it('executes perfect parser -> serializer roundtrip', () => {
    const raw = fs.readFileSync(path.join(__dirname, '../fixtures/sample-en.srt'), 'utf8');
    const parsed = parseSrt(raw);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const serialized = serializeSrt(parsed.document);
    const reparsed = parseSrt(serialized);
    expect(reparsed.success).toBe(true);
    if (!reparsed.success) return;

    expect(reparsed.document.cues).toEqual(parsed.document.cues);
  });

  it('serializes empty cues to empty string', () => {
    expect(serializeSrt({ format: 'srt', cues: [] })).toBe('');
    expect(serializeSrt([])).toBe('');
  });
});
