import { describe, it, expect } from 'vitest';
import {
  parseSrtTimestamp,
  formatSrtTimestamp,
  parseVttTimestamp,
  formatVttTimestamp,
} from '../../core/subtitles/time-utils';

describe('time-utils', () => {
  describe('SRT timestamps', () => {
    it('parses valid SRT timestamp into integer milliseconds', () => {
      expect(parseSrtTimestamp('00:00:00,000')).toBe(0);
      expect(parseSrtTimestamp('00:01:02,345')).toBe(62345);
      expect(parseSrtTimestamp('01:30:15,800')).toBe(5415800);
      expect(parseSrtTimestamp('10:00:00,000')).toBe(36000000);
    });

    it('returns null for malformed SRT timestamps', () => {
      expect(parseSrtTimestamp('00:00:00.000')).toBeNull(); // period instead of comma
      expect(parseSrtTimestamp('00:60:00,000')).toBeNull(); // invalid minutes >= 60
      expect(parseSrtTimestamp('00:00:60,000')).toBeNull(); // invalid seconds >= 60
      expect(parseSrtTimestamp('invalid')).toBeNull();
      expect(parseSrtTimestamp('00:00,000')).toBeNull();
    });

    it('formats milliseconds to standard SRT timestamp', () => {
      expect(formatSrtTimestamp(0)).toBe('00:00:00,000');
      expect(formatSrtTimestamp(62345)).toBe('00:01:02,345');
      expect(formatSrtTimestamp(5415800)).toBe('01:30:15,800');
    });

    it('handles negative or decimal ms gracefully', () => {
      expect(formatSrtTimestamp(-500)).toBe('00:00:00,000');
      expect(formatSrtTimestamp(1000.8)).toBe('00:00:01,000');
    });
  });

  describe('WebVTT timestamps', () => {
    it('parses standard long WebVTT timestamp (HH:MM:SS.mmm)', () => {
      expect(parseVttTimestamp('00:00:00.000')).toBe(0);
      expect(parseVttTimestamp('01:02:03.456')).toBe(3723456);
    });

    it('parses short WebVTT timestamp (MM:SS.mmm)', () => {
      expect(parseVttTimestamp('00:01.500')).toBe(1500);
      expect(parseVttTimestamp('05:30.250')).toBe(330250);
    });

    it('returns null for malformed WebVTT timestamps', () => {
      expect(parseVttTimestamp('00:00:00,000')).toBeNull(); // comma instead of period
      expect(parseVttTimestamp('00:60:00.000')).toBeNull();
      expect(parseVttTimestamp('00:60.000')).toBeNull();
      expect(parseVttTimestamp('abc')).toBeNull();
    });

    it('formats milliseconds to standard WebVTT timestamp', () => {
      expect(formatVttTimestamp(0)).toBe('00:00:00.000');
      expect(formatVttTimestamp(3723456)).toBe('01:02:03.456');
    });
  });
});
