'use client';

import { useI18n } from '@/lib/context/I18nContext';
import type { Locale } from '@/lib/i18n';

const FLAGS: Record<Locale, { emoji: string; label: string }> = {
  en: { emoji: '🇬🇧', label: 'English' },
  uk: { emoji: '🇺🇦', label: 'Українська' },
  pt: { emoji: '🇵🇹', label: 'Português' },
};

const LOCALES: Locale[] = ['en', 'uk', 'pt'];

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="flex items-center gap-1">
      {LOCALES.map((loc) => (
        <button
          key={loc}
          onClick={() => setLocale(loc)}
          className={`w-8 h-8 flex items-center justify-center rounded-lg text-lg transition-all ${
            locale === loc
              ? 'bg-amber-100 scale-110'
              : 'hover:bg-stone-100 opacity-60 hover:opacity-100'
          }`}
          title={FLAGS[loc].label}
          aria-label={`Switch to ${FLAGS[loc].label}`}
        >
          {FLAGS[loc].emoji}
        </button>
      ))}
    </div>
  );
}
