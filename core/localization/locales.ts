/**
 * Locale registry supporting YouTube Data API localizations
 * and standard BCP-47 language/regional codes.
 */

export interface LocaleInfo {
  code: string;        // BCP-47 code (e.g. "en", "es-419", "pt-BR")
  name: string;        // English name
  nativeName: string;  // Native language name
  direction?: 'ltr' | 'rtl';
}

export const SUPPORTED_LOCALES: LocaleInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', direction: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'ltr' },
  { code: 'es-419', name: 'Spanish (Latin America)', nativeName: 'Español (Latinoamérica)', direction: 'ltr' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', direction: 'ltr' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)', direction: 'ltr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', direction: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', direction: 'ltr' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', direction: 'ltr' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', direction: 'ltr' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', direction: 'ltr' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', direction: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', direction: 'ltr' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', direction: 'ltr' },
  { code: 'zh-Hans', name: 'Chinese (Simplified)', nativeName: '简体中文', direction: 'ltr' },
  { code: 'zh-Hant', name: 'Chinese (Traditional)', nativeName: '繁體中文', direction: 'ltr' },
];

export function getLocaleInfo(code: string): LocaleInfo | undefined {
  const normalized = code.trim().toLowerCase();
  return SUPPORTED_LOCALES.find((l) => l.code.toLowerCase() === normalized);
}

export function isValidLocaleCode(code: string): boolean {
  return getLocaleInfo(code) !== undefined;
}
