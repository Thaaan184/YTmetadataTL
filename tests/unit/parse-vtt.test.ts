import { describe, it, expect } from 'vitest';
import { parseVtt } from '../../core/subtitles/parse-vtt';
import { serializeVtt } from '../../core/subtitles/serialize-vtt';
import * as fs from 'fs';
import * as path from 'path';

describe('parseVtt', () => {
  it('parses valid WebVTT file with header, settings, and cues', () => {
    const raw = fs.readFileSync(path.join(__dirname, '../fixtures/sample.vtt'), 'utf8');
    const result = parseVtt(raw);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.document.format).toBe('vtt');
    expect(result.document.vttHeader).toContain('Kind: captions');
    expect(result.document.cues).toHaveLength(2);

    expect(result.document.cues[0].id).toBe('intro-cue');
    expect(result.document.cues[0].startMs).toBe(1000);
    expect(result.document.cues[0].endMs).toBe(4500);
    expect(result.document.cues[0].settings).toBe('position:10% align:start');
    expect(result.document.cues[0].text).toBe('Welcome to <v Host>TubeGlot</v> in <b>bold</b>!');

    expect(result.document.cues[1].settings).toBe('line:0%');
  });

  it('rejects input missing the WEBVTT header', () => {
    const invalid = '1\n00:01.000 --> 00:03.000\nNo header';
    const result = parseVtt(invalid);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors[0].message).toContain('WEBVTT');
  });

  it('rejects completely empty string with error', () => {
    const result = parseVtt('   ');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors[0].message).toContain('File is empty');
  });

  it('skips NOTE comment blocks without corrupting cues', () => {
    const vttWithNote = `WEBVTT

NOTE This is a commentary note
spanning multiple lines

1
00:01.000 --> 00:04.000
Real subtitle text
`;
    const result = parseVtt(vttWithNote);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.document.cues).toHaveLength(1);
    expect(result.document.cues[0].text).toBe('Real subtitle text');
  });

  it('skips STYLE and REGION blocks with a warning', () => {
    const vttWithStyle = `WEBVTT

STYLE
::cue { color: red; }

REGION id=bottom
width=100%

1
00:01.000 --> 00:04.000
Styled subtitle
`;
    const result = parseVtt(vttWithStyle);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.warnings.some((w) => w.includes('STYLE'))).toBe(true);
    expect(result.warnings.some((w) => w.includes('REGION'))).toBe(true);
    expect(result.document.cues).toHaveLength(1);
    expect(result.document.cues[0].text).toBe('Styled subtitle');
  });

  it('rejects cues with inverted timestamps (start >= end)', () => {
    const inverted = `WEBVTT

00:05.000 --> 00:02.000
Backward in time
`;
    const result = parseVtt(inverted);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors[0].message).toContain('strictly before end time');
  });

  it('fails when unexpected EOF occurs after cue identifier', () => {
    const incomplete = 'WEBVTT\n\ncue-id-only';
    const result = parseVtt(incomplete);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors[0].message).toContain('Unexpected end of file');
  });

  it('fails when separator "-->" is missing in WebVTT', () => {
    const missingArrow = 'WEBVTT\n\n00:01.000 00:04.000\nNo arrow\n';
    const result = parseVtt(missingArrow);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors[0].message).toContain('separator "-->"');
  });

  it('fails when start or end timestamp syntax is invalid in WebVTT', () => {
    const invalidTimes = 'WEBVTT\n\nwrong_start --> wrong_end\nBad timing\n';
    const result = parseVtt(invalidTimes);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.some((e) => e.message.includes('Invalid WebVTT start timestamp'))).toBe(true);
    expect(result.errors.some((e) => e.message.includes('Invalid WebVTT end timestamp'))).toBe(true);
  });

  it('strips UTF-8 BOM from WebVTT correctly', () => {
    const bomVtt = '\uFEFFWEBVTT\n\n00:01.000 --> 00:02.000\nBOM WebVTT\n';
    const result = parseVtt(bomVtt);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.document.cues[0].text).toBe('BOM WebVTT');
  });

  it('executes perfect parser -> serializer roundtrip', () => {
    const raw = fs.readFileSync(path.join(__dirname, '../fixtures/sample.vtt'), 'utf8');
    const parsed = parseVtt(raw);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const serialized = serializeVtt(parsed.document);
    const reparsed = parseVtt(serialized);
    expect(reparsed.success).toBe(true);
    if (!reparsed.success) return;

    expect(reparsed.document.cues).toEqual(parsed.document.cues);
  });

  it('serializes empty cues WebVTT correctly', () => {
    expect(serializeVtt({ format: 'vtt', cues: [] })).toBe('WEBVTT\n\n');
    expect(serializeVtt([])).toBe('WEBVTT\n\n');
  });
});
