/**
 * Internationalization utilities
 */

import en from './locales/en.json';
import uk from './locales/uk.json';
import pt from './locales/pt.json';

export type Locale = 'en' | 'uk' | 'pt';

export const locales: Record<Locale, typeof en> = {
  en,
  uk,
  pt,
};

export const defaultLocale: Locale = 'en';

/**
 * Detect browser locale and map to supported locale
 */
export function detectLocale(): Locale {
  if (typeof navigator === 'undefined') {
    return defaultLocale;
  }

  const browserLang = navigator.language.toLowerCase();

  // Check for exact match first
  if (browserLang.startsWith('uk')) return 'uk';
  if (browserLang.startsWith('pt')) return 'pt';
  if (browserLang.startsWith('en')) return 'en';

  // Check language part only
  const langCode = browserLang.split('-')[0];
  if (langCode === 'uk') return 'uk';
  if (langCode === 'pt') return 'pt';

  return defaultLocale;
}

type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${NestedKeyOf<T[K]>}`
          : K
        : never;
    }[keyof T]
  : never;

export type TranslationKey = NestedKeyOf<typeof en>;

/**
 * Get a nested value from an object by dot-separated path
 */
function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path; // Return the key if not found
    }
  }

  return typeof current === 'string' ? current : path;
}

/**
 * Translate a key with optional interpolation
 */
export function translate(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>
): string {
  const translations = locales[locale] || locales[defaultLocale];
  let text = getNestedValue(translations as Record<string, unknown>, key);

  if (params) {
    Object.entries(params).forEach(([paramKey, value]) => {
      text = text.replace(new RegExp(`\\{\\{${paramKey}\\}\\}`, 'g'), String(value));
    });
  }

  return text;
}

/**
 * Create a translation function for a specific locale
 */
export function createTranslator(locale: Locale) {
  return (key: string, params?: Record<string, string | number>) =>
    translate(locale, key, params);
}
