'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  type Locale,
  detectLocale,
  translate,
} from '@/lib/i18n';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const LOCALE_STORAGE_KEY = 'banha-locale';

interface I18nProviderProps {
  children: ReactNode;
}

// Compute initial locale from localStorage or detection (runs once)
function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const storedLocale = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
  if (storedLocale && ['en', 'uk', 'pt'].includes(storedLocale)) {
    return storedLocale;
  }
  return detectLocale();
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return translate(locale, key, params);
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

/**
 * Convenience hook to get just the translation function
 */
export function useTranslation() {
  const { t, locale } = useI18n();
  return { t, locale };
}
