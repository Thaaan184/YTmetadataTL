import { describe, it, expect } from 'vitest';
import {
  getLocaleInfo,
  isValidLocaleCode,
  SUPPORTED_LOCALES,
} from '../../core/localization/locales';

describe('locales', () => {
  it('identifies standard language and regional locales', () => {
    expect(isValidLocaleCode('en')).toBe(true);
    expect(isValidLocaleCode('es-419')).toBe(true);
    expect(isValidLocaleCode('pt-BR')).toBe(true);
    expect(isValidLocaleCode('id')).toBe(true);
    expect(isValidLocaleCode('ja')).toBe(true);
  });

  it('rejects invalid or unknown locale codes', () => {
    expect(isValidLocaleCode('unknown-locale')).toBe(false);
    expect(isValidLocaleCode('12345')).toBe(false);
  });

  it('provides native and English names', () => {
    const idInfo = getLocaleInfo('id');
    expect(idInfo?.name).toBe('Indonesian');
    expect(idInfo?.nativeName).toBe('Bahasa Indonesia');

    const arInfo = getLocaleInfo('ar');
    expect(arInfo?.direction).toBe('rtl');
  });

  it('verifies all supported locales have non-empty codes and names', () => {
    for (const loc of SUPPORTED_LOCALES) {
      expect(loc.code.length).toBeGreaterThan(0);
      expect(loc.name.length).toBeGreaterThan(0);
      expect(loc.nativeName.length).toBeGreaterThan(0);
    }
  });
});
